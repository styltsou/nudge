import { test, expect } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Repository } from '../../packages/bridge/src/repository';
import { RunStore } from '../../packages/bridge/src/runs';
import { createBridge } from '../../packages/bridge/src/index';
import { launchRunner } from '../../packages/runner/src/launch';

const anchor = {
  pageUrl: 'http://localhost:5173/',
  pathname: '/',
  selector: '#button',
  tagName: 'BUTTON',
  rect: { x: 0, y: 0, width: 100, height: 40 },
  viewport: { width: 800, height: 600 },
};
test('startup launches a separate runner and shuts it down through the parent pipe', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-runner-start-'));
  const stateDir = resolve(root, '.nudge');
  mkdirSync(stateDir);
  const config = {
    stateDir,
    projectId: randomUUID(),
    port: 4747,
    origins: ['http://localhost:5173'],
    browserToken: 'b'.repeat(64),
    mcpToken: 'a'.repeat(64),
    runnerToken: 'c'.repeat(64),
    managed: true,
  };
  writeFileSync(resolve(stateDir, 'credentials.json'), JSON.stringify(config));
  writeFileSync(
    resolve(stateDir, 'agent.json'),
    JSON.stringify({ provider: 'codex', mode: 'managed' }),
  );
  const app = createBridge(config);
  const bridgeUrl = await app.listen({ host: '127.0.0.1', port: 0 });
  writeFileSync(
    resolve(stateDir, 'connection.json'),
    JSON.stringify({ bridgeUrl }),
  );
  const stop = launchRunner(root);
  try {
    let online = false;
    for (let i = 0; i < 40 && !online; i++) {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/managed',
        headers: {
          host: '127.0.0.1',
          authorization: `Bearer ${config.browserToken}`,
          origin: config.origins[0]!,
        },
      });
      online = response.json().online;
      if (!online) await new Promise((r) => setTimeout(r, 100));
    }
    expect(online).toBe(true);
  } finally {
    await stop();
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});
test('runs isolate fresh sessions, explicitly resume across items, deduplicate and preserve human review', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-runs-'));
  const project = randomUUID();
  const repo = new Repository(resolve(root, 'db.sqlite'), project);
  const runs = new RunStore(repo, project);
  try {
    runs.claim();
    const a = repo.create({ comment: 'Change button', anchor });
    const input = {
      annotationId: a.id,
      revisionId: a.revisions[0]!.id,
      requestId: randomUUID(),
    };
    const first = runs.dispatch(input);
    expect(runs.dispatch(input).id).toBe(first.id);
    expect(runs.sessions()).toHaveLength(1);
    expect(() =>
      runs.dispatch({ ...input, requestId: randomUUID() }),
    ).toThrow();
    const job = runs.claim()!;
    expect(runs.claim()).toBeNull();
    expect(() =>
      runs.update(first.id, {
        lease: randomUUID(),
        type: 'completed',
        report: { summary: 'Forged' },
      }),
    ).toThrow();
    runs.update(first.id, {
      lease: job.run.lease!,
      type: 'working',
      providerSessionId: 'thread-1',
    });
    runs.update(first.id, {
      lease: job.run.lease!,
      type: 'interaction',
      interaction: { id: 'ask', kind: 'approval', text: 'Allow?' },
    });
    runs.answer(first.id, { interactionId: 'ask', decision: 'decline' });
    expect(
      runs.update(first.id, { lease: job.run.lease!, type: 'heartbeat' }).answer
        ?.decision,
    ).toBe('decline');
    expect(() =>
      runs.answer(first.id, { interactionId: 'ask', decision: 'accept' }),
    ).toThrow();
    expect(() =>
      runs.update(first.id, { lease: job.run.lease!, type: 'completed' }),
    ).toThrow();
    runs.update(first.id, {
      lease: job.run.lease!,
      type: 'completed',
      report: { summary: 'Changed; needs review' },
    });
    expect(repo.get(a.id).status).toBe('ready_for_review');
    const reviewed = repo.get(a.id);
    const followup = repo.transition(a.id, 'request-changes', {
      expectedVersion: reviewed.version,
      comment: 'One more pass',
    });
    const followupRun = runs.dispatch({
      annotationId: a.id,
      revisionId: followup.revisions.at(-1)!.id,
      requestId: randomUUID(),
    });
    expect(followupRun.sessionId).not.toBe(first.sessionId);
    expect(followup.revisions[0]!.implementation?.summary).toBe(
      'Changed; needs review',
    );
    runs.stop(followupRun.id);
    const b = repo.create({ comment: 'Another element', anchor });
    const next = {
      annotationId: b.id,
      revisionId: b.revisions[0]!.id,
      requestId: randomUUID(),
    };
    expect(() => runs.dispatch({ ...next, sessionId: randomUUID() })).toThrow();
    const differentProvider = new RunStore(repo, project, 'claude');
    differentProvider.claim();
    expect(() =>
      differentProvider.dispatch({ ...next, sessionId: first.sessionId }),
    ).toThrow();
    const resumed = runs.dispatch({ ...next, sessionId: first.sessionId });
    expect(resumed.sessionId).toBe(first.sessionId);
    const second = runs.claim()!;
    runs.stop(resumed.id);
    expect(
      runs.update(resumed.id, { lease: second.run.lease!, type: 'heartbeat' })
        .stop,
    ).toBe(true);
    runs.update(resumed.id, { lease: second.run.lease!, type: 'cancelled' });
    expect(repo.get(b.id).status).toBe('queued');
    const fresh = runs.dispatch({ ...next, requestId: randomUUID() });
    expect(fresh.sessionId).not.toBe(first.sessionId);
    runs.claim();
    const recovered = new RunStore(repo, project);
    expect(recovered.get(fresh.id).status).toBe('interrupted');
    expect(repo.get(b.id).status).toBe('queued');
    expect(JSON.stringify(runs.publicState(true))).not.toContain('thread-1');
    const other = new RunStore(repo, randomUUID());
    expect(other.sessions()).toHaveLength(0);
  } finally {
    repo.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test('runner capabilities cannot access browser/MCP routes and browser cannot claim or forge runs', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-run-auth-'));
  const app = createBridge({
    stateDir: root,
    projectId: randomUUID(),
    port: 4747,
    origins: ['http://localhost:5173'],
    browserToken: 'b'.repeat(64),
    mcpToken: 'a'.repeat(64),
    runnerToken: 'c'.repeat(64),
    managed: true,
  });
  const headers = (token: string, origin?: string) => ({
    host: '127.0.0.1',
    authorization: `Bearer ${token.repeat(64)}`,
    ...(origin ? { origin } : {}),
  });
  try {
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/v1/annotations',
          headers: headers('c'),
        })
      ).statusCode,
    ).toBe(403);
    for (const h of [
      headers('a'),
      headers('b', 'http://localhost:5173'),
      headers('c', 'http://localhost:5173'),
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/runner/claim',
            headers: h,
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/runner/claim',
          headers: headers('c'),
          payload: {},
        })
      ).statusCode,
    ).toBe(200);
    const readiness = {
      provider: 'codex',
      adapter: 'missing',
      auth: 'login-required',
      billing: 'unknown',
      checkedAt: new Date().toISOString(),
    };
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/runner/readiness',
          headers: headers('b', 'http://localhost:5173'),
          payload: readiness,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/runner/readiness',
          headers: headers('c'),
          payload: { ...readiness, output: 'secret' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/runner/readiness',
          headers: headers('c'),
          payload: readiness,
        })
      ).statusCode,
    ).toBe(200);
    const status = (
      await app.inject({
        method: 'GET',
        url: '/api/v1/managed',
        headers: headers('b', 'http://localhost:5173'),
      })
    ).json();
    expect(status.readiness).toEqual(readiness);
    expect(JSON.stringify(status)).not.toContain('lease');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/runs',
          headers: headers('b', 'http://localhost:5173'),
          payload: { command: 'anything' },
        })
      ).statusCode,
    ).toBe(400);
  } finally {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  }
});
