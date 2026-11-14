import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Annotation } from '@usenudge/shared';
import { MAX_SNAPSHOT_BYTES } from '@usenudge/shared';
import { createBridge } from './index';
import type { BridgeConfig } from './config';
import { validatePng } from './snapshots';
import { png, pngUrl } from '../../../tests/helpers/png';

describe('bounded PNG decoding', () => {
  it('accepts valid RGB/RGBA PNG pixels and derives dimensions from bytes', () => {
    const image = validatePng(pngUrl(png(13, 7)));
    expect([image.width, image.height]).toEqual([13, 7]);
  });
  it('rejects MIME spoofing, malformed images, corrupt CRCs, trailing data and inflation bombs', () => {
    const corrupted = png();
    corrupted[40] = corrupted[40]! ^ 1;
    for (const dataUrl of [
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/png;base64,bm90IGEgcG5n',
      `${pngUrl()}!`,
      pngUrl(corrupted),
      pngUrl(Buffer.concat([png(), Buffer.from('trailing')])),
      pngUrl(png().subarray(0, -12)),
      pngUrl(png(2049, 1)),
      pngUrl(png(1, 1, Buffer.alloc(100000))),
      pngUrl(png(1, 1, Buffer.from([5, 0, 0, 0, 0]))),
    ])
      expect(() => validatePng(dataUrl)).toThrow();
    expect(() =>
      validatePng(
        `data:image/png;base64,${'A'.repeat(Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 + 4)}`,
      ),
    ).toThrow();
  });
});

describe('snapshot capabilities, persistence and revision ownership', () => {
  let app: ReturnType<typeof createBridge>;
  let config: BridgeConfig;
  let a: Annotation;
  const browser = {
    origin: 'http://localhost:5173',
    authorization: `Bearer ${'b'.repeat(64)}`,
  };
  const mcp = { authorization: `Bearer ${'a'.repeat(64)}` };
  beforeEach(async () => {
    mkdirSync('.nudge', { recursive: true });
    config = {
      stateDir: mkdtempSync(resolve('.nudge/image-test-')),
      projectId: randomUUID(),
      browserToken: 'b'.repeat(64),
      mcpToken: 'a'.repeat(64),
      origins: [browser.origin],
      port: 4747,
    };
    app = createBridge(config);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      headers: browser,
      payload: {
        comment: 'Taller chart',
        anchor: {
          pageUrl: `${browser.origin}/`,
          pathname: '/',
          tagName: 'DIV',
          selector: '[data-testid="chart"]',
          rect: { x: 1, y: 1, width: 13, height: 7 },
          viewport: { width: 1200, height: 800 },
        },
      },
    });
    a = response.json<Annotation>();
  });
  afterEach(async () => {
    await app.close();
    rmSync(config.stateDir, { recursive: true, force: true });
  });
  function payload(kind: 'before' | 'after') {
    return {
      expectedVersion: a.version,
      revisionId: a.revisions.at(-1)!.id,
      kind,
      integrity: 'captured',
      dataUrl: pngUrl(png(13, 7)),
    };
  }
  async function upload(kind: 'before' | 'after') {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${a.id}/snapshots`,
      headers: browser,
      payload: payload(kind),
    });
    expect(response.statusCode).toBe(201);
    a = response.json<Annotation>();
    return a.revisions.at(-1)![
      kind === 'before' ? 'beforeSnapshot' : 'afterSnapshot'
    ]!;
  }
  async function action(
    name: string,
    authority: typeof browser | typeof mcp,
    extra: Record<string, unknown> = {},
  ) {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${a.id}/${name}`,
      headers: authority,
      payload: { expectedVersion: a.version, ...extra },
    });
    expect(response.statusCode).toBe(200);
    a = response.json<Annotation>();
  }
  it('serves only authenticated project-scoped bytes with inert MIME and immutable revision evidence', async () => {
    const before = await upload('before');
    await action('implementation', mcp, { summary: 'Adjusted chart' });
    const after = await upload('after');
    const revision = structuredClone(a.revisions[0]);
    const bytes = await app.inject({
      url: `/api/v1/snapshots/${before.id}`,
      headers: browser,
    });
    expect(bytes.rawPayload.equals(png(13, 7))).toBe(true);
    expect(bytes.headers['content-type']).toBe('image/png');
    expect(bytes.headers['x-content-type-options']).toBe('nosniff');
    expect(bytes.headers['content-security-policy']).toContain('sandbox');
    await action('request-changes', browser, { comment: 'More spacing' });
    expect(a.revisions[0]).toEqual(revision);
    expect(a.revisions[1]!.beforeSnapshot).toBeUndefined();
    const nextBefore = await upload('before');
    expect(nextBefore.id).not.toBe(before.id);
    for (const ref of [before, after, nextBefore])
      expect(
        (await app.inject({ url: `/api/v1/snapshots/${ref.id}`, headers: mcp }))
          .statusCode,
      ).toBe(200);
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
    expect(
      (
        await app.inject({
          url: `/api/v1/snapshots/${before.id}`,
          headers: browser,
        })
      ).statusCode,
    ).toBe(200);
    await app.close();
    app = createBridge({ ...config, projectId: randomUUID() });
    expect(
      (
        await app.inject({
          url: `/api/v1/snapshots/${before.id}`,
          headers: mcp,
        })
      ).statusCode,
    ).toBe(404);
  });
  it('rejects agent uploads, missing/unknown origins, unauthorized reads and traversal', async () => {
    const path = `/api/v1/annotations/${a.id}/snapshots`;
    for (const [headers, status] of [
      [{}, 401],
      [mcp, 403],
      [{ authorization: browser.authorization }, 403],
      [{ ...browser, origin: 'https://evil.example' }, 403],
    ] as const) {
      expect(
        (
          await app.inject({
            method: 'POST',
            url: path,
            headers,
            payload: payload('before'),
          })
        ).statusCode,
      ).toBe(status);
    }
    const ref = await upload('before');
    expect((await app.inject(`/api/v1/snapshots/${ref.id}`)).statusCode).toBe(
      401,
    );
    for (const id of [
      '..%2f..%2fcredentials.json',
      '%2e%2e',
      'credentials.json',
    ])
      expect(
        (await app.inject({ url: `/api/v1/snapshots/${id}`, headers: browser }))
          .statusCode,
      ).toBeGreaterThanOrEqual(400);
  });
  it('rejects stale, historical, duplicate and accepted uploads without creating orphan files', async () => {
    const firstPayload = payload('before');
    await upload('before');
    const path = `/api/v1/annotations/${a.id}/snapshots`;
    for (const body of [firstPayload, payload('before'), payload('after')])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: path,
            headers: browser,
            payload: body,
          })
        ).statusCode,
      ).toBe(409);
    expect(readdirSync(resolve(config.stateDir, 'snapshots'))).toHaveLength(1);
    await action('implementation', mcp, { summary: 'Adjusted chart' });
    const oldRevision = a.revisions[0]!.id;
    await action('request-changes', browser, { comment: 'Again' });
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: browser,
          payload: { ...payload('before'), revisionId: oldRevision },
        })
      ).statusCode,
    ).toBe(409);
    await action('implementation', mcp, { summary: 'Second pass' });
    await action('accept', browser);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: browser,
          payload: payload('after'),
        })
      ).statusCode,
    ).toBe(409);
    expect(readdirSync(resolve(config.stateDir, 'snapshots'))).toHaveLength(1);
  });
  it('rejects invalid and oversized image payloads without touching the snapshot directory', async () => {
    const path = `/api/v1/annotations/${a.id}/snapshots`;
    for (const body of [
      { ...payload('before'), dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
      { ...payload('before'), dataUrl: pngUrl(png(2049, 1)) },
      { ...payload('before'), filename: '../../credentials.json' },
    ])
      expect(
        (
          await app.inject({
            method: 'POST',
            url: path,
            headers: browser,
            payload: body,
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: path,
          headers: browser,
          payload: {
            ...payload('before'),
            dataUrl: `data:image/png;base64,${'A'.repeat(Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 + 4096)}`,
          },
        })
      ).statusCode,
    ).toBe(413);
    expect(readdirSync(resolve(config.stateDir, 'snapshots'))).toHaveLength(0);
  });
});
