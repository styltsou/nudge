export type AnnotationStatus =
  'queued' | 'in_progress' | 'ready_for_review' | 'accepted';
export type Action =
  'claim' | 'release' | 'implementation' | 'accept' | 'request-changes';
export type Authority = 'browser' | 'mcp';
const transitions: Record<
  Action,
  Partial<Record<AnnotationStatus, AnnotationStatus>>
> = {
  claim: { queued: 'in_progress' },
  release: { in_progress: 'queued' },
  implementation: {
    queued: 'ready_for_review',
    in_progress: 'ready_for_review',
  },
  accept: { ready_for_review: 'accepted' },
  'request-changes': { ready_for_review: 'queued' },
};
export function canAct(authority: Authority, action: Action): boolean {
  return authority === 'browser'
    ? ['accept', 'request-changes'].includes(action)
    : ['claim', 'release', 'implementation'].includes(action);
}
export function nextStatus(
  status: AnnotationStatus,
  action: Action,
): AnnotationStatus {
  const next = transitions[action][status];
  if (!next) throw new Error('Invalid state transition');
  return next;
}
