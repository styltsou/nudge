import type { Annotation } from '@usenudge/shared';
import {
  activeRun,
  type AgentRun,
  type ManagedState,
} from '../../shared/src/runs';
import { BridgeClient } from './client';
import { spinner } from './spinner';
import { promptDisclosure } from './prompt-controls';
import { icons, setIcon, submitOnEnter } from './icons';

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
    const trigger = element('button');
    trigger.className = 'session-trigger';
    const caption = element('span', 'New session');
    const chevron = element('span');
    chevron.innerHTML = icons.chevron; // static icon markup
    trigger.append(caption, chevron);
    trigger.setAttribute('aria-label', 'Agent session: New session');
    trigger.dataset.tip =
      'Choose a session for this request. New session is the default.';
    const picker = promptDisclosure(trigger);
    picker.node.classList.add('session-selector');
    const label = element('label', 'Agent session');
    const select = element('select');
    select.setAttribute('aria-label', 'Agent session');
    const fresh = element('option', 'New session');
    fresh.value = '';
    select.append(fresh);
    for (const session of this.state.sessions) {
      if (session.provider !== (this.state.provider ?? 'codex')) continue;
      const busy = this.state.runs.some(
        (r) => r.sessionId === session.id && activeRun(r),
      );
      const option = element(
        'option',
        `${session.title} · ${session.provider}${busy ? ' · Busy' : ''}`,
      );
      option.value = session.id;
      option.disabled = busy;
      select.append(option);
    }
    // Each selector is local to one submission, never to the project or item.
    select.value = '';
    select.addEventListener('change', () => {
      const session = this.state.sessions.find((s) => s.id === select.value);
      caption.textContent = session
        ? `Continue: ${session.title}`
        : 'New session';
      trigger.setAttribute(
        'aria-label',
        `Agent session: ${caption.textContent}`,
      );
      trigger.dataset.tip = session
        ? `Continue this request in ${session.title}`
        : 'Start a new session for this request';
      trigger.dataset.reused = String(!!session);
      picker.close(true);
    });
    label.append(select);
    const hint = element(
      'small',
      select.options.length === 1
        ? 'No other sessions for this agent yet.'
        : 'Continue a conversation only when you need its earlier context.',
    );
    picker.content.append(label, hint);
    return { node: picker.node, value: () => select.value || undefined };
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
    const action = (
      text: string,
      callback: () => Promise<unknown>,
      icon?: string,
    ) => {
      const button = element('button', text);
      button.type = 'button';
      if (icon) {
        setIcon(button, icon, text);
        button.className = 'icon';
      }
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
          action(
            'Stop agent',
            () => this.client.request(`/runs/${run.id}/stop`, {}),
            icons.stop,
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
          const send = action(
            'Send answer',
            () =>
              this.client.request(`/runs/${run.id}/answer`, {
                interactionId,
                answers: Object.fromEntries(
                  [...inputs].map(([id, input]) => [id, input.value]),
                ),
              }),
            icons.send,
          );
          send.classList.add('primary');
          for (const input of inputs.values())
            submitOnEnter(input, () => send.click());
          const row = element('div');
          row.className = 'actions';
          row.append(send);
          box.append(row);
        }
      }
    }
    if (a.status === 'queued' && (!run || !activeRun(run))) {
      const session = this.selector();
      const requestId = crypto.randomUUID();
      const runButton = action(
        run ? 'Retry agent' : 'Run agent',
        () => this.dispatch(a, session.value(), requestId),
        run ? icons.refresh : icons.send,
      );
      runButton.disabled = !this.canRun();
      runButton.classList.add('primary');
      const actions = element('div');
      actions.className = 'actions prompt-footer';
      actions.append(session.node, runButton);
      if (!this.canRun()) box.append(element('small', this.runHint()));
      box.append(actions);
    }
    box.append(error);
  }
}
