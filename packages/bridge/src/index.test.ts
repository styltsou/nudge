import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createBridge } from './index';
import type { BridgeConfig } from './config';
import type { Annotation } from '@usenudge/shared';

const origin = 'http://localhost:5173';
const anchor = {
  pageUrl: `${origin}/`,
  pathname: '/',
  selector: '[data-testid="chart"]',
  tagName: 'DIV',
  rect: { x: 0, y: 0, width: 100, height: 100 },
  viewport: { width: 1280, height: 800 },
};
describe('authenticated local persistence and human review', () => {
  let app: ReturnType<typeof createBridge>;
  let config: BridgeConfig;
  const browser = { origin, authorization: `Bearer ${'b'.repeat(64)}` };
  const mcp = { authorization: `Bearer ${'a'.repeat(64)}` };
  beforeEach(() => {
    mkdirSync('.nudge', { recursive: true });
    config = {
      stateDir: mkdtempSync(resolve('.nudge/test-')),
      projectId: randomUUID(),
      browserToken: 'b'.repeat(64),
      mcpToken: 'a'.repeat(64),
      origins: [origin],
      port: 4747,
    };
    app = createBridge(config);
  });
  afterEach(async () => {
    await app.close();
    rmSync(config.stateDir, { recursive: true, force: true });
  });
  async function create() {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      headers: browser,
      payload: { comment: '<script>alert(1)</script> Taller chart', anchor },
    });
    expect(response.statusCode).toBe(201);
    return response.json<Annotation>();
  }
  it('health exposes liveness only, all data requires authorization and trusted channels', async () => {
    expect((await app.inject('/health')).json()).toEqual({
      ok: true,
      service: 'Nudge',
    });
    for (const headers of [{}, { authorization: 'Bearer wrong' }])
      expect(
        (await app.inject({ url: '/api/v1/annotations', headers })).statusCode,
      ).toBe(401);
    for (const headers of [
      { ...browser, origin: 'https://evil.example' },
      { authorization: browser.authorization },
      { ...mcp, origin },
      { ...mcp, host: 'evil.example' },
    ])
      expect(
        (await app.inject({ url: '/api/v1/annotations', headers })).statusCode,
      ).toBe(403);
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/annotations',
      headers: { origin },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(origin);
  });
  it('persists across reopen, scopes projects, sanitizes URLs and keeps text inert', async () => {
    const a = await create();
    await app.close();
    app = createBridge(config);
    expect(
      (
        await app.inject({
          url: `/api/v1/annotations/${a.id}`,
          headers: browser,
        })
      ).json<Annotation>(),
    ).toEqual(a);
    expect(a.revisions[0]!.comment).toContain('<script>');
    const sanitized = await app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      headers: browser,
      payload: {
        comment: 'URL scrub',
        anchor: { ...anchor, pageUrl: `${origin}/?token=secret#secret` },
      },
    });
    expect(sanitized.json<Annotation>().anchor.pageUrl).toBe(`${origin}/`);
    await app.close();
    app = createBridge({ ...config, projectId: randomUUID() });
    expect(
      (await app.inject({ url: '/api/v1/annotations', headers: mcp })).json(),
    ).toEqual([]);
  });
  it('rejects invalid, oversized, remote and authority-spoofing payloads', async () => {
    for (const payload of [
      { comment: ' ', anchor },
      { comment: 'x'.repeat(2001), anchor },
      { comment: 'Hi', anchor, actor: 'human' },
      { comment: 'Hi', anchor, projectId: randomUUID() },
      {
        comment: 'Hi',
        anchor: { ...anchor, pageUrl: 'https://evil.example/' },
      },
      { comment: 'Hi', anchor: { ...anchor, pathname: '/unrelated' } },
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/api/v1/annotations',
            headers: browser,
            payload,
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/annotations',
          headers: browser,
          payload: { comment: 'x'.repeat(40000), anchor },
        })
      ).statusCode,
    ).toBe(413);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/annotations',
          headers: mcp,
          payload: { comment: 'Hi', anchor },
        })
      ).statusCode,
    ).toBe(403);
  });
  it('implements claim, release, report, human revision and terminal acceptance', async () => {
    let a = await create();
    async function action(
      name: string,
      headers: Record<string, string>,
      body: Record<string, unknown>,
      expected = 200,
    ) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/annotations/${a.id}/${name}`,
        headers,
        payload: { expectedVersion: a.version, ...body },
      });
      expect(response.statusCode).toBe(expected);
      if (expected === 200) a = response.json<Annotation>();
    }
    await action('accept', browser, {}, 409);
    await action('claim', browser, {}, 403);
    await action('claim', mcp, {});
    expect(a.status).toBe('in_progress');
    await action('release', mcp, {});
    expect(a.status).toBe('queued');
    await action('implementation', browser, { summary: 'Done' }, 403);
    await action('implementation', mcp, {
      summary: 'Taller chart',
      changedFiles: ['apps/demo/src/style.css'],
    });
    const original = structuredClone(a.revisions[0]);
    await action('request-changes', mcp, { comment: 'More space' }, 403);
    await action('accept', mcp, {}, 403);
    await action('request-changes', browser, { comment: 'More space' });
    expect(a.revisions).toHaveLength(2);
    expect(a.revisions[0]).toEqual(original);
    expect(a.revisions[1]!.ordinal).toBe(2);
    await action('implementation', mcp, { summary: 'More spacing' });
    await action('accept', browser, {});
    expect(a.status).toBe('accepted');
    await action('claim', mcp, {}, 409);
  });
  it('serializes competing updates using expectedVersion and rejects stale writes', async () => {
    const a = await create();
    const claims = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: `/api/v1/annotations/${a.id}/claim`,
          headers: mcp,
          payload: { expectedVersion: 1 },
        }),
      ),
    );
    expect(claims.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const stale = await app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${a.id}/implementation`,
      headers: mcp,
      payload: { expectedVersion: 1, summary: 'Stale' },
    });
    expect(stale.statusCode).toBe(409);
  });
  it('emits authenticated event hints and closes subscriptions cleanly', async () => {
    const url = await app.listen({ host: '127.0.0.1', port: 0 });
    const controller = new AbortController();
    const response = await fetch(`${url}/api/v1/events`, {
      headers: mcp,
      signal: controller.signal,
    });
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    const reader = response.body!.getReader();
    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        'connected',
      );
      const a = await create();
      const event = new TextDecoder().decode((await reader.read()).value);
      expect(event).toContain('event: annotation.created');
      expect(event).toContain(a.id);
      expect(event).toContain('"version":1');
    } finally {
      controller.abort();
      await reader.cancel().catch(() => {});
    }
  });
});
