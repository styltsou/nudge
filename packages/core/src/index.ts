import { commentSchema, statusLabels } from '@usenudge/shared';
import type { Annotation, SnapshotRef } from '@usenudge/shared';
import { anchorFor, findAnchor, locateAnchor } from './anchors';
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
:host { all: initial; --bg: #101010; --surface: #181818; --raised: #242424; --line: #2a2a2a; --line-strong: #444; --ink: #ededed; --muted: #939393; --accent: #ef6b5e; --accent-ink: #000; --accent-soft: #3b1210; --accept: #3fa37a; --danger: #ffa297; font: 13px/1.45 'Public Sans Variable', 'Public Sans', system-ui, sans-serif; color: var(--ink); }
@media (prefers-color-scheme: light) { :host { --bg: #fff; --surface: #f7f8fa; --raised: #f4f4f4; --line: #e6e8eb; --line-strong: #c5c5c5; --ink: #15171a; --muted: #626a73; --accent: #e05246; --accent-ink: #fff; --accent-soft: #fff5f3; --accept: #217454; --danger: #a8322b; } }
* { box-sizing: border-box; } [hidden] { display: none !important; }
button, textarea, select, input { font: inherit; color: inherit; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 28px; padding: 4px 10px; background: var(--raised); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; font-size: 12px; transition: background .12s, border-color .12s, color .12s; }
button:hover { border-color: var(--line-strong); } button:disabled { opacity: .45; cursor: default; }
button:focus-visible, textarea:focus-visible, select:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
button.primary:hover { filter: brightness(1.08); }
button.icon { width: 30px; height: 30px; min-height: 0; padding: 0; background: transparent; border-color: transparent; color: var(--muted); border-radius: 8px; }
button.icon:hover { color: var(--ink); background: var(--raised); }
button.icon[aria-pressed=true] { color: var(--accent-ink); background: var(--accent); }
button.icon svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.badge { position: absolute; top: 1px; right: 0; min-width: 15px; height: 15px; padding: 0 4px; border-radius: 999px; font-size: 10px; line-height: 15px; font-weight: 700; background: var(--accent); color: var(--accent-ink); pointer-events: none; }
.badge:empty { display: none; }
.toolbar button.icon { position: relative; }
.toolbar { position: fixed; left: calc((100% - var(--nudge-push, 0px)) / 2); bottom: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; padding: 4px; background: var(--bg); border: 1px solid var(--line); border-radius: 999px; box-shadow: 0 6px 24px #0004; transition: transform .18s cubic-bezier(.23,1,.32,1); }
.toolbar button.icon { border-radius: 999px; }
.toolbar::before { content: ''; position: absolute; left: 0; right: 0; top: -16px; height: 16px; }
.toolbar[data-collapsed=true] { transform: translate(-50%, calc(100% + 6px)); }
.toolbar[data-collapsed=true]::before { top: -22px; height: 22px; }
.toolbar[data-collapsed=true]:hover, .toolbar[data-collapsed=true]:has(:focus-visible) { transform: translateX(-50%); }
.sep { width: 1px; height: 18px; margin-inline: 3px; background: var(--line); }
.conn { display: inline-flex; width: 22px; justify-content: center; font-size: 0; }
.conn::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--muted); }
.conn[data-on=true]::before { background: var(--accept); }
.panel { position: fixed; bottom: 64px; right: 16px; width: min(320px, calc(100vw - 24px)); max-height: calc(100vh - 96px); overflow: auto; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 12px; box-shadow: 0 10px 40px #0005; }
.panel.pinned { bottom: auto; right: auto; max-height: calc(100vh - 32px); }
.panel.sidebar { top: 0; right: 0; bottom: 0; left: auto; width: min(var(--nudge-sidebar, 340px), 100vw); max-height: none; border-width: 0 0 0 1px; border-radius: 0; box-shadow: -8px 0 32px #0003; padding: 14px; }
.panel-head { display: flex; align-items: center; gap: 4px; margin: -2px -4px 8px 0; }
.panel-head h2 { flex: 1; min-width: 0; margin: 0; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pin { position: fixed; width: 22px; height: 22px; min-height: 0; padding: 0; font-size: 11px; font-weight: 700; border-radius: 50% 50% 50% 3px; background: var(--accent); color: var(--accent-ink); border: 2px solid #fff; pointer-events: auto; box-shadow: 0 2px 8px #0004; }
textarea { display: block; width: 100%; min-height: 72px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; margin: 0 0 8px; resize: vertical; }
textarea::placeholder { color: var(--muted); }
details { margin-block: 8px; } summary { cursor: pointer; color: var(--muted); font-size: 12px; } summary:hover { color: var(--ink); }
h2 { font-size: 13px; margin: 0 0 8px; font-weight: 600; } h3 { font-size: 12px; margin: 12px 0 4px; }
p { margin: 6px 0; overflow-wrap: anywhere; } small { color: var(--muted); font-size: 11px; }
.actions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; justify-content: flex-end; }
.outline { position: fixed; pointer-events: none; border: 2px solid var(--accent); border-radius: 4px; background: color-mix(in srgb, var(--accent) 8%, transparent); }
.item { display: flex; width: 100%; justify-content: flex-start; gap: 8px; text-align: left; margin: 0 0 4px; padding: 8px 10px; background: var(--surface); }
.item-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.dot[data-state=working] { background: var(--accent); animation: nudge-pulse 1.2s ease-in-out infinite; }
.dot[data-state=review] { background: var(--accent); }
.dot[data-state=accepted] { background: var(--accept); }
@keyframes nudge-pulse { 50% { opacity: .35; } }
.status { color: var(--muted); } .message { white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.message.full { display: block; -webkit-line-clamp: unset; }
.prompt { padding: 8px 10px; background: var(--surface); border-radius: 8px; }
.error { color: var(--danger); } .error:empty { display: none; }
hr { border: 0; border-top: 1px solid var(--line); margin: 12px 0; }
.evidence { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } figure { margin: 6px 0; min-width: 0; }
figure img { display: block; width: 100%; height: auto; background: #fff; border: 1px solid var(--line); border-radius: 6px; }
figcaption { font-size: 10px; color: var(--muted); overflow-wrap: anywhere; }
.check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); margin-bottom: 4px; } input[type=checkbox] { margin: 0; accent-color: var(--accent); }
select { display: block; width: 100%; padding: 6px 8px; margin-block: 6px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; font-size: 12px; }
label { font-size: 12px; color: var(--muted); }
.agent-working::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-right: 7px; border: 2px solid var(--line-strong); border-top-color: var(--accent); border-radius: 50%; animation: nudge-spin .8s linear infinite; vertical-align: -1px; }
.run-state { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; } .run-state p { margin: 0; flex: 1; }
@keyframes nudge-spin { to { transform: rotate(360deg); } }
@media (max-width: 520px) { .panel:not(.sidebar) { right: 8px; left: 8px !important; width: auto; bottom: 60px; max-height: calc(100vh - 80px); } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } .toolbar, button { transition: none; } .agent-working::before, .dot { animation: none !important; } }
.onboarding { pointer-events: auto; position: fixed; margin: auto; width: min(420px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 14px; padding: 18px; box-shadow: 0 16px 64px #0006; }
.onboarding::backdrop { background: #0007; }
.setup-checks { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; margin: 12px 0; font-size: 12px; } .setup-checks dt { color: var(--muted); } .setup-checks dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.setup-agents p { margin: 4px 0; font-size: 12px; }
.setup-command { display: block; user-select: text; white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; margin: 8px 0; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; font: 12px/1.6 ui-monospace, 'Cascadia Code', monospace; }
button[data-needs-setup=true] { color: var(--accent); }
.setup-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; background: var(--bg); padding-block: 2px; z-index: 1; } .setup-heading h2 { margin: 0; font-size: 15px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
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

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
// Static, trusted markup only; never built from annotation or agent data.
const icons = {
  annotate: svg('<path d="M5 3l14 7-6 2-2 6z"/>'),
  exit: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  feedback: svg('<path d="M4 5h16v11H10l-5 4v-4H4z"/>'),
  setup: svg(
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/>',
  ),
  hide: svg('<path d="M6 9l6 6 6-6"/>'),
  show: svg('<path d="M6 15l6-6 6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  dock: svg(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  ),
  pin: svg(
    '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  ),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
};
function setIcon(element: HTMLButtonElement, icon: string, label: string) {
  element.innerHTML = icon;
  element.setAttribute('aria-label', label);
  element.title = label;
}
function iconButton(icon: string, label: string, action: () => void) {
  const element = button('', action);
  element.className = 'icon';
  setIcon(element, icon, label);
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
  const toggle = iconButton(icons.annotate, 'Annotate UI', () =>
    setActive(!active),
  );
  toggle.setAttribute('aria-pressed', 'false');
  const tray = iconButton(icons.feedback, 'Feedback (0)', () => {
    setActive(false);
    if (view === 'tray') closePanel();
    else showTray();
  });
  const trayCount = node('span', '', 'badge');
  tray.append(trayCount);
  function setTrayCount(count: number) {
    tray.setAttribute('aria-label', `Feedback (${count})`);
    tray.title = 'Feedback';
    trayCount.textContent = count ? String(count) : '';
  }
  const connection = node('span', 'Connecting…', 'conn');
  function setConnection(text: string, on: boolean) {
    connection.textContent = text;
    connection.title = text;
    connection.dataset.on = String(on);
  }
  // The tray and docked comments use a full-height side panel that pushes the page
  // over via a temporary root margin; the original inline value is restored on close.
  const SIDEBAR_WIDTH = 340;
  host.style.setProperty('--nudge-sidebar', SIDEBAR_WIDTH + 'px');
  const pageRoot = document.documentElement;
  let savedMargin: [string, string] | undefined;
  function syncSidebar() {
    const sidebar = !panel.hidden && (view === 'tray' || docked);
    panel.classList.toggle('sidebar', sidebar);
    panel.classList.toggle(
      'docked',
      !panel.hidden && view !== 'tray' && docked,
    );
    panel.classList.toggle('pinned', !panel.hidden && !sidebar);
    const push = sidebar && window.innerWidth >= 720 ? SIDEBAR_WIDTH : 0;
    host.style.setProperty('--nudge-push', push + 'px');
    if (push && !savedMargin)
      savedMargin = [
        pageRoot.style.getPropertyValue('margin-right'),
        pageRoot.style.getPropertyPriority('margin-right'),
      ];
    if (push)
      pageRoot.style.setProperty('margin-right', push + 'px', 'important');
    else if (savedMargin) {
      if (savedMargin[0])
        pageRoot.style.setProperty(
          'margin-right',
          savedMargin[0],
          savedMargin[1],
        );
      else pageRoot.style.removeProperty('margin-right');
      savedMargin = undefined;
    }
    schedule();
  }
  let collapsed = false;
  try {
    collapsed = localStorage.getItem('nudge-toolbar-hidden') === '1';
  } catch {
    /* storage may be unavailable; the toolbar then starts visible */
  }
  const collapse = button('', () => {
    collapsed = !collapsed;
    try {
      localStorage.setItem('nudge-toolbar-hidden', collapsed ? '1' : '0');
    } catch {
      /* per-viewer convenience only */
    }
    applyCollapsed();
  });
  collapse.className = 'icon';
  function applyCollapsed() {
    // Stay fully visible while annotating so Exit annotation is always reachable.
    toolbar.dataset.collapsed = String(collapsed && !active);
    const label = collapsed
      ? 'Keep toolbar visible'
      : 'Hide toolbar (hover the bottom edge to reveal)';
    setIcon(collapse, collapsed ? icons.show : icons.hide, label);
  }
  toolbar.append(toggle, tray, connection, node('span', '', 'sep'), collapse);
  const setupButton = iconButton(icons.setup, 'Agent setup', () => {});
  toolbar.insertBefore(setupButton, connection);
  applyCollapsed();
  const onboarding = new OnboardingPanel(
    shadow,
    setupButton,
    refresh,
    (path, body) => client.request(path, body),
    () => {
      setActive(true);
    },
  );
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
    const located = locateAnchor(annotation.anchor);
    if (located) return located;
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
    applyCollapsed();
    setIcon(
      toggle,
      value ? icons.exit : icons.annotate,
      value ? 'Exit annotation' : 'Annotate UI',
    );
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
    syncSidebar();
  }
  function title(text: string) {
    panel.hidden = false;
    const head = node('div', undefined, 'panel-head');
    head.append(node('h2', text));
    panel.replaceChildren(head);
    syncSidebar();
    panel.style.left = '';
    panel.style.top = '';
    if (view === 'detail')
      head.prepend(iconButton(icons.back, 'Back to feedback', showTray));
    if (view === 'tray')
      head.append(
        iconButton(icons.refresh, 'Refresh', () => {
          void refresh();
        }),
        iconButton(icons.close, 'Close', () => {
          closePanel();
          tray.focus();
        }),
      );
    else {
      const dock = iconButton(
        docked ? icons.pin : icons.dock,
        docked ? 'Pin to element' : 'Open in side panel',
        () => {
          docked = !docked;
          syncSidebar();
          panel.style.left = '';
          panel.style.top = '';
          setIcon(
            dock,
            docked ? icons.pin : icons.dock,
            docked ? 'Pin to element' : 'Open in side panel',
          );
          schedule();
        },
      );
      head.append(
        dock,
        iconButton(icons.close, 'Close comment', () => {
          setActive(false);
          closePanel();
          tray.focus();
        }),
      );
      const notice = node(
        'small',
        'Element not found on this page right now.',
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
    const input = node('textarea');
    input.maxLength = 2000;
    input.id = 'nudge-comment';
    input.setAttribute(
      'aria-label',
      'What should the coding agent change here?',
    );
    input.placeholder = 'Describe the change…';
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
    const runHint = node('small');
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
      // Only explain when something blocks a run; the happy path stays quiet.
      runHint.textContent =
        managed.state.enabled && !managed.canRun() ? managed.runHint() : '';
    };
    queue.disabled = true;
    input.addEventListener('input', () => {
      updateComposerReadiness?.();
    });
    queue.classList.add('primary');
    const cancel = button('Cancel', () => {
      setActive(false);
      closePanel();
      toggle.focus();
    });
    actions.append(cancel, queue);
    const capture = node('input');
    capture.type = 'checkbox';
    capture.id = 'nudge-capture';
    capture.setAttribute(
      'aria-label',
      'Capture before and automatically capture after',
    );
    const captureLabel = node('label', undefined, 'check');
    captureLabel.htmlFor = capture.id;
    captureLabel.title =
      'Snapshots may contain visible sensitive information. Form values and private regions are excluded. Images stay local.';
    captureLabel.append(
      capture,
      document.createTextNode('Capture before / after'),
    );
    panel.append(input, captureLabel, error, actions);
    if (managed.state.enabled) {
      saveOnly = button('Save without running', () => {
        void save(false);
      });
      saveOnly.title = 'Save the comment and run the agent later';
      actions.prepend(saveOnly);
      captureLabel.before(session.node);
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
    title('Feedback');
    const current = annotations.filter(
      (a) => a.anchor.pageUrl === `${location.origin}${location.pathname}`,
    );
    if (!current.length)
      panel.append(node('small', 'No requests on this page yet.'));
    for (const a of current) {
      const comment = a.revisions.at(-1)!.comment;
      const item = button('', () => {
        detailId = a.id;
        docked = true; // opened from the side panel: stay in it
        showDetail();
      });
      item.className = 'item';
      item.setAttribute('aria-label', `${statusLabels[a.status]} · ${comment}`);
      item.title = statusLabels[a.status];
      const dot = node('span', '', 'dot');
      dot.dataset.state = dotState(a);
      item.append(dot, node('span', comment.split('\n')[0], 'item-title'));
      panel.append(item);
    }
  }
  function dotState(a: Annotation) {
    const run = managed.state.runs
      .filter((r) => r.annotationId === a.id)
      .at(-1);
    if (
      run &&
      ['queued', 'starting', 'working', 'waiting', 'stopping'].includes(
        run.status,
      )
    )
      return 'working';
    if (a.status === 'ready_for_review') return 'review';
    if (a.status === 'accepted') return 'accepted';
    return 'idle';
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
    const latest = a.revisions.at(-1)!;
    const prompt = node('p', latest.comment, 'message prompt');
    prompt.title = `Revision ${latest.ordinal} · ${a.anchor.pathname}`;
    prompt.addEventListener('click', () => prompt.classList.toggle('full'));
    panel.append(prompt);
    if (managed.state.enabled) panel.append(managed.attach(a));
    const comparison = evidence(latest);
    if (latest.implementation) {
      panel.append(node('p', latest.implementation.summary, 'message'));
      const files = latest.implementation.changedFiles ?? [];
      if (files.length) {
        const list = node('details');
        list.append(node('summary', `Changed files (${files.length})`));
        for (const file of files) list.append(node('small', file), node('br'));
        panel.append(list);
      }
      if (!latest.beforeSnapshot || !latest.afterSnapshot)
        comparison.append(
          node('p', 'Comparison unavailable'),
          node(
            'small',
            'A before or after image is missing. You can still inspect the app and code and review manually.',
          ),
        );
      else
        comparison.title =
          'Images are advisory; inspect the result before accepting.';
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
      followup.style.minHeight = '56px';
      const accept = button('Accept', () => {
        void review('accept');
      });
      const revise = button('Request changes', () => {
        void review('request-changes');
      });
      accept.classList.add('primary');
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
      panel.append(node('hr'), node('h3', 'Revision history'));
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
          setTrayCount(
            items.filter(
              (a) =>
                a.anchor.pageUrl === `${location.origin}${location.pathname}`,
            ).length,
          );
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
          setConnection('Disconnected', false);
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
  window.addEventListener('resize', syncSidebar);
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
      closePanel();
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('resize', syncSidebar);
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
      setConnection(connected ? 'Local bridge' : 'Disconnected', connected);
    if (!destroyed) onboarding.connection(value);
  });
  return handle;
}
