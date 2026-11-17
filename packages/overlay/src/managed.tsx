import { useRef, useState } from 'react';
import { ArrowUp, RotateCw, Square } from 'lucide-react';
import type { Annotation } from '@usenudge/shared';
import {
  activeRun,
  type AgentRun,
  type ManagedState,
} from '../../shared/src/runs';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { SessionSelector } from './prompt';
import { renderView } from './render';

export function Spinner() {
  return (
    <span className="spinner" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${i * 65}ms` }} />
      ))}
    </span>
  );
}
export type ManagedProps = {
  annotation: Annotation;
  state: ManagedState;
  canRun: boolean;
  hint: string;
  request: (path: string, body: unknown) => Promise<unknown>;
  refresh: () => Promise<void>;
  dispatch: (sessionId: string | undefined, requestId: string) => Promise<void>;
};
function ManagedRunControls(props: ManagedProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const requestId = useRef(crypto.randomUUID());
  const a = props.annotation;
  const run = props.state.runs
    .filter(
      (r) => r.annotationId === a.id && r.revisionId === a.revisions.at(-1)!.id,
    )
    .at(-1);
  const action = async (callback: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await callback();
      await props.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Agent action failed');
    } finally {
      setBusy(false);
    }
  };
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
  const provider =
    props.state.sessions.find((s) => s.id === run?.sessionId)?.provider ??
    props.state.provider ??
    'codex';
  const sessionLabel =
    run &&
    `${run.sessionMode === 'new' ? 'New' : 'Existing'} ${provider} session · ${run.sessionId.slice(0, 8)}`;
  return (
    <>
      {run && (
        <>
          <div className="run-state">
            <p role="status" className="agent-working" data-tip={sessionLabel}>
              {['starting', 'working'].includes(run.status) && <Spinner />}
              {labels[run.status]}
            </p>
            {activeRun(run) && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Stop agent"
                disabled={busy}
                onClick={() =>
                  void action(() => props.request(`/runs/${run.id}/stop`, {}))
                }
              >
                <Square />
              </Button>
            )}
          </div>
          {run.sessionMode === 'existing' && <small>{sessionLabel}</small>}
          {run.events.length > 1 && (
            <details>
              <summary>Agent activity</summary>
              {run.events.map((event, i) => (
                <small key={i} className="block">
                  {event.text}
                </small>
              ))}
            </details>
          )}
          {run.interaction && (
            <div key={run.interaction.id}>
              <p>{run.interaction.text}</p>
              {run.interaction.kind === 'approval' ? (
                <div className="actions">
                  {(['accept', 'decline'] as const).map((decision) => (
                    <Button
                      key={decision}
                      variant={decision === 'accept' ? 'default' : 'secondary'}
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void action(() =>
                          props.request(`/runs/${run.id}/answer`, {
                            interactionId: run.interaction!.id,
                            decision,
                          }),
                        )
                      }
                    >
                      {decision === 'accept' ? 'Allow once' : 'Deny'}
                    </Button>
                  ))}
                </div>
              ) : (
                <>
                  {run.interaction.questions?.map((question) => (
                    <label key={question.id}>
                      {question.text}
                      <Textarea
                        maxLength={2000}
                        aria-label={question.text}
                        value={answers[question.id] ?? ''}
                        onChange={(event) =>
                          setAnswers({
                            ...answers,
                            [question.id]: event.target.value,
                          })
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter' &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            void action(() =>
                              props.request(`/runs/${run.id}/answer`, {
                                interactionId: run.interaction!.id,
                                answers,
                              }),
                            );
                          }
                        }}
                      />
                    </label>
                  ))}
                  <div className="actions">
                    <Button
                      size="icon-sm"
                      aria-label="Send answer"
                      disabled={busy}
                      onClick={() =>
                        void action(() =>
                          props.request(`/runs/${run.id}/answer`, {
                            interactionId: run.interaction!.id,
                            answers,
                          }),
                        )
                      }
                    >
                      <ArrowUp />
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
      {a.status === 'queued' && (!run || !activeRun(run)) && (
        <>
          {!props.canRun && <small>{props.hint}</small>}
          <div className="actions prompt-footer">
            <SessionSelector
              state={props.state}
              value={session}
              onChange={setSession}
            />
            <Button
              size="icon-sm"
              aria-label={run ? 'Retry agent' : 'Run agent'}
              disabled={busy || !props.canRun}
              onClick={() =>
                void action(() =>
                  props.dispatch(session || undefined, requestId.current),
                )
              }
            >
              {run ? <RotateCw /> : <ArrowUp />}
            </Button>
          </div>
        </>
      )}
      <p role="alert" className="error">
        {error}
      </p>
    </>
  );
}
export function ManagedRun(props: ManagedProps) {
  const run = props.state.runs
    .filter(
      (r) =>
        r.annotationId === props.annotation.id &&
        r.revisionId === props.annotation.revisions.at(-1)!.id,
    )
    .at(-1);
  // A terminal run starts a new submission scope. Polls and activity updates
  // retain the same request ID so uncertain dispatches remain idempotent.
  return (
    <ManagedRunControls
      key={`${props.annotation.id}:${props.annotation.revisions.at(-1)!.id}:${run?.id ?? ''}:${run?.status === 'cancelled' || run?.status === 'failed' || run?.status === 'interrupted'}`}
      {...props}
    />
  );
}
export function renderManaged(node: HTMLElement, props: ManagedProps) {
  renderView(node, <ManagedRun {...props} />);
}
