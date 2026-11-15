import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Repository } from '../../packages/bridge/src/repository';
import { RunStore } from '../../packages/bridge/src/runs';
import { cleanSessionTitle } from '../../packages/shared/src/runs';

test('agent titles are reduced to one safe, bounded line', () => {
  expect(cleanSessionTitle('  "Pad the\u0007 primary\n button"  ')).toBe(
    'Pad the primary button',
  );
  expect(cleanSessionTitle('evil‮exe.txt')).toBe('evil exe.txt');
  expect(cleanSessionTitle(' \n\t ')).toBeUndefined();
  const long = cleanSessionTitle('word '.repeat(40))!;
  expect(long.length).toBeLessThanOrEqual(80);
  expect(long.endsWith('…')).toBe(true);
});

test('a generated title replaces the prompt excerpt and is marked as titled', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-title-'));
  const project = randomUUID();
  const repo = new Repository(resolve(root, 'db.sqlite'), project);
  try {
    const runs = new RunStore(repo, project);
    runs.claim(); // marks the runner online so dispatch is accepted
    const a = repo.create({
      comment: 'Change the button padding to 12px please',
      anchor: {
        pageUrl: 'http://localhost:5173/',
        pathname: '/',
        selector: '#b',
        tagName: 'BUTTON',
        rect: { x: 0, y: 0, width: 10, height: 10 },
        viewport: { width: 800, height: 600 },
      },
    });
    runs.dispatch({
      annotationId: a.id,
      revisionId: a.revisions.at(-1)!.id,
      requestId: randomUUID(),
    });
    const [session] = runs.sessions();
    expect(session!.titled).toBeUndefined();
    runs.setTitle(session!.id, 'Pad the primary button');
    expect(runs.sessions()[0]).toMatchObject({
      title: 'Pad the primary button',
      titled: true,
    });
    expect(() => runs.setTitle(randomUUID(), 'x')).toThrow();
  } finally {
    repo.db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
