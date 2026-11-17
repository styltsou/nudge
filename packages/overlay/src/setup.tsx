import { useEffect, useState } from 'react';
import type { ManagedState, Provider } from '../../shared/src/runs';
import { providers } from '../../shared/src/runs';
import { Button } from './components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from './components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './components/ui/dialog';
import { renderView } from './render';
const names = { codex: 'Codex', claude: 'Claude', opencode: 'OpenCode' };
export type SetupProps = {
  open: boolean;
  connected: boolean;
  state: ManagedState;
  container: HTMLElement;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  refresh: () => Promise<void>;
  request: (path: string, body: unknown) => Promise<unknown>;
  annotate: () => void;
};
function Setup(props: SetupProps) {
  const [selected, setSelected] = useState<Provider>(
    props.state.provider ?? 'codex',
  );
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [checksOpen, setChecksOpen] = useState(false);
  const state = props.state;
  const current = state.enabled && selected === (state.provider ?? 'codex');
  const readiness =
    current && state.readiness?.provider === selected
      ? state.readiness
      : undefined;
  const fresh =
    readiness && Date.now() - Date.parse(readiness.checkedAt) < 60000;
  const online = current && state.online;
  const ready =
    props.connected &&
    online &&
    !!fresh &&
    readiness.adapter === 'available' &&
    readiness.auth !== 'login-required';
  const task = state.setup;
  const taskBusy =
    busy || (!!task && ['pending', 'running'].includes(task.state));
  const command = `${state.setupCommand ?? 'bunx --bun usenudge'} agents --agent ${selected} --managed`;
  useEffect(() => {
    if (props.open) {
      setSelected(props.state.provider ?? 'codex');
      setFeedback('');
    }
  }, [props.open]);
  useEffect(() => {
    setInstructionsOpen(!ready);
    setChecksOpen(!ready);
  }, [selected, current, online, readiness?.adapter, readiness?.auth, ready]);
  const action = async (path: string, message: string) => {
    if (busy) return;
    setBusy(true);
    setFeedback(message);
    try {
      await props.request(path, { provider: selected });
      await props.refresh();
      setFeedback('');
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  };
  const rows = [
    ['Local bridge', props.connected ? 'Connected' : 'Unavailable'],
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
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        portalContainer={props.container}
        finalFocus={() => {
          props.onClose();
          return false;
        }}
        showCloseButton={false}
        className="onboarding block w-[calc(100vw-32px)] max-w-[420px] gap-0 sm:max-w-[420px]"
      >
        <div className="setup-heading">
          <DialogTitle>Connect your agent</DialogTitle>
          <DialogClose render={<Button variant="ghost" size="sm" />}>
            Close setup
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Set up a local coding agent for Nudge requests.
        </DialogDescription>
        <label htmlFor="nudge-setup-provider">Choose an agent</label>
        <NativeSelect
          id="nudge-setup-provider"
          className="w-full"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value as Provider);
            setFeedback('');
          }}
        >
          {providers.map((provider) => {
            const report = state.agents?.find((a) => a.provider === provider);
            const status = !report
              ? ''
              : !report.installed && provider === 'opencode'
                ? 'not installed'
                : report.auth === 'signed-in'
                  ? 'signed in'
                  : report.auth === 'login-required'
                    ? 'sign-in needed'
                    : report.installed
                      ? 'installed'
                      : 'CLI not found';
            return (
              <NativeSelectOption key={provider} value={provider}>
                {[
                  names[provider],
                  state.enabled && provider === state.provider ? 'in use' : '',
                  status,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
        <div className="setup-row">
          <Button
            variant="secondary"
            size="sm"
            disabled={current || taskBusy || !props.connected}
            onClick={() => void action('/agents/select', 'Switching agent…')}
          >
            {current ? 'Using' : 'Use'} {names[selected]}
          </Button>
          {selected !== 'opencode' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={taskBusy || !props.connected}
              onClick={() => void action('/agents/login', 'Starting sign-in…')}
            >
              Sign in with {names[selected]}
            </Button>
          )}
        </div>
        {task && (
          <p aria-live="polite">
            {names[task.provider]} {task.kind === 'login' ? 'sign-in' : 'setup'}
            :{' '}
            {task.state === 'pending'
              ? 'starting…'
              : (task.message ?? task.state)}
            {task.url && task.state === 'running' && (
              <a href={task.url} target="_blank" rel="noopener noreferrer">
                {' '}
                Open sign-in page
              </a>
            )}
          </p>
        )}
        <p className="setup-summary" data-ready={ready}>
          {ready
            ? 'Ready. Start with a small request; this does not verify model access.'
            : 'Finish setup or sign in to run agents. You can still annotate and save requests.'}
        </p>
        <details
          className="setup-details"
          open={checksOpen}
          onToggle={(event) => setChecksOpen(event.currentTarget.open)}
        >
          <summary>Connection details</summary>
          <dl className="setup-checks">
            {rows.map(([label, text]) => (
              <div key={label} className="contents">
                <dt>{label}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </details>
        <details
          open={instructionsOpen}
          onToggle={(event) => setInstructionsOpen(event.currentTarget.open)}
        >
          <summary>Install or reconnect</summary>
          <p>
            Run this in your project root. Setup installs the adapter; restart
            your dev server when it finishes.
          </p>
          <code className="setup-command">{command}</code>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(command).then(
                () =>
                  setFeedback(
                    'Command copied. Run it in your project root, then restart dev.',
                  ),
                () =>
                  setFeedback(
                    'Copy is unavailable. Select the command below and copy it manually.',
                  ),
              );
            }}
          >
            Copy setup command
          </Button>
          <p>
            Sign in through your agent’s native subscription login. With the
            native CLI installed, use:
          </p>
          <code className="setup-command">
            {selected === 'codex'
              ? 'codex login'
              : selected === 'claude'
                ? 'claude auth login'
                : 'opencode auth login'}
          </code>
          <p>
            API keys may use separate API billing. Nudge never asks for your
            password or token. Your agent’s permissions apply; cloud-backed
            models receive request and project context.
          </p>
        </details>
        <p role="status" aria-live="polite">
          {feedback}
        </p>
        <div className="actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setFeedback('Checking the local connection…');
              void props
                .refresh()
                .then(() =>
                  setFeedback(
                    props.connected
                      ? 'Local state refreshed. Sign-in checks update while the runner is idle.'
                      : 'Bridge unavailable. Start your dev server, then try again.',
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            Check again
          </Button>
          <Button
            size="sm"
            disabled={!props.connected}
            onClick={() => {
              props.onOpenChange(false);
              props.annotate();
            }}
          >
            {ready ? 'Annotate your first element' : 'Try annotation only'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function renderSetup(node: HTMLElement, props: SetupProps) {
  renderView(node, <Setup {...props} />);
}
