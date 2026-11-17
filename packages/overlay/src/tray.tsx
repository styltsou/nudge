import { useRef, useState } from 'react';
import { Archive, ArchiveRestore, Trash2, MousePointer2 } from 'lucide-react';
import type { Annotation } from '@usenudge/shared';
import { statusLabels } from '@usenudge/shared';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Spinner } from './managed';
import { renderView } from './render';

type TrayItem = {
  annotation: Annotation;
  number?: number;
  title: string;
  excerpt: string;
  time: string;
  state: 'working' | 'review' | 'accepted' | 'idle';
};
export type TrayProps = {
  items: TrayItem[];
  archivedCount: number;
  archived: boolean;
  highlight: string | null;
  onNew: () => void;
  onOpen: (id: string) => void;
  onHighlight: (id: string | null) => void;
  onFilter: () => void;
  onArchive: (a: Annotation) => Promise<void>;
  onDelete: (a: Annotation) => Promise<void>;
  onError: (cause: unknown) => void;
};
function Row({ item, props }: { item: TrayItem; props: TrayProps }) {
  const a = item.annotation;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = useRef<HTMLButtonElement>(null);
  const action = (callback: () => Promise<void>) => {
    setBusy(true);
    void callback()
      .catch(props.onError)
      .finally(() => setBusy(false));
  };
  return (
    <div
      className="row"
      data-annotation-id={a.id}
      data-highlight={props.highlight === a.id}
      data-archived={!!a.archivedAt}
      data-confirm={confirm}
      onPointerEnter={() => props.onHighlight(a.id)}
      onPointerLeave={() => props.onHighlight(null)}
      onFocus={() => props.onHighlight(a.id)}
      onBlur={() => props.onHighlight(null)}
    >
      <Button
        variant="ghost"
        className="item grid h-auto justify-start whitespace-normal rounded-lg"
        aria-label={`${statusLabels[a.status]} · ${a.revisions.at(-1)!.comment}`}
        onClick={() => props.onOpen(a.id)}
      >
        {item.state === 'working' ? (
          <Spinner />
        ) : (
          <span className="dot" data-state={item.state} />
        )}
        <span className="item-body">
          <span className="item-title">{item.title}</span>
          <span className="item-excerpt">{item.excerpt}</span>
        </span>
        <span className="item-meta">
          <span>{item.time}</span>
          {item.number ? (
            <span className="pin-chip">{item.number}</span>
          ) : (
            <Badge variant="secondary" className="tag">
              Page
            </Badge>
          )}
        </span>
      </Button>
      {item.state !== 'working' && (
        <div className="row-actions">
          {confirm ? (
            <div className="row-confirm">
              <span>Delete permanently?</span>
              <Button
                autoFocus
                variant="secondary"
                size="xs"
                onClick={() => {
                  setConfirm(false);
                  queueMicrotask(() => remove.current?.focus());
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="xs"
                disabled={busy}
                onClick={() => action(() => props.onDelete(a))}
              >
                Delete
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                className="icon"
                aria-label={a.archivedAt ? 'Restore' : 'Archive'}
                disabled={busy}
                onClick={() => action(() => props.onArchive(a))}
              >
                {a.archivedAt ? <ArchiveRestore /> : <Archive />}
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="icon"
                ref={remove}
                aria-label="Delete"
                onClick={() => setConfirm(true)}
              >
                <Trash2 />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
function Tray(props: TrayProps) {
  const groups = props.archived
    ? [['Archived', props.items] as const]
    : [
        [
          'Open',
          props.items.filter((i) => i.annotation.status !== 'accepted'),
        ] as const,
        [
          'Accepted',
          props.items.filter((i) => i.annotation.status === 'accepted'),
        ] as const,
      ];
  return (
    <>
      {!props.archived && (
        <Button
          variant="secondary"
          className="new-row justify-start"
          onClick={props.onNew}
        >
          <MousePointer2 />
          New request
        </Button>
      )}
      {!props.items.length && (
        <p className="empty">
          {props.archived
            ? 'Nothing archived on this page.'
            : 'Nothing here yet. Choose New request, then click the part of the page to change.'}
        </p>
      )}
      {groups.map(
        ([label, items]) =>
          items.length > 0 && (
            <div key={label}>
              <div className="group-label">{label}</div>
              {items.map((item) => (
                <Row key={item.annotation.id} item={item} props={props} />
              ))}
            </div>
          ),
      )}
      {(props.archivedCount > 0 || props.archived) && (
        <Button
          variant="link"
          size="xs"
          className="tray-filter"
          onClick={props.onFilter}
        >
          {props.archived
            ? 'Back to requests'
            : `Show archived (${props.archivedCount})`}
        </Button>
      )}
    </>
  );
}
export function renderTray(node: HTMLElement, props: TrayProps) {
  renderView(node, <Tray {...props} />);
}
