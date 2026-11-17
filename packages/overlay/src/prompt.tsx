import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, MoreHorizontal, ArrowUp, Bookmark } from 'lucide-react';
import { commentSchema } from '@usenudge/shared';
import { activeRun, type ManagedState } from '../../shared/src/runs';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Checkbox } from './components/ui/checkbox';
import {
  NativeSelect,
  NativeSelectOption,
} from './components/ui/native-select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './components/ui/collapsible';
import { renderView } from './render';

/** Inline choices deliberately stay inside the shadow root, without portals. */
export function Disclosure({
  label,
  children,
  className = '',
  caption,
  onClose,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  caption?: ReactNode;
  onClose?: (close: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  onClose?.(close);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!event.composedPath().includes(root.current!)) setOpen(false);
    };
    const other = (event: Event) => {
      if ((event as CustomEvent).detail !== root.current) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    const shadow = root.current!.getRootNode();
    shadow.addEventListener('nudge:disclosure', other);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      shadow.removeEventListener('nudge:disclosure', other);
    };
  }, [open]);
  return (
    <Collapsible
      ref={root}
      className={`prompt-disclosure ${className}`}
      open={open}
      data-open={open}
      onOpenChange={(value) => {
        if (value)
          root.current
            ?.getRootNode()
            .dispatchEvent(
              new CustomEvent('nudge:disclosure', { detail: root.current }),
            );
        setOpen(value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <CollapsibleTrigger
        render={<Button variant="ghost" size="xs" />}
        ref={trigger}
        aria-label={label}
        aria-controls={id}
        className={
          className === 'session-selector'
            ? 'session-trigger'
            : 'icon prompt-more-trigger'
        }
      >
        {caption ?? <MoreHorizontal />}
      </CollapsibleTrigger>
      <CollapsibleContent
        id={id}
        keepMounted
        hidden={!open}
        className="prompt-menu"
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SessionSelector({
  state,
  value,
  onChange,
}: {
  state: ManagedState;
  value: string;
  onChange: (value: string) => void;
}) {
  const closeRef = useRef<() => void>(() => {});
  const session = state.sessions.find((s) => s.id === value);
  const sessions = state.sessions.filter(
    (s) => s.provider === (state.provider ?? 'codex'),
  );
  const caption = session ? `Continue: ${session.title}` : 'New session';
  return (
    <Disclosure
      label={`Agent session: ${caption}`}
      className="session-selector"
      onClose={(close) => {
        closeRef.current = close;
      }}
      caption={
        <>
          <span>{caption}</span>
          <span>
            <ChevronDown />
          </span>
        </>
      }
    >
      <label>
        Agent session
        <NativeSelect
          aria-label="Agent session"
          className="w-full"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            closeRef.current();
          }}
        >
          <NativeSelectOption value="">New session</NativeSelectOption>
          {sessions.map((s) => {
            const busy = state.runs.some(
              (r) => r.sessionId === s.id && activeRun(r),
            );
            return (
              <NativeSelectOption key={s.id} value={s.id} disabled={busy}>
                {s.title} · {s.provider}
                {busy ? ' · Busy' : ''}
              </NativeSelectOption>
            );
          })}
        </NativeSelect>
      </label>
      <small>
        {sessions.length
          ? 'Continue a conversation only when you need its earlier context.'
          : 'No other sessions for this agent yet.'}
      </small>
    </Disclosure>
  );
}

export type PromptSubmission = {
  comment: string;
  capture: boolean;
  sessionId?: string;
};
export type PromptProps = {
  state: ManagedState;
  canRun: boolean;
  hint: string;
  pageWide?: boolean;
  followup?: boolean;
  onSubmit: (submission: PromptSubmission, run: boolean) => Promise<void>;
};
export function Prompt(props: PromptProps) {
  const [comment, setComment] = useState('');
  const [session, setSession] = useState('');
  const [capture, setCapture] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = commentSchema.safeParse(comment).success;
  const canSubmit =
    valid && !busy && (!props.state.enabled || props.canRun || props.followup);
  const save = async (run: boolean) => {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await props.onSubmit(
        { comment, capture, ...(session ? { sessionId: session } : {}) },
        run,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Unable to save request',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div
        className={`prompt-composer ${props.followup ? 'followup-composer' : ''}`}
      >
        <Textarea
          autoFocus
          maxLength={2000}
          className="prompt-input text-[13px]"
          aria-label={
            props.followup
              ? 'Follow-up request'
              : 'What should the coding agent change here?'
          }
          placeholder={
            props.followup ? 'What needs another pass?' : 'Describe the change…'
          }
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key !== 'Enter' ||
              event.shiftKey ||
              event.nativeEvent.isComposing
            )
              return;
            event.preventDefault();
            if (canSubmit) void save(props.state.enabled);
            else if (props.state.enabled && valid && !busy && !props.followup)
              void save(false);
          }}
        />
        <div className="prompt-footer">
          {props.state.enabled && (
            <SessionSelector
              state={props.state}
              value={session}
              onChange={setSession}
            />
          )}
          {!props.followup && (!props.pageWide || props.state.enabled) && (
            <Disclosure label="More options">
              {!props.pageWide && (
                <label
                  className="check"
                  data-tip="Snapshots may contain visible sensitive information. Form values and private regions are excluded. Images stay local."
                >
                  <Checkbox
                    aria-label="Capture before and automatically capture after"
                    checked={capture}
                    onCheckedChange={(checked) => setCapture(checked === true)}
                  />
                  Capture before / after
                </label>
              )}
              {props.state.enabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!valid || busy}
                  onClick={() => void save(false)}
                >
                  Save without running
                </Button>
              )}
            </Disclosure>
          )}
          <Button
            aria-label={
              props.followup
                ? 'Request changes'
                : props.state.enabled
                  ? 'Run agent'
                  : 'Queue for agent'
            }
            className="icon primary ml-auto"
            size="icon-sm"
            disabled={!canSubmit}
            onClick={() => void save(props.state.enabled)}
          >
            {props.state.enabled || props.followup ? <ArrowUp /> : <Bookmark />}
          </Button>
        </div>
      </div>
      {!props.followup && props.state.enabled && !props.canRun && (
        <small role="status" className="composer-hint">
          {props.hint}
        </small>
      )}
      <p className="error" role="alert">
        {error}
      </p>
    </>
  );
}
export function renderPrompt(node: HTMLElement, props: PromptProps) {
  renderView(node, <Prompt {...props} />);
}

export function mountSessionSelector(state: ManagedState) {
  const node = document.createElement('div');
  node.className = 'contents';
  let value = '';
  function Selector() {
    const [selected, setSelected] = useState('');
    return (
      <SessionSelector
        state={state}
        value={selected}
        onChange={(id) => {
          value = id;
          setSelected(id);
        }}
      />
    );
  }
  renderView(node, <Selector />);
  return { node, value: () => value || undefined };
}
