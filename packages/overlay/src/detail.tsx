import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import type { Annotation, SnapshotRef } from '@usenudge/shared';
import type { ManagedState } from '../../shared/src/runs';
import { Button } from './components/ui/button';
import { Separator } from './components/ui/separator';
import { ManagedRun, type ManagedProps } from './managed';
import { renderView } from './render';
import { Prompt, type PromptSubmission } from './prompt';

type Revision = Annotation['revisions'][number];
function Snapshot({
  snapshot,
  caption,
  load,
}: {
  snapshot: SnapshotRef;
  caption: string;
  load: (ref: SnapshotRef) => Promise<string>;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    void load(snapshot).then(
      (value) => {
        if (current) setUrl(value);
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [snapshot.id, load]);
  return (
    <figure>
      {!failed && (
        <img
          src={url || undefined}
          alt={`${caption} snapshot`}
          width={snapshot.width}
          height={snapshot.height}
        />
      )}
      <figcaption>
        {failed
          ? `${caption}: comparison unavailable. Refresh to retry loading.`
          : `${caption} · ${new Date(snapshot.capturedAt).toLocaleString()} · ${snapshot.integrity === 'manual' ? 'Manual selection' : snapshot.kind === 'before' ? 'Selected element capture' : 'Stable anchor capture'}`}
      </figcaption>
    </figure>
  );
}
export type DetailProps = {
  annotation: Annotation;
  state: ManagedState;
  managed: Omit<ManagedProps, 'annotation' | 'state'>;
  openComparisons: Set<string>;
  loadSnapshot: (ref: SnapshotRef) => Promise<string>;
  capture: { kind: 'before' | 'after'; busy: boolean; error?: string } | null;
  onCapture: (kind: 'before' | 'after', manual: boolean) => void;
  onAccept: () => Promise<void>;
  onRevise: (submission: PromptSubmission) => Promise<void>;
  onLayout: () => void;
};
function Evidence({
  revision,
  props,
  latest = false,
}: {
  revision: Revision;
  props: DetailProps;
  latest?: boolean;
}) {
  const [open, setOpen] = useState(props.openComparisons.has(revision.id));
  return (
    <details
      open={open}
      onToggle={(event) => {
        const value = event.currentTarget.open;
        setOpen(value);
        if (value) props.openComparisons.add(revision.id);
        else props.openComparisons.delete(revision.id);
        props.onLayout();
      }}
    >
      <summary>View comparison</summary>
      {open && (
        <div className="evidence">
          {revision.beforeSnapshot && (
            <Snapshot
              snapshot={revision.beforeSnapshot}
              caption="Before"
              load={props.loadSnapshot}
            />
          )}
          {revision.afterSnapshot && (
            <Snapshot
              snapshot={revision.afterSnapshot}
              caption="After"
              load={props.loadSnapshot}
            />
          )}
        </div>
      )}
      {latest &&
        revision.implementation &&
        (!revision.beforeSnapshot || !revision.afterSnapshot) && (
          <>
            <p>Comparison unavailable</p>
            <small>
              A before or after image is missing. You can still inspect the app
              and code and review manually.
            </small>
          </>
        )}
      {latest && props.capture && (
        <>
          {props.capture.busy && <p>Capturing {props.capture.kind}…</p>}
          {props.capture.error && (
            <p className="error">{props.capture.error}</p>
          )}
          <div className="actions">
            <Button
              variant="secondary"
              size="sm"
              disabled={props.capture.busy}
              onClick={() => props.onCapture(props.capture!.kind, false)}
            >
              Capture {props.capture.kind}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={props.capture.busy}
              onClick={() => props.onCapture(props.capture!.kind, true)}
            >
              Reselect for {props.capture.kind}
            </Button>
          </div>
        </>
      )}
    </details>
  );
}
function Detail(props: DetailProps) {
  const [full, setFull] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const a = props.annotation;
  const latest = a.revisions.at(-1)!;
  const files = latest.implementation?.changedFiles ?? [];
  return (
    <>
      <p
        className={`message prompt ${full ? 'full' : ''}`}
        data-tip={`Revision ${latest.ordinal} · ${a.anchor.pathname}`}
        onClick={() => setFull(!full)}
      >
        {latest.comment}
      </p>
      {props.state.enabled && (
        <ManagedRun {...props.managed} annotation={a} state={props.state} />
      )}
      {latest.implementation && (
        <p className="message">{latest.implementation.summary}</p>
      )}
      {files.length > 0 && (
        <details>
          <summary>Changed files ({files.length})</summary>
          {files.map((file) => (
            <small key={file} className="block">
              {file}
            </small>
          ))}
        </details>
      )}
      <Evidence revision={latest} props={props} latest />
      {a.status === 'ready_for_review' && (
        <>
          <div className="actions">
            <Button
              disabled={accepting}
              size="sm"
              className="primary"
              onClick={() => {
                setAccepting(true);
                setError('');
                void props
                  .onAccept()
                  .catch((cause: unknown) =>
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : 'Unable to review',
                    ),
                  )
                  .finally(() => setAccepting(false));
              }}
            >
              <Check />
              Accept
            </Button>
          </div>
          <Prompt
            state={props.state}
            canRun={props.managed.canRun}
            hint={props.managed.hint}
            followup
            onSubmit={(submission) => props.onRevise(submission)}
          />
        </>
      )}
      <p role="alert" className="error">
        {error}
      </p>
      {a.revisions.length > 1 && (
        <>
          <Separator />
          <h3>Revision history</h3>
          {a.revisions.slice(0, -1).map((revision) => (
            <div key={revision.id}>
              <p className="message">
                Revision {revision.ordinal}: {revision.comment}
              </p>
              {revision.implementation && (
                <p className="message">{revision.implementation.summary}</p>
              )}
              <Evidence revision={revision} props={props} />
            </div>
          ))}
        </>
      )}
    </>
  );
}
export function renderDetail(node: HTMLElement, props: DetailProps) {
  renderView(
    node,
    <Detail
      key={`${props.annotation.id}:${props.annotation.revisions.at(-1)!.id}`}
      {...props}
    />,
  );
}
