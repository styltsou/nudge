import type { ManagedState, Provider } from '../../shared/src/runs';
import { providers } from '../../shared/src/runs';
const names = { codex: 'Codex', claude: 'Claude', opencode: 'OpenCode' };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
export class OnboardingPanel {
  readonly dialog = el('dialog');
  private select = el('select');
  private command = el('code');
  private copy = el('button', 'Copy setup command');
  private feedback = el('p');
  private begin = el('button', 'Annotate your first element');
  private login = el('code');
  private checks = el('details');
  private summary = el('p');
  private use = el('button');
  private signIn = el('button');
  private task = el('p');
  private instructions = el('details');
  private instructionsKey = '';
  private connected = false;
  private state: ManagedState = {
    enabled: false,
    online: false,
    runs: [],
    sessions: [],
  };
  constructor(
    shadow: ShadowRoot,
    private trigger: HTMLButtonElement,
    refresh: () => Promise<void>,
    private request: (path: string, body: unknown) => Promise<unknown>,
    annotate: () => void,
  ) {
    this.dialog.className = 'onboarding';
    this.dialog.setAttribute('aria-labelledby', 'nudge-setup-title');
    const heading = el('h2', 'Connect your agent');
    heading.id = 'nudge-setup-title';
    const close = el('button', 'Close setup');
    close.type = 'button';
    close.onclick = () => this.dialog.close();
    const header = el('div');
    header.className = 'setup-heading';
    header.append(heading, close);
    const label = el('label', 'Choose an agent');
    label.htmlFor = 'nudge-setup-provider';
    this.select.id = label.htmlFor;
    for (const p of providers) {
      const option = el('option', names[p]);
      option.value = p;
      this.select.append(option);
    }
    this.select.onchange = () => {
      this.feedback.textContent = '';
      this.render();
    };
    this.command.className = 'setup-command';
    this.copy.type = 'button';
    this.copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(this.command.textContent ?? '');
        this.feedback.textContent =
          'Command copied. Run it in your project root, then restart dev.';
      } catch {
        this.feedback.textContent =
          'Copy is unavailable. Select the command below and copy it manually.';
      }
    };
    const check = el('button', 'Check again');
    check.type = 'button';
    check.onclick = async () => {
      check.disabled = true;
      this.feedback.textContent = 'Checking the local connection…';
      try {
        await refresh();
        this.feedback.textContent = this.connected
          ? 'Local state refreshed. Sign-in checks update while the runner is idle.'
          : 'Bridge unavailable. Start your dev server, then try again.';
      } finally {
        check.disabled = false;
      }
    };
    this.checks.className = 'setup-details';
    this.summary.className = 'setup-summary';
    this.use.type = 'button';
    this.signIn.type = 'button';
    const act =
      (button: HTMLButtonElement, path: string, busy: string) => async () => {
        button.disabled = true;
        this.feedback.textContent = busy;
        try {
          await this.request(path, { provider: this.select.value });
          await refresh();
          this.feedback.textContent = '';
        } catch (error) {
          this.feedback.textContent =
            error instanceof Error ? error.message : 'Request failed.';
        } finally {
          this.render();
        }
      };
    this.use.onclick = act(this.use, '/agents/select', 'Switching agent…');
    this.signIn.onclick = act(
      this.signIn,
      '/agents/login',
      'Starting sign-in…',
    );
    this.task.setAttribute('aria-live', 'polite');
    this.begin.type = 'button';
    this.begin.onclick = () => {
      this.dialog.close();
      annotate();
    };
    this.feedback.setAttribute('role', 'status');
    this.feedback.setAttribute('aria-live', 'polite');
    const actions = el('div');
    actions.className = 'actions';
    actions.append(check, this.begin);
    this.instructions.append(
      el('summary', 'Install or reconnect'),
      el(
        'p',
        'Run this in your project root. Setup installs the adapter; restart your dev server when it finishes.',
      ),
      this.command,
      this.copy,
      el(
        'p',
        'Sign in through your agent’s native subscription login. With the native CLI installed, use:',
      ),
      this.login,
      el(
        'p',
        'API keys may use separate API billing. Nudge never asks for your password or token. Your agent’s permissions apply; cloud-backed models receive request and project context.',
      ),
    );
    // Compact by default: choice, one-line state, actions. Details and
    // setup steps open by themselves only while something needs attention.
    const agentActions = el('div');
    agentActions.className = 'setup-row';
    agentActions.append(this.use, this.signIn);
    this.dialog.append(
      header,
      label,
      this.select,
      agentActions,
      this.task,
      this.summary,
      this.checks,
      this.instructions,
      this.feedback,
      actions,
    );
    this.dialog.addEventListener('close', () => this.trigger.focus());
    shadow.append(this.dialog);
    trigger.onclick = () => {
      this.select.value = this.state.provider ?? 'codex';
      this.feedback.textContent = '';
      this.render();
      this.dialog.showModal();
      this.dialog.scrollTop = 0;
    };
  }
  get isOpen() {
    return this.dialog.open;
  }
  connection(value: boolean) {
    this.connected = value;
    this.render();
  }
  update(state: ManagedState) {
    this.state = state;
    this.render();
  }
  private renderAgents(selected: Provider, current: boolean) {
    const reports = this.state.agents ?? [];
    for (const option of this.select.options) {
      const p = option.value as Provider;
      const r = reports.find((a) => a.provider === p);
      const status = !r
        ? ''
        : !r.installed && p === 'opencode'
          ? 'not installed'
          : r.auth === 'signed-in'
            ? 'signed in'
            : r.auth === 'login-required'
              ? 'sign-in needed'
              : r.installed
                ? 'installed'
                : 'CLI not found';
      const inUse = this.state.enabled && p === this.state.provider;
      option.textContent = [names[p], inUse ? 'in use' : '', status]
        .filter(Boolean)
        .join(' · ');
    }
    const task = this.state.setup;
    const busy = !!task && ['pending', 'running'].includes(task.state);
    this.use.textContent = current
      ? `Using ${names[selected]}`
      : `Use ${names[selected]}`;
    this.use.disabled = current || busy || !this.connected;
    const canLogin = selected !== 'opencode';
    this.signIn.hidden = !canLogin;
    this.signIn.textContent = `Sign in with ${names[selected]}`;
    this.signIn.disabled = busy || !this.connected;
    this.task.replaceChildren();
    if (task) {
      this.task.append(
        el(
          'span',
          `${names[task.provider]} ${task.kind === 'login' ? 'sign-in' : 'setup'}: ${task.state === 'pending' ? 'starting…' : (task.message ?? task.state)}`,
        ),
      );
      if (task.url && task.state === 'running') {
        const link = el('a', ' Open sign-in page');
        link.href = task.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        this.task.append(link);
      }
    }
  }
  private render() {
    const selected = (this.select.value || 'codex') as Provider;
    const current =
      this.state.enabled && selected === (this.state.provider ?? 'codex');
    const readiness =
      current && this.state.readiness?.provider === selected
        ? this.state.readiness
        : undefined;
    const fresh =
      readiness && Date.now() - Date.parse(readiness.checkedAt) < 60000;
    const online = current && this.state.online;
    const rows = [
      ['Local bridge', this.connected ? 'Connected' : 'Unavailable'],
      [
        'Agent selection',
        current ? `${names[selected]} selected` : 'Setup needed',
      ],
      [
        'ACP adapter',
        !fresh
          ? 'Not checked'
          : readiness.adapter === 'available'
            ? 'Installed'
            : readiness.adapter === 'missing'
              ? 'Install needed'
              : 'Setup needs repair',
      ],
      [
        'Background runner',
        online
          ? 'Connected'
          : current
            ? 'Restart dev or check setup'
            : 'Not enabled',
      ],
      [
        'Agent sign-in',
        !fresh || readiness.auth === 'unknown'
          ? 'Not verified'
          : readiness.auth === 'signed-in'
            ? 'Signed in'
            : 'Sign in needed',
      ],
      [
        'Billing',
        !fresh || readiness.billing === 'unknown'
          ? 'Check in your agent'
          : readiness.billing === 'subscription'
            ? 'Subscription login detected'
            : 'API/provider billing detected',
      ],
    ];
    this.renderAgents(selected, current);
    const list = el('dl');
    list.className = 'setup-checks';
    for (const [label, text] of rows)
      list.append(el('dt', label!), el('dd', text!));
    this.checks.replaceChildren(el('summary', 'Connection details'), list);
    const ready =
      this.connected &&
      online &&
      !!fresh &&
      readiness.adapter === 'available' &&
      readiness.auth !== 'login-required';
    this.summary.textContent = ready
      ? 'Ready. Start with a small request; this does not verify model access.'
      : 'Finish setup or sign in to run agents. You can still annotate and save requests.';
    this.summary.dataset.ready = String(ready);
    this.command.textContent = `${this.state.setupCommand ?? 'bunx --bun usenudge'} agents --agent ${selected} --managed`;
    this.login.textContent =
      selected === 'codex'
        ? 'codex login'
        : selected === 'claude'
          ? 'claude auth login'
          : 'opencode auth login';
    this.begin.textContent = ready
      ? 'Annotate your first element'
      : 'Try annotation only';
    this.begin.disabled = !this.connected;
    const instructionsKey = `${selected}:${current}:${online}:${readiness?.adapter}:${readiness?.auth}`;
    if (instructionsKey !== this.instructionsKey) {
      this.instructions.open = !ready;
      this.checks.open = !ready;
      this.instructionsKey = instructionsKey;
    }
    this.trigger.dataset.needsSetup = String(
      !this.state.enabled || !this.state.online,
    );
  }
}
