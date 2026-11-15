import type { Annotation } from '@usenudge/shared';
import {
  activeRun,
  type AgentRun,
  type ManagedState,
} from '../../shared/src/runs';
import { BridgeClient } from './client';
import { spinner } from './spinner';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '') {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}
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
    const label = element('label', 'Agent session');
    const select = element('select');
    select.setAttribute('aria-label', 'Agent session');
    const fresh = element('option', 'New session');
    fresh.value = '';
    select.append(fresh);
    for (const session of this.state.sessions) {
      if (session.provider !== (this.state.provider ?? 'codex')) continue;
      const option = element(
        'option',
        `${session.title} · ${session.provider}`,
      );
      option.value = session.id;
      option.disabled = this.state.runs.some(
        (r) => r.sessionId === session.id && activeRun(r),
      );
      select.append(option);
    }
    label.append(select);
    return { node: label, value: () => select.value || undefined };
  }
  async dispatch(
    a: Annotation,
    sessionId?: string,
    requestId = crypto.randomUUID(),
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
    const box = element('div');
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
    box.replaceChildren();
    const error = element('p');
    error.className = 'error';
    error.setAttribute('role', 'alert');
    const action = (text: string, callback: () => Promise<unknown>) => {
      const button = element('button', text);
      button.type = 'button';
      button.onclick = async () => {
        button.disabled = true;
        try {
          await callback();
          await this.sync();
          await this.refresh();
        } catch (cause) {
          error.textContent =
            cause instanceof Error ? cause.message : 'Agent action failed';
        } finally {
          button.disabled = false;
        }
      };
      return button;
    };
    if (run) {
      const labels: Record<AgentRun['status'], string> = {
        queued: 'Waiting for runner',
        starting: 'Starting agent',
        working: 'Agent working',
        waiting: 'Waiting for you',
        stopping: 'Stopping agent',
        completed: 'Ready for review',
        failed: 'Agent failed',
        cancelled: 'Agent stopped',
        interrupted: 'Agent interrupted',
      };
      const row = element('div');
      row.className = 'run-state';
      const status = element('p', labels[run.status]);
      status.setAttribute('role', 'status');
      if (['starting', 'working'].includes(run.status)) {
        status.className = 'agent-working';
        status.prepend(spinner());
      }
      status.dataset.tip = `${run.sessionMode === 'new' ? 'New' : 'Existing'} ${this.state.sessions.find((s) => s.id === run.sessionId)?.provider ?? this.state.provider ?? 'codex'} session · ${run.sessionId.slice(0, 8)}`;
      row.append(status);
      if (activeRun(run))
        row.append(
          action('Stop agent', () =>
            this.client.request(`/runs/${run.id}/stop`, {}),
          ),
        );
      box.append(row);
      // New sessions are the default; only call out an explicit reuse.
      if (run.sessionMode === 'existing')
        box.append(element('small', status.dataset.tip ?? ''));
      if (run.events.length > 1) {
        const details = element('details');
        details.append(element('summary', 'Agent activity'));
        for (const event of run.events)
          details.append(element('small', event.text), element('br'));
        box.append(details);
      }
      if (run.interaction) {
        box.append(element('p', run.interaction.text));
        const interactionId = run.interaction.id;
        if (run.interaction.kind === 'approval') {
          for (const decision of ['accept', 'decline'] as const)
            box.append(
              action(decision === 'accept' ? 'Allow once' : 'Deny', () =>
                this.client.request(`/runs/${run.id}/answer`, {
                  interactionId,
                  decision,
                }),
              ),
            );
        } else {
          const inputs = new Map<string, HTMLTextAreaElement>();
          for (const q of run.interaction.questions ?? []) {
            const label = element('label', q.text);
            const input = element('textarea');
            input.maxLength = 2000;
            input.setAttribute('aria-label', q.text);
            label.append(input);
            box.append(label);
            inputs.set(q.id, input);
          }
          box.append(
            action('Send answer', () =>
              this.client.request(`/runs/${run.id}/answer`, {
                interactionId,
                answers: Object.fromEntries(
                  [...inputs].map(([id, input]) => [id, input.value]),
                ),
              }),
            ),
          );
        }
      }
    }
    if (a.status === 'queued' && (!run || !activeRun(run))) {
      const session = this.selector();
      const requestId = crypto.randomUUID();
      const runButton = action(run ? 'Retry agent' : 'Run agent', () =>
        this.dispatch(a, session.value(), requestId),
      );
      runButton.disabled = !this.canRun();
      runButton.classList.add('primary');
      const actions = element('div');
      actions.className = 'actions';
      actions.append(runButton);
      box.append(session.node);
      if (!this.canRun()) box.append(element('small', this.runHint()));
      box.append(actions);
    }
    box.append(error);
  }
}
