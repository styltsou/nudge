import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createBridge } from '../../packages/bridge/src/index';

const origin = 'http://localhost:5173';
const anchor = {
  pageUrl: 'http://localhost:5173/',
  pathname: '/',
  selector: '#b',
  tagName: 'BUTTON',
  rect: { x: 0, y: 0, width: 10, height: 10 },
  viewport: { width: 800, height: 600 },
};

test('archive hides a request from agents; delete removes it with its agent history', async () => {
  const stateDir = mkdtempSync(resolve(tmpdir(), 'nudge-archive-'));
  const config = {
    stateDir,
    projectId: randomUUID(),
    port: 4747,
    origins: [origin],
    browserToken: 'b'.repeat(64),
    mcpToken: 'a'.repeat(64),
    runnerToken: 'c'.repeat(64),
    managed: true,
  };
  const app = createBridge(config);
  const call = (
    who: 'browser' | 'mcp' | 'runner',
    url: string,
    body?: object,
  ) =>
    app.inject({
      method: body ? 'POST' : 'GET',
      url,
      headers: {
        host: '127.0.0.1',
        authorization: `Bearer ${who === 'browser' ? config.browserToken : who === 'mcp' ? config.mcpToken : config.runnerToken}`,
        ...(who === 'browser' ? { origin } : {}),
      },
      ...(body ? { payload: body } : {}),
    });
  try {
    const created = (
      await call('browser', '/api/v1/annotations', {
        comment: 'Pad it',
        anchor,
      })
    ).json();
    // Archive: gone for agents, still listed (flagged) for the browser.
    expect(
      (
        await call('mcp', `/api/v1/annotations/${created.id}/archive`, {
          expectedVersion: created.version,
          archived: true,
        })
      ).statusCode,
    ).toBe(400);
    const archived = (
      await call('browser', `/api/v1/annotations/${created.id}/archive`, {
        expectedVersion: created.version,
        archived: true,
      })
    ).json();
    expect(archived.archivedAt).toBeString();
    expect(
      (await call('mcp', '/api/v1/annotations?status=queued')).json(),
    ).toEqual([]);
    expect((await call('browser', '/api/v1/annotations')).json()).toHaveLength(
      1,
    );
    expect(
      (
        await call('mcp', `/api/v1/annotations/${created.id}/claim`, {
          expectedVersion: archived.version,
        })
      ).statusCode,
    ).toBe(409);
    await call('runner', '/api/v1/runner/claim', {});
    expect(
      (
        await call('browser', '/api/v1/runs', {
          annotationId: created.id,
          revisionId: created.revisions[0].id,
          requestId: randomUUID(),
        })
      ).statusCode,
    ).toBe(409);
    // Stale versions are refused.
    expect(
      (
        await call('browser', `/api/v1/annotations/${created.id}/archive`, {
          expectedVersion: created.version,
          archived: false,
        })
      ).statusCode,
    ).toBe(409);
    const restored = (
      await call('browser', `/api/v1/annotations/${created.id}/archive`, {
        expectedVersion: archived.version,
        archived: false,
      })
    ).json();
    expect(restored.archivedAt).toBeUndefined();
    expect(
      (await call('mcp', '/api/v1/annotations?status=queued')).json(),
    ).toHaveLength(1);
    // A finished run leaves a session; deleting the request drops both.
    await call('browser', '/api/v1/runs', {
      annotationId: created.id,
      revisionId: created.revisions[0].id,
      requestId: randomUUID(),
    });
    const job = (await call('runner', '/api/v1/runner/claim', {})).json();
    await call('runner', `/api/v1/runner/${job.run.id}/update`, {
      lease: job.run.lease,
      type: 'cancelled',
    });
    const before = (await call('browser', '/api/v1/managed')).json();
    expect(before.sessions).toHaveLength(1);
    const current = (
      await call('browser', `/api/v1/annotations/${created.id}`)
    ).json();
    expect(
      (
        await call('browser', `/api/v1/annotations/${created.id}/delete`, {
          expectedVersion: current.version,
        })
      ).statusCode,
    ).toBe(200);
    expect((await call('browser', '/api/v1/annotations')).json()).toEqual([]);
    const after = (await call('browser', '/api/v1/managed')).json();
    expect(after.runs).toEqual([]);
    expect(after.sessions).toEqual([]);
  } finally {
    await app.close();
    rmSync(stateDir, { recursive: true, force: true });
  }
});
