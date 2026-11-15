import { test, expect } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createBridge } from '../../packages/bridge/src/index';
import { safeSignInUrl } from '../../packages/shared/src/runs';
import { extractSignInUrl } from '../../packages/runner/src/setup';

const origin = 'http://localhost:5173';
function setup() {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-agent-setup-'));
  const stateDir = resolve(root, '.nudge');
  mkdirSync(stateDir);
  const config = {
    stateDir,
    projectId: randomUUID(),
    port: 4747,
    origins: [origin],
    browserToken: 'b'.repeat(64),
    mcpToken: 'a'.repeat(64),
    runnerToken: 'c'.repeat(64),
    managed: false,
  } as Parameters<typeof createBridge>[0];
  const app = createBridge(config);
  const browser = (url: string, payload?: unknown) =>
    app.inject({
      method: payload === undefined ? 'GET' : 'POST',
      url,
      headers: {
        host: '127.0.0.1',
        authorization: `Bearer ${config.browserToken}`,
        origin,
      },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
  const runner = (url: string, payload: unknown) =>
    app.inject({
      method: 'POST',
      url,
      headers: {
        host: '127.0.0.1',
        authorization: `Bearer ${config.runnerToken}`,
      },
      payload: payload as object,
    });
  return {
    app,
    config,
    browser,
    runner,
    stateDir,
    done: async () => {
      await app.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('browser selects an agent: persisted, managed enabled, install task handed to the runner', async () => {
  const t = setup();
  try {
    expect(
      (await t.browser('/api/v1/agents/select', { provider: 'x' })).statusCode,
    ).toBe(400);
    expect(
      (await t.browser('/api/v1/agents/select', { provider: 'claude' }))
        .statusCode,
    ).toBe(200);
    expect(
      JSON.parse(readFileSync(resolve(t.stateDir, 'agent.json'), 'utf8')),
    ).toEqual({
      provider: 'claude',
      mode: 'managed',
      transport: 'acp',
    });
    const state = (await t.browser('/api/v1/managed')).json();
    expect(state).toMatchObject({
      enabled: true,
      provider: 'claude',
      setup: { kind: 'install', state: 'pending' },
    });
    // A second step cannot start while one is pending.
    expect(
      (await t.browser('/api/v1/agents/login', { provider: 'claude' }))
        .statusCode,
    ).toBe(409);
    const task = (await t.runner('/api/v1/runner/setup/claim', {})).json();
    expect(task).toMatchObject({
      provider: 'claude',
      kind: 'install',
      state: 'running',
    });
    expect(
      (await t.runner('/api/v1/runner/setup/claim', {})).json(),
    ).toBeNull();
    const done = await t.runner('/api/v1/runner/setup/update', {
      id: task.id,
      state: 'done',
      message: 'Adapter ready.',
    });
    expect(done.statusCode).toBe(200);
    expect((await t.browser('/api/v1/managed')).json().setup.state).toBe(
      'done',
    );
  } finally {
    await t.done();
  }
});

test('sign-in is browser-initiated, limited to Codex/Claude, and only https URLs surface', async () => {
  const t = setup();
  try {
    expect(
      (await t.browser('/api/v1/agents/login', { provider: 'opencode' }))
        .statusCode,
    ).toBe(400);
    expect(
      (await t.browser('/api/v1/agents/login', { provider: 'codex' }))
        .statusCode,
    ).toBe(200);
    const task = (await t.runner('/api/v1/runner/setup/claim', {})).json();
    await t.runner('/api/v1/runner/setup/update', {
      id: task.id,
      state: 'running',
      url: 'javascript:alert(1)',
    });
    expect(
      (await t.browser('/api/v1/managed')).json().setup.url,
    ).toBeUndefined();
    await t.runner('/api/v1/runner/setup/update', {
      id: task.id,
      state: 'running',
      url: 'https://auth.example.com/login?x=1',
    });
    expect((await t.browser('/api/v1/managed')).json().setup.url).toBe(
      'https://auth.example.com/login?x=1',
    );
    expect(
      (
        await t.runner('/api/v1/runner/setup/update', {
          id: randomUUID(),
          state: 'done',
        })
      ).statusCode,
    ).toBe(400);
    // Runner scope: not a browser credential, and MCP/browser cannot use runner routes.
    expect((await t.browser('/api/v1/runner/setup/claim', {})).statusCode).toBe(
      403,
    );
  } finally {
    await t.done();
  }
});

test('agent switching is refused while a run is active; runner agent report is exposed', async () => {
  const t = setup();
  try {
    const report = {
      agents: [
        {
          provider: 'codex',
          installed: true,
          adapter: 'available',
          auth: 'signed-in',
          billing: 'subscription',
        },
      ],
    };
    expect((await t.runner('/api/v1/runner/agents', report)).statusCode).toBe(
      200,
    );
    expect(
      (
        await t.runner('/api/v1/runner/agents', {
          agents: [{ provider: 'codex' }],
        })
      ).statusCode,
    ).toBe(400);
    expect((await t.browser('/api/v1/managed')).json().agents).toEqual(
      report.agents,
    );
  } finally {
    await t.done();
  }
});

test('sign-in URL extraction ignores non-https and trims terminal noise', () => {
  expect(safeSignInUrl('http://x.test')).toBeUndefined();
  expect(safeSignInUrl('https://user:pw@x.test')).toBeUndefined();
  expect(
    extractSignInUrl('Open \u001b[36mhttps://auth.test/a?b=1\u001b[0m).'),
  ).toBe('https://auth.test/a?b=1');
  expect(extractSignInUrl('visit http://insecure.test only')).toBeUndefined();
});
