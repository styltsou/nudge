import { commentSchema, statusLabels } from '@usenudge/shared';
import type { Annotation, SnapshotRef } from '@usenudge/shared';
import { anchorFor, findAnchor } from './anchors';
import { captureElement } from './capture';
import { BridgeClient } from './client';
import { ManagedControls } from './managed';
import { OnboardingPanel } from './onboarding';
export { anchorFor, findAnchor, selectorFor, textPreview } from './anchors';
export type NudgeOptions = {
  enabled?: boolean;
  bridgeUrl: string;
  token: string;
};
export type NudgeHandle = { destroy(): void };

const css = `
:host { all: initial; font: 13px/1.5 system-ui, sans-serif; color: #e5eaf0; }
* { box-sizing: border-box; } [hidden] { display: none !important; }
button,textarea { font: inherit; } button { background: #283343; border: 1px solid #536176; border-radius: 6px; padding: 8px 12px; color: inherit; cursor: pointer; }
button:hover { background: #36455b; }button:disabled { opacity: .5; cursor: wait; }button:focus-visible,textarea:focus-visible { outline: 2px solid #b4d0ff; outline-offset: 3px; }
.toolbar { position: fixed; right: 20px; bottom: 20px; display: flex; gap: 8px; padding: 8px; background: #17202d; border: 1px solid #536176; border-radius: 10px; box-shadow: 0 8px 32px #0003; }
.panel { position: fixed; bottom: 90px; right: 20px; width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 120px); overflow: auto; background: #17202d; border: 1px solid #536176; border-radius: 10px; padding: 18px; box-shadow: 0 8px 32px #0003; }
.panel.pinned { bottom: auto; right: auto; max-height: calc(100vh - 32px); }.panel.docked { top: 16px; right: 16px; bottom: 90px; max-height: none; }.pin { position: fixed; width: 28px; height: 28px; padding: 0; border-radius: 50% 50% 50% 2px; background: #6ba6ff; color: #101721; border: 2px solid #fff; pointer-events: auto; }.comment-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
textarea { display: block; width: 100%; min-height: 100px; background: #101721; border: 1px solid #536176; color: inherit; border-radius: 6px; padding: 10px; margin: 10px 0; resize: vertical; }
details { margin-block: 12px; }summary { cursor: pointer; color: #bbd3ff; }summary:focus-visible { outline: 2px solid #b4d0ff; outline-offset: 3px; }
h2 { font-size: 16px; margin: 0 0 12px; }p { margin: 8px 0; overflow-wrap: anywhere; }small { color: #b7c3d3; font-size: 11px; }.actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.outline { position: fixed; pointer-events: none; border: 2px solid #6ba6ff; border-radius: 3px; background: #6ba6ff13; }.item { display: block; width: 100%; text-align: left; margin: 8px 0; }.status { color: #bbd3ff; }.message { white-space: pre-wrap; } .error { color: #ffbdad; }hr { border: 0; border-top: 1px solid #465166; margin: 16px 0; }
.evidence { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }figure { margin: 8px 0; min-width: 0; }figure img { display: block; width: 100%; height: auto; background: #fff; border: 1px solid #536176; }figcaption { font-size: 11px; overflow-wrap: anywhere; }input[type=checkbox] { margin-right: 8px; }.toolbar small { align-self: center; }@media (max-width: 420px) { .toolbar { right: 12px; left: 12px; bottom: 12px; flex-wrap: wrap; }.panel { right: 12px; bottom: 112px; max-height: calc(100vh - 140px); } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
select { display:block; width:100%; padding:8px; margin-block:8px; color:inherit; background:#101721; border:1px solid #536176; }
.agent-working::before { content:''; display:inline-block; width:10px; height:10px; margin-right:8px; border:2px solid #536176; border-top-color:#bbd3ff; border-radius:50%; animation:nudge-spin .8s linear infinite; }
@keyframes nudge-spin { to { transform:rotate(360deg); } } @media(prefers-reduced-motion:reduce) { .agent-working::before { animation:none; } }
.onboarding { pointer-events:auto; position:fixed; margin:auto; width:min(460px,calc(100vw - 32px)); max-height:calc(100dvh - 32px); overflow:auto; color:#e5eaf0; background:#17202d; border:1px solid #536176; border-radius:12px; padding:22px; box-shadow:0 16px 64px #0005; font:13px/1.5 system-ui,sans-serif; }
.onboarding::backdrop { background:#0006; }.onboarding h3 { font-size:13px; margin:18px 0 6px; }.setup-checks { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:18px 0; }.setup-checks dt { color:#b7c3d3; }.setup-checks dd { margin:0; text-align:right; overflow-wrap:anywhere; }.setup-command { display:block; user-select:text; white-space:pre-wrap; overflow-wrap:anywhere; padding:12px; margin:10px 0; background:#101721; border:1px solid #465166; border-radius:6px; font:12px/1.6 ui-monospace,monospace; }button[data-needs-setup=true] { border-color:#bbd3ff; }
.setup-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; position:sticky; top:0; background:#17202d; padding-block:4px; z-index:1; }.setup-heading h2 { margin:0; }.setup-heading button { flex-shrink:0; font-size:12px; padding:6px 8px; }
`;
function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function button(text: string, action: () => void) {
  const element = node('button', text);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
export function mountNudge(options: NudgeOptions): NudgeHandle {
  if (!options.enabled || typeof document === 'undefined')
    return { destroy() {} };
  document
    .querySelector('[data-nudge-host]')
    ?.dispatchEvent(new Event('nudge:dispose'));
  const lifetime = new AbortController();
  const client = new BridgeClient(
    options.bridgeUrl,
    options.token,
    lifetime.signal,
  );
  const managed = new ManagedControls(client, refresh);
  let updateComposerReadiness: (() => void) | undefined;
  const host = node('div');
  host.dataset.nudgeHost = '';
  host.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = node('style', css);
  const toolbar = node('div', undefined, 'toolbar');
  toolbar.style.pointerEvents = 'auto';
  const outline = node('div', undefined, 'outline');
  const pins = node('div');
  pins.setAttribute('aria-label', 'Pinned comments');
  outline.hidden = true;
  const panel = node('section', undefined, 'panel');
  panel.style.pointerEvents = 'auto';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Nudge feedback');
  const live = node('span');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  shadow.append(style, outline, pins, panel, toolbar, live);
  document.body.append(host);
  let active = false;
  let selected: Element | null = null;
  let hovered: Element | null = null;
  let frame = 0;
  let point: { x: number; y: number } | null = null;
  let destroyed = false;
  let annotations: Annotation[] = [];
  let view: 'closed' | 'tray' | 'composer' | 'detail' = 'closed';
  let detailId: string | null = null;
  let docked = false;
  const openComparisons = new Set<string>();
  const pinButtons = new Map<string, HTMLButtonElement>();
  const liveTargets = new Map<string, Element>();
  let shownDetailVersion: number | null = null;
  let connected = false;
  let busy = false;
  type CaptureKind = 'before' | 'after';
  const captureAttempts = new Set<string>();
  const captures = new Set<string>();
  const captureErrors = new Map<string, string>();
  const imageUrls = new Map<string, string>();
  const imageLoads = new Map<string, Promise<string>>();
  let manualTarget: {
    annotationId: string;
    revisionId: string;
    kind: CaptureKind;
  } | null = null;
  const toggle = button('Annotate UI', () => setActive(!active));
  toggle.setAttribute('aria-pressed', 'false');
  const tray = button('Feedback (0)', () => {
    setActive(false);
    showTray();
  });
  const connection = node('small', 'Connecting…');
  toolbar.append(toggle, tray, connection);
  const setupButton = button('Agent setup', () => {});
  toolbar.insertBefore(setupButton, connection);
  const onboarding = new OnboardingPanel(shadow, setupButton, refresh, () => {
    setActive(true);
  });
  managed.onState = (state) => {
    onboarding.update(state);
    updateComposerReadiness?.();
  };
  function announce(text: string) {
    live.textContent = text;
  }
  function draw() {
    frame = 0;
    drawPins();
    positionComment();
    if (point && active && !selected) {
      const target = document.elementFromPoint(point.x, point.y);
      if (
        target &&
        target !== host &&
        !host.contains(target) &&
        target !== document.body &&
        target !== document.documentElement
      )
        hovered = target;
      else hovered = null;
      point = null;
    }
    const element = selected ?? hovered;
    outline.hidden = !active || !element?.isConnected;
    if (outline.hidden || !element) return;
    const rect = element.getBoundingClientRect();
    Object.assign(outline.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
  function schedule() {
    if (!frame && !destroyed) frame = requestAnimationFrame(draw);
  }
  function targetFor(annotation: Annotation): Element | null {
    if (annotation.anchor.pageUrl !== `${location.origin}${location.pathname}`)
      return null;
    const result = findAnchor(annotation.anchor);
    if (result.state === 'found') return result.element;
    const original = liveTargets.get(annotation.id);
    return original?.isConnected ? original : null;
  }
  function drawPins() {
    const ids = new Set(annotations.map((a) => a.id));
    for (const [id, pin] of pinButtons) {
      if (!ids.has(id)) {
        pin.remove();
        pinButtons.delete(id);
        liveTargets.delete(id);
      }
    }
    let number = 0;
    for (const annotation of annotations) {
      const target = targetFor(annotation);
      let pin = pinButtons.get(annotation.id);
      if (!pin) {
        pin = button('', () => {
          setActive(false);
          docked = false;
          detailId = annotation.id;
          showDetail();
        });
        pin.className = 'pin';
        pin.dataset.annotationId = annotation.id;
        pinButtons.set(annotation.id, pin);
        pins.append(pin);
      }
      pin.textContent = String(++number);
      pin.setAttribute(
        'aria-label',
        `Open comment: ${annotation.revisions.at(-1)!.comment}`,
      );
      const rect = target?.getBoundingClientRect();
      if (target) observer.observe(target);
      pin.hidden =
        !rect ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.bottom < 0 ||
        rect.top >= window.innerHeight ||
        rect.right < 0 ||
        rect.left >= window.innerWidth;
      if (rect && !pin.hidden)
        Object.assign(pin.style, {
          left: `${Math.min(window.innerWidth - 32, Math.max(4, rect.right - 12))}px`,
          top: `${Math.min(window.innerHeight - 32, Math.max(4, rect.top - 12))}px`,
        });
    }
  }
  function positionComment() {
    if (panel.hidden || docked || view === 'tray') return;
    const annotation = annotations.find((a) => a.id === detailId);
    const target =
      view === 'composer'
        ? selected
        : annotation
          ? targetFor(annotation)
          : null;
    const rect = target?.getBoundingClientRect();
    // A lost/ambiguous anchor is never replaced with another element or stale coordinates.
    panel.dataset.anchorState = rect ? 'attached' : 'unavailable';
    const notice = panel.querySelector<HTMLElement>('[data-pin-notice]');
    if (notice) notice.hidden = Boolean(rect);
    const width =
      panel.getBoundingClientRect().width ||
      Math.min(400, window.innerWidth - 32);
    const height = panel.getBoundingClientRect().height;
    const left = rect
      ? rect.right + width + 16 <= window.innerWidth
        ? rect.right + 12
        : rect.left - width - 12
      : (window.innerWidth - width) / 2;
    Object.assign(panel.style, {
      left: `${Math.max(16, Math.min(window.innerWidth - width - 16, left))}px`,
      top: `${Math.max(16, Math.min(window.innerHeight - height - 16, rect ? rect.top : 40))}px`,
    });
  }
  function move(event: PointerEvent) {
    if (!event.composedPath().includes(host)) {
      point = { x: event.clientX, y: event.clientY };
      schedule();
    } else {
      hovered = null;
      schedule();
    }
  }
  function click(event: MouseEvent) {
    if (event.composedPath().includes(host)) return;
    const target = event.target;
    if (
      !(target instanceof Element) ||
      target === document.body ||
      target === document.documentElement
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (manualTarget) {
      const manual = manualTarget;
      manualTarget = null;
      setActive(false);
      showDetail();
      const annotation = annotations.find((a) => a.id === manual.annotationId);
      if (annotation?.revisions.at(-1)?.id === manual.revisionId)
        void captureFor(annotation, manual.kind, target);
      return;
    }
    selected = target;
    hovered = null;
    observer.observe(target);
    schedule();
    showComposer();
  }
  const observer = new ResizeObserver(schedule);
  function setActive(value: boolean) {
    manualTarget = null;
    active = value;
    selected = null;
    hovered = null;
    point = null;
    outline.hidden = true;
    toggle.textContent = value ? 'Exit annotation' : 'Annotate UI';
    toggle.setAttribute('aria-pressed', String(value));
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('click', click, true);
    observer.disconnect();
    observer.observe(document.body);
    observer.observe(panel);
    if (value) {
      closePanel();
      document.addEventListener('pointermove', move, {
        capture: true,
        passive: true,
      });
      document.addEventListener('click', click, true);
      observer.observe(document.body);
      announce('Annotation mode enabled. Click an element. Escape cancels.');
    }
  }
  function closePanel() {
    docked = false;
    view = 'closed';
    panel.hidden = true;
    panel.replaceChildren();
  }
  function title(text: string) {
    panel.hidden = false;
    panel.replaceChildren(node('h2', text));
    panel.classList.toggle('pinned', view !== 'tray' && !docked);
    panel.classList.toggle('docked', view !== 'tray' && docked);
    panel.style.left = '';
    panel.style.top = '';
    if (view !== 'tray') {
      const controls = node('div', undefined, 'comment-controls');
      controls.append(
        button(docked ? 'Pin to element' : 'Open in side panel', () => {
          docked = !docked;
          panel.classList.toggle('pinned', !docked);
          panel.classList.toggle('docked', docked);
          panel.style.left = '';
          panel.style.top = '';
          const control = controls.querySelector('button');
          if (control)
            control.textContent = docked
              ? 'Pin to element'
              : 'Open in side panel';
          schedule();
        }),
        button('Close comment', () => {
          setActive(false);
          closePanel();
          tray.focus();
        }),
      );
      panel.append(controls);
      const notice = node(
        'p',
        'Element unavailable or ambiguous. The comment cannot currently be pinned to the page.',
        'error',
      );
      notice.dataset.pinNotice = '';
      notice.hidden = true;
      panel.append(notice);
    }
    schedule();
  }
  function showComposer() {
    if (!selected) return;
    view = 'composer';
    title('Request a change');
    const label = node('label', 'What should the coding agent change here?');
    const input = node('textarea');
    input.maxLength = 2000;
    input.id = 'nudge-comment';
    label.htmlFor = input.id;
    const error = node('p', '', 'error');
    error.setAttribute('role', 'alert');
    const actions = node('div', undefined, 'actions');
    const session = managed.selector();
    const requestId = crypto.randomUUID();
    let saved: Annotation | undefined;
    let saveOnly: HTMLButtonElement | undefined;
    const queue = button(
      managed.state.enabled ? 'Run agent' : 'Queue for agent',
      () => {
        void save();
      },
    );
    const runHint = node('p');
    runHint.setAttribute('role', 'status');
    updateComposerReadiness = () => {
      if (!queue.isConnected) return;
      queue.disabled =
        busy ||
        !commentSchema.safeParse(input.value).success ||
        (managed.state.enabled && !managed.canRun());
      if (saveOnly)
        saveOnly.disabled =
          busy || !commentSchema.safeParse(input.value).success;
      runHint.textContent = managed.state.enabled
        ? managed.runHint()
        : 'Save a comment now, or use Agent setup to launch agents from Nudge.';
    };
    queue.disabled = true;
    input.addEventListener('input', () => {
      updateComposerReadiness?.();
    });
    const cancel = button('Cancel', () => {
      setActive(false);
      closePanel();
      toggle.focus();
    });
    actions.append(cancel, queue);
    const capture = node('input');
    capture.type = 'checkbox';
    capture.id = 'nudge-capture';
    const captureLabel = node('label');
    captureLabel.htmlFor = capture.id;
    captureLabel.append(
      capture,
      document.createTextNode('Capture before and automatically capture after'),
    );
    panel.append(
      label,
      input,
      captureLabel,
      node(
        'p',
        'Optional snapshots may contain visible sensitive information. Form values and marked private regions are excluded. Images stay local and require human review.',
      ),
      error,
      actions,
    );
    if (managed.state.enabled) {
      saveOnly = button('Save without running', () => {
        void save(false);
      });
      actions.prepend(saveOnly);
      actions.before(session.node);
      actions.before(
        node(
          'small',
          'Your agent uses its configured permissions. Cloud-backed models receive request and project context.',
        ),
      );
    }
    actions.before(runHint);
    updateComposerReadiness();
    input.focus();
    async function save(run = managed.state.enabled) {
      const comment = commentSchema.safeParse(input.value);
      if (!comment.success || !selected || busy) return;
      const anchor = anchorFor(selected);
      busy = true;
      queue.disabled = true;
      cancel.disabled = true;
      try {
        const target = selected;
        const annotation =
          saved ??
          (await client.mutate('/annotations', {
            comment: comment.data,
            anchor,
          }));
        saved = annotation;
        liveTargets.set(annotation.id, target);
        upsert(annotation);
        if (
          capture.checked &&
          !destroyed &&
          !captureAttempts.has(keyFor(annotation, 'before'))
        )
          await captureFor(annotation, 'before', target, false);
        if (destroyed) return;
        if (run) await managed.dispatch(annotation, session.value(), requestId);
        announce(
          run
            ? 'Agent run requested.'
            : managed.state.enabled
              ? 'Saved for later. Start the agent from this comment when setup is ready.'
              : 'Saved locally. Ask your coding agent to read Nudge annotations.',
        );
        setActive(false);
        await refresh();
        detailId = annotation.id;
        showDetail();
      } catch (cause) {
        error.textContent =
          cause instanceof Error ? cause.message : 'Unable to queue annotation';
      } finally {
        busy = false;
        updateComposerReadiness?.();
        cancel.disabled = false;
      }
    }
  }
  function upsert(annotation: Annotation) {
    annotations = [
      annotation,
      ...annotations.filter((a) => a.id !== annotation.id),
    ];
    schedule();
  }
  function keyFor(annotation: Annotation, kind: CaptureKind) {
    return `${annotation.revisions.at(-1)!.id}:${kind}`;
  }
  async function captureFor(
    annotation: Annotation,
    kind: CaptureKind,
    manualElement?: Element,
    manual = true,
  ) {
    const key = keyFor(annotation, kind);
    if (captures.has(key) || destroyed) return;
    captureAttempts.add(key);
    captures.add(key);
    captureErrors.delete(key);
    if (view === 'detail' && detailId === annotation.id) showDetail();
    try {
      let element = manualElement;
      if (!element) {
        const result = findAnchor(annotation.anchor);
        if (result.state !== 'found')
          throw new Error(
            result.state === 'ambiguous'
              ? 'Ambiguous anchor. Reselect the element manually.'
              : 'Element not found. Reselect the element manually.',
          );
        element = result.element;
      }
      const dataUrl = await captureElement(element, lifetime.signal);
      if (destroyed) return;
      const latest =
        annotations.find((a) => a.id === annotation.id) ?? annotation;
      if (latest.revisions.at(-1)!.id !== annotation.revisions.at(-1)!.id)
        throw new Error('Revision changed. Refresh and retry.');
      const updated = await client.upload(annotation.id, {
        expectedVersion: latest.version,
        revisionId: latest.revisions.at(-1)!.id,
        kind,
        integrity: manualElement && manual ? 'manual' : 'captured',
        dataUrl,
      });
      if (!destroyed) upsert(updated);
    } catch (error) {
      captureErrors.set(
        key,
        error instanceof Error
          ? error.message
          : 'Snapshot unavailable. Retry or review manually.',
      );
    } finally {
      captures.delete(key);
      if (!destroyed && view === 'detail' && detailId === annotation.id)
        showDetail();
    }
  }
  function snapshotImage(ref: SnapshotRef, caption: string): HTMLElement {
    const figure = node('figure');
    const image = node('img');
    image.alt = `${caption} snapshot`;
    image.width = ref.width;
    image.height = ref.height;
    const label = node(
      'figcaption',
      `${caption} · ${new Date(ref.capturedAt).toLocaleString()} · ${ref.integrity === 'manual' ? 'Manual selection' : ref.kind === 'before' ? 'Selected element capture' : 'Stable anchor capture'}`,
    );
    figure.append(image, label);
    let pending = imageLoads.get(ref.id);
    if (!pending) {
      pending = client.snapshot(ref.id).then((blob) => {
        if (destroyed) throw new Error('Overlay closed');
        const url = URL.createObjectURL(blob);
        imageUrls.set(ref.id, url);
        return url;
      });
      imageLoads.set(ref.id, pending);
    }
    void pending
      .then((url) => {
        if (!destroyed) image.src = url;
      })
      .catch(() => {
        image.remove();
        label.textContent = `${caption}: comparison unavailable. Refresh to retry loading.`;
        imageLoads.delete(ref.id);
      });
    return figure;
  }
  function evidence(
    revision: Annotation['revisions'][number],
  ): HTMLDetailsElement {
    const section = node('details');
    section.append(node('summary', 'View comparison'));
    section.open = openComparisons.has(revision.id);
    let loaded = false;
    function load() {
      if (loaded || !section.open) return;
      loaded = true;
      const images = node('div', undefined, 'evidence');
      if (revision.beforeSnapshot)
        images.append(snapshotImage(revision.beforeSnapshot, 'Before'));
      if (revision.afterSnapshot)
        images.append(snapshotImage(revision.afterSnapshot, 'After'));
      section.append(images);
    }
    section.addEventListener('toggle', () => {
      if (section.open) openComparisons.add(revision.id);
      else openComparisons.delete(revision.id);
      load();
      schedule();
    });
    load();
    return section;
  }
  function showTray() {
    view = 'tray';
    title('Local feedback');
    panel.append(
      node('p', 'Queued feedback waits for your agent to fetch it.'),
      button('Refresh', () => {
        void refresh();
      }),
      button('Close', () => {
        closePanel();
        tray.focus();
      }),
    );
    const current = annotations.filter(
      (a) => a.anchor.pageUrl === `${location.origin}${location.pathname}`,
    );
    if (!current.length)
      panel.append(node('p', 'No annotations on this page yet.'));
    for (const a of current) {
      const item = button(
        `${statusLabels[a.status]} · ${a.revisions.at(-1)!.comment}`,
        () => {
          detailId = a.id;
          showDetail();
        },
      );
      item.className = 'item';
      panel.append(item);
    }
  }
  function showDetail() {
    const a = annotations.find((item) => item.id === detailId);
    if (!a) {
      showTray();
      return;
    }
    shownDetailVersion = a.version;
    view = 'detail';
    title(statusLabels[a.status]);
    panel.append(button('Back to feedback', showTray));
    const latest = a.revisions.at(-1)!;
    if (managed.state.enabled) panel.append(managed.attach(a));
    panel.append(
      node('p', latest.comment, 'message'),
      node('small', `Revision ${latest.ordinal} · ${a.anchor.pathname}`),
    );
    const comparison = evidence(latest);
    if (latest.implementation) {
      panel.append(
        node(
          'p',
          'Agent reported a change. Review the result before accepting.',
        ),
        node('p', latest.implementation.summary, 'message'),
      );
      for (const file of latest.implementation.changedFiles ?? [])
        panel.append(node('p', file));
      if (!latest.beforeSnapshot || !latest.afterSnapshot)
        comparison.append(
          node('p', 'Comparison unavailable'),
          node(
            'small',
            'A before or after image is missing. You can still inspect the app and code and review manually.',
          ),
        );
      else
        comparison.append(
          node(
            'p',
            'Before / after evidence. Images are advisory; inspect the result before accepting.',
          ),
        );
    }
    const kind: CaptureKind | null =
      a.status === 'queued' && !latest.beforeSnapshot
        ? 'before'
        : a.status === 'ready_for_review' && !latest.afterSnapshot
          ? 'after'
          : null;
    if (kind) {
      const key = keyFor(a, kind);
      const capturing = captures.has(key);
      if (capturing) comparison.append(node('p', `Capturing ${kind}…`));
      if (captureErrors.has(key))
        comparison.append(node('p', captureErrors.get(key), 'error'));
      comparison.append(
        node(
          'small',
          'Capturing shares visible pixels with local review. Private/form regions are excluded; external image resources may be unsupported.',
        ),
      );
      const retry = button(`Capture ${kind}`, () => {
        void captureFor(a, kind);
      });
      retry.disabled = capturing;
      const reselect = button(`Reselect for ${kind}`, () => {
        setActive(true);
        manualTarget = { annotationId: a.id, revisionId: latest.id, kind };
        announce(
          `Select the intended element for the ${kind} image. This capture will be labeled Manual selection. Escape cancels.`,
        );
      });
      reselect.disabled = capturing;
      comparison.append(retry, reselect);
    }
    panel.append(comparison);
    if (a.status === 'ready_for_review') {
      const session = managed.selector();
      const error = node('p', '', 'error');
      error.setAttribute('role', 'alert');
      const followup = node('textarea');
      followup.maxLength = 2000;
      followup.setAttribute('aria-label', 'Follow-up request');
      followup.placeholder = 'What needs another pass?';
      const actions = node('div', undefined, 'actions');
      const accept = button('Accept', () => {
        void review('accept');
      });
      const revise = button('Request changes', () => {
        void review('request-changes');
      });
      revise.disabled = true;
      followup.addEventListener('input', () => {
        revise.disabled =
          busy || !commentSchema.safeParse(followup.value).success;
      });
      actions.append(accept, revise);
      panel.append(followup, error, actions);
      if (managed.state.enabled) actions.before(session.node);
      async function review(action: 'accept' | 'request-changes') {
        if (busy) return;
        busy = true;
        accept.disabled = true;
        revise.disabled = true;
        try {
          const updated = await client.mutate(
            `/annotations/${a!.id}/${action}`,
            {
              expectedVersion: a!.version,
              ...(action === 'request-changes'
                ? { comment: followup.value }
                : {}),
            },
          );
          upsert(updated);
          if (action === 'request-changes' && latest.beforeSnapshot)
            await captureFor(updated, 'before');
          if (action === 'request-changes' && managed.state.enabled)
            await managed.dispatch(updated, session.value());
          await refresh();
        } catch (cause) {
          error.textContent =
            cause instanceof Error ? cause.message : 'Unable to review';
        } finally {
          busy = false;
          accept.disabled = false;
          revise.disabled = !commentSchema.safeParse(followup.value).success;
          if (!error.textContent && !destroyed) showDetail();
        }
      }
    }
    if (a.revisions.length > 1) {
      panel.append(node('hr'), node('h2', 'Revision history'));
      for (const revision of a.revisions.slice(0, -1)) {
        panel.append(
          node(
            'p',
            `Revision ${revision.ordinal}: ${revision.comment}`,
            'message',
          ),
        );
        if (revision.implementation)
          panel.append(node('p', revision.implementation.summary, 'message'));
        panel.append(evidence(revision));
      }
    }
  }
  let refreshing: Promise<void> | null = null;
  let refreshAgain = false;
  function refresh(): Promise<void> {
    if (refreshing) {
      refreshAgain = true;
      return refreshing;
    }
    refreshing = (async () => {
      try {
        do {
          refreshAgain = false;
          const items = await client.list();
          await managed.sync();
          if (destroyed) return;
          annotations = items;
          schedule();
          tray.textContent = `Feedback (${items.filter((a) => a.anchor.pageUrl === `${location.origin}${location.pathname}`).length})`;
          for (const annotation of items) {
            const revision = annotation.revisions.at(-1)!;
            if (
              annotation.anchor.pageUrl ===
                `${location.origin}${location.pathname}` &&
              annotation.status === 'ready_for_review' &&
              revision.beforeSnapshot &&
              !revision.afterSnapshot &&
              !captureAttempts.has(keyFor(annotation, 'after'))
            )
              void captureFor(annotation, 'after');
          }
          if (view === 'tray') showTray();
          if (
            view === 'detail' &&
            !busy &&
            annotations.find((a) => a.id === detailId)?.version !==
              shownDetailVersion
          )
            showDetail();
        } while (refreshAgain && !destroyed);
      } catch (cause) {
        if (!destroyed) {
          connection.textContent = 'Disconnected';
          announce(
            cause instanceof Error ? cause.message : 'Bridge unavailable',
          );
        }
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }
  function key(event: KeyboardEvent) {
    if (onboarding.isOpen) return;
    if (event.key === 'Escape' && (active || view !== 'closed')) {
      setActive(false);
      closePanel();
      toggle.focus();
    }
    if (
      event.key.toLowerCase() === 'a' &&
      event.altKey &&
      event.shiftKey &&
      !event.repeat &&
      !event.defaultPrevented &&
      !(
        event.target instanceof Element &&
        event.target.closest('input,textarea,[contenteditable]')
      ) &&
      !event.composedPath().includes(host)
    ) {
      event.preventDefault();
      setActive(!active);
    }
  }
  document.addEventListener('keydown', key);
  window.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', schedule);
  observer.observe(document.body);
  const mutations = new window.MutationObserver(schedule);
  mutations.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['id', 'data-testid', 'class', 'style', 'hidden'],
  });
  const handle = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      setActive(false);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      lifetime.abort();
      if (frame) cancelAnimationFrame(frame);
      for (const url of imageUrls.values()) URL.revokeObjectURL(url);
      document.removeEventListener('keydown', key);
      host.remove();
    },
  };
  host.addEventListener('nudge:dispose', handle.destroy, { once: true });
  void refresh();
  void client.events(refresh, (value) => {
    connected = value;
    if (!destroyed)
      connection.textContent = connected ? 'Local bridge' : 'Disconnected';
    if (!destroyed) onboarding.connection(value);
  });
  return handle;
}
