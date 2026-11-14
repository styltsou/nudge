import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAct, nextStatus } from '../../packages/shared/src/state-machine.ts';
import type {
  Action,
  AnnotationStatus,
} from '../../packages/shared/src/state-machine.ts';

const expected: Partial<
  Record<`${AnnotationStatus}:${Action}`, AnnotationStatus>
> = {
  'queued:claim': 'in_progress',
  'queued:implementation': 'ready_for_review',
  'in_progress:release': 'queued',
  'in_progress:implementation': 'ready_for_review',
  'ready_for_review:accept': 'accepted',
  'ready_for_review:request-changes': 'queued',
};
for (const status of [
  'queued',
  'in_progress',
  'ready_for_review',
  'accepted',
] as const) {
  for (const action of [
    'claim',
    'release',
    'implementation',
    'accept',
    'request-changes',
  ] as const) {
    test(`${status} / ${action}`, () => {
      const target = expected[`${status}:${action}`];
      if (target) assert.equal(nextStatus(status, action), target);
      else assert.throws(() => nextStatus(status, action));
    });
  }
}
for (const authority of ['browser', 'mcp'] as const) {
  for (const action of [
    'claim',
    'release',
    'implementation',
    'accept',
    'request-changes',
  ] as const) {
    test(`${authority} capability / ${action}`, () => {
      assert.equal(
        canAct(authority, action),
        authority === 'browser'
          ? action === 'accept' || action === 'request-changes'
          : action === 'claim' ||
              action === 'release' ||
              action === 'implementation',
      );
    });
  }
}
