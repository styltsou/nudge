import { expect, it } from 'bun:test';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createBridge } from '../../bridge/src/index';
import type { Annotation } from '@usenudge/shared';

it('invokes all five real MCP tools over stdio against the HTTP bridge', async () => {
  mkdirSync('.nudge', { recursive: true });
  const stateDir = mkdtempSync(resolve('.nudge/mcp-test-'));
  const config = {
    stateDir,
    projectId: randomUUID(),
    browserToken: 'b'.repeat(64),
    mcpToken: 'a'.repeat(64),
    origins: ['http://localhost:5173'],
    port: 4747,
  };
  const bridge = createBridge(config);
  const url = await bridge.listen({ host: '127.0.0.1', port: 0 });
  const created = await bridge.inject({
    method: 'POST',
    url: '/api/v1/annotations',
    headers: {
      origin: config.origins[0]!,
      authorization: `Bearer ${config.browserToken}`,
    },
    payload: {
      comment: 'Make the chart taller',
      anchor: {
        pageUrl: 'http://localhost:5173/',
        pathname: '/',
        selector: '[data-testid="chart"]',
        tagName: 'DIV',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        viewport: { width: 1000, height: 800 },
      },
    },
  });
  const a = created.json<Annotation>();
  const child = spawn(
    process.execPath,
    [resolve('packages/mcp/src/index.ts')],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NUDGE_BRIDGE_URL: url,
        NUDGE_MCP_TOKEN: config.mcpToken,
      },
    },
  );
  const lines = createInterface({ input: child.stdout });
  let id = 0;
  const pending = new Map<
    number,
    {
      resolve(value: Record<string, unknown>): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  lines.on('line', (line) => {
    const response = JSON.parse(line) as {
      id?: number;
      result?: Record<string, unknown>;
      error?: unknown;
    };
    if (response.id === undefined) return;
    const task = pending.get(response.id);
    if (!task) return;
    clearTimeout(task.timer);
    pending.delete(response.id);
    if (response.error) task.reject(new Error('MCP protocol error'));
    else task.resolve(response.result ?? {});
  });
  function rpc(method: string, params: unknown) {
    return new Promise<Record<string, unknown>>((resolveResult, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('MCP response timeout'));
      }, 5000);
      pending.set(requestId, { resolve: resolveResult, reject, timer });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })}\n`,
      );
    });
  }
  async function tool(name: string, args: Record<string, unknown>) {
    const response = await rpc('tools/call', { name, arguments: args });
    expect(response.isError).not.toBe(true);
    const content = response.content as { text: string }[];
    return (JSON.parse(content[0]!.text) as { untrustedData: unknown })
      .untrustedData;
  }
  try {
    await rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'nudge-test', version: '0' },
    });
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    );
    const tools = await rpc('tools/list', {});
    expect(
      (tools.tools as { name: string }[]).map((t) => t.name).sort(),
    ).toEqual([
      'claim_annotation',
      'get_annotation',
      'list_annotations',
      'release_annotation',
      'submit_implementation',
    ]);
    expect(await tool('list_annotations', {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: a.id, comment: 'Make the chart taller' }),
      ]),
    );
    expect(await tool('get_annotation', { annotationId: a.id })).toEqual(
      expect.objectContaining({ id: a.id, status: 'queued' }),
    );
    await tool('claim_annotation', { annotationId: a.id, expectedVersion: 1 });
    await tool('release_annotation', {
      annotationId: a.id,
      expectedVersion: 2,
    });
    expect(
      await tool('submit_implementation', {
        annotationId: a.id,
        expectedVersion: 3,
        summary: 'Adjusted height',
        changedFiles: ['apps/demo/src/style.css'],
      }),
    ).toEqual(
      expect.objectContaining({ status: 'ready_for_review', version: 4 }),
    );
  } finally {
    for (const task of pending.values()) {
      clearTimeout(task.timer);
      task.reject(new Error('MCP test ending'));
    }
    child.stdin.end();
    child.kill();
    lines.close();
    await bridge.close();
    rmSync(stateDir, { recursive: true, force: true });
  }
});
