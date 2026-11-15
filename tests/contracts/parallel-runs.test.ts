import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Repository } from '../../packages/bridge/src/repository';
import { RunStore } from '../../packages/bridge/src/runs';

const anchor = {
  pageUrl: 'http://localhost:5173/',
  pathname: '/',
  selector: '#b',
  tagName: 'BUTTON',
  rect: { x: 0, y: 0, width: 10, height: 10 },
  viewport: { width: 800, height: 600 },
};

test('runs overlap up to the cap, never twice per request or session', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'nudge-parallel-'));
  const project = randomUUID();
  const repo = new Repository(resolve(root, 'db.sqlite'), project);
  try {
    const runs = new RunStore(repo, project);
    runs.maxParallel = 3;
    runs.claim(); // runner online
    const request = (comment: string, sessionId?: string) => {
      const a = repo.create({ comment, anchor });
      return runs.dispatch({
        annotationId: a.id,
        revisionId: a.revisions[0]!.id,
        requestId: randomUUID(),
        ...(sessionId ? { sessionId } : {}),
      });
    };
    const first = request('One');
    const second = request('Two');
    // A second run on the same request is still refused.
    expect(() =>
      runs.dispatch({
        annotationId: first.annotationId,
        revisionId: first.revisionId,
        requestId: randomUUID(),
      }),
    ).toThrow('already has an agent run');
    const jobA = runs.claim()!;
    const jobB = runs.claim()!;
    expect(new Set([jobA.run.id, jobB.run.id])).toEqual(
      new Set([first.id, second.id]),
    );
    request('Three');
    request('Four');
    expect(runs.claim()).not.toBeNull(); // third slot
    expect(runs.claim()).toBeNull(); // cap of 3 reached; "Four" waits
    // Finishing one frees a slot for the waiting request.
    runs.update(jobA.run.id, { lease: jobA.run.lease!, type: 'cancelled' });
    expect(runs.claim()?.annotation.revisions[0]!.comment).toBe('Four');

    // A session already running cannot take another request meanwhile.
    runs.update(jobB.run.id, {
      lease: jobB.run.lease!,
      type: 'working',
      providerSessionId: 'thread-b',
    });
    expect(() => request('Five', jobB.session.id)).toThrow('session is busy');
  } finally {
    repo.db.close();
    rmSync(root, { recursive: true, force: true });
  }
});
