import { mountSessionSelector, renderManaged } from '@usenudge/overlay';
import type { Annotation } from '@usenudge/shared';
import { type ManagedState } from '../../shared/src/runs';
import { BridgeClient } from './client';

export class ManagedControls {
  onState?: (state: ManagedState) => void;
  canRun() {
    const r = this.state.readiness;
    const fresh = r && Date.now() - Date.parse(r.checkedAt) < 60000;
    return (
      this.state.online &&
      !!fresh &&
      r.adapter === 'available' &&
      r.auth !== 'login-required'
    );
  }
  runHint() {
    const r = this.state.readiness;
    const fresh = r && Date.now() - Date.parse(r.checkedAt) < 60000;
    if (!this.state.online)
      return 'Runner offline. Open Agent setup, finish setup and restart dev. You can save this comment for later.';
    if (!fresh)
      return 'Waiting for an agent readiness check. You can save this comment for later.';
    if (fresh && r.adapter !== 'available')
      return 'Agent adapter needs setup. Open Agent setup for the command.';
    if (fresh && r.auth === 'login-required')
      return 'Sign in with your agent, then wait for the next check or open Agent setup.';
    return 'A new session is the default. Your agent controls its model and permissions.';
  }
  state: ManagedState = {
    enabled: false,
    online: false,
    runs: [],
    sessions: [],
  };
  private target?: { annotation: Annotation; node: HTMLElement; key: string };
  constructor(
    private client: BridgeClient,
    private refresh: () => Promise<void>,
  ) {}
  async sync() {
    this.state = (await this.client.request('/managed')) as ManagedState;
    this.onState?.(this.state);
    if (this.target?.node.isConnected)
      this.render(this.target.annotation, this.target.node);
  }
  selector() {
    return mountSessionSelector(this.state);
  }
  async dispatch(
    a: Annotation,
    sessionId?: string,
    requestId: string = crypto.randomUUID(),
  ) {
    await this.client.request('/runs', {
      annotationId: a.id,
      revisionId: a.revisions.at(-1)!.id,
      requestId,
      ...(sessionId ? { sessionId } : {}),
    });
    await this.refresh();
  }
  attach(a: Annotation) {
    const box = document.createElement('div');
    this.target = { annotation: a, node: box, key: '' };
    this.render(a, box);
    return box;
  }
  private render(a: Annotation, box: HTMLElement) {
    const run = this.state.runs
      .filter(
        (r) =>
          r.annotationId === a.id && r.revisionId === a.revisions.at(-1)!.id,
      )
      .at(-1);
    const key = JSON.stringify([
      run?.id,
      run?.status,
      run?.interaction,
      run?.events,
      a.version,
      this.state.online,
      this.state.readiness,
    ]);
    if (this.target?.key === key) return;
    if (this.target) this.target.key = key;
    renderManaged(box, {
      annotation: a,
      state: this.state,
      canRun: this.canRun(),
      hint: this.runHint(),
      request: (path, body) => this.client.request(path, body),
      refresh: async () => {
        await this.sync();
        await this.refresh();
      },
      dispatch: (sessionId, requestId) =>
        this.dispatch(a, sessionId, requestId),
    });
  }
}
