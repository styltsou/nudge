import { commentSchema, statusLabels } from '@usenudge/shared';
import type { Annotation, SnapshotRef } from '@usenudge/shared';
import { anchorFor, findAnchor, locateAnchor, textPreview } from './anchors';
import { captureElement } from './capture';
import { BridgeClient } from './client';
import { ManagedControls } from './managed';
import { OnboardingPanel } from './onboarding';
import { spinner } from './spinner';
import { applyTheme } from './theme';
import { icons, iconButton, setIcon, submitOnEnter } from './icons';
export { anchorFor, findAnchor, selectorFor, textPreview } from './anchors';
export type NudgeOptions = {
  enabled?: boolean;
  bridgeUrl: string;
  token: string;
};
export type NudgeHandle = { destroy(): void };

const css = `
:host { all: initial; --bg: #101010; --surface: #181818; --raised: #242424; --line: #2a2a2a; --line-strong: #444; --ink: #ededed; --muted: #939393; --accent: #ef6b5e; --accent-ink: #000; --accent-soft: #3b1210; --accept: #3fa37a; --danger: #ffa297; font: 13px/1.45 'Public Sans Variable', 'Public Sans', system-ui, sans-serif; color: var(--ink); }
@media (prefers-color-scheme: light) { :host(:not([data-theme=dark])) { --bg: #fff; --surface: #f7f8fa; --raised: #f4f4f4; --line: #e6e8eb; --line-strong: #c5c5c5; --ink: #15171a; --muted: #626a73; --accent: #e05246; --accent-ink: #fff; --accent-soft: #fff5f3; --accept: #217454; --danger: #a8322b; } }
:host([data-theme=light]) { --bg: #fff; --surface: #f7f8fa; --raised: #f4f4f4; --line: #e6e8eb; --line-strong: #c5c5c5; --ink: #15171a; --muted: #626a73; --accent: #e05246; --accent-ink: #fff; --accent-soft: #fff5f3; --accept: #217454; --danger: #a8322b; }
* { scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent; }
@supports selector(::-webkit-scrollbar) { * { scrollbar-width: auto; scrollbar-color: auto; } ::-webkit-scrollbar { width: 8px; height: 8px; background: transparent; } ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; } ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; } ::-webkit-scrollbar-thumb:hover { background-color: var(--muted); } ::-webkit-scrollbar-button { display: none; width: 0; height: 0; } }
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
button svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
button:not(.icon) svg { width: 14px; height: 14px; stroke-width: 2.2; }
button.icon.primary { color: var(--accent-ink); background: var(--accent); border-color: var(--accent); }
button.icon.primary:hover { color: var(--accent-ink); background: var(--accent); filter: brightness(1.08); }
button.icon.primary svg { stroke-width: 2.2; }
.badge { position: absolute; top: 1px; right: 0; min-width: 15px; height: 15px; padding: 0 4px; border-radius: 999px; font-size: 10px; line-height: 15px; font-weight: 700; background: var(--accent); color: var(--accent-ink); pointer-events: none; }
.badge:empty { display: none; }
.toolbar button.icon { position: relative; }
.toolbar { position: fixed; left: calc((100% - var(--nudge-push, 0px)) / 2); bottom: 12px; transform: translateX(-50%); display: flex; align-items: center; gap: 2px; padding: 4px; background: var(--bg); border: 1px solid var(--line); border-radius: 999px; box-shadow: 0 6px 24px #0004; transition: transform .18s cubic-bezier(.23,1,.32,1); }
.toolbar button.icon { border-radius: 999px; }
.toolbar::before { content: ''; position: absolute; left: 0; right: 0; top: -16px; height: 16px; }
.toolbar[data-collapsed=true] { transform: translate(-50%, calc(100% + 6px)); }
.toolbar[data-collapsed=true]::before { top: -22px; height: 22px; }
.toolbar[data-collapsed=true][data-revealed=true], .toolbar[data-collapsed=true]:has(:focus-visible) { transform: translateX(-50%); }
.sep { width: 1px; height: 18px; margin-inline: 3px; background: var(--line); }
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
.dot[data-state=review] { background: var(--accent); }
.dot[data-state=accepted] { background: var(--accept); }
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
.spinner { flex: none; display: inline-grid; grid-template-columns: repeat(3, 3px); grid-auto-rows: 3px; gap: 1.5px; vertical-align: middle; }
.spinner span { background: var(--accent); border-radius: .5px; opacity: .15; animation: nudge-grid 1s ease-in-out infinite; }
@keyframes nudge-grid { 0%, 100% { opacity: .15; } 40% { opacity: 1; } }
.agent-working { display: flex; align-items: center; gap: 8px; }
.run-state { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; } .run-state p { margin: 0; flex: 1; }
@media (max-width: 520px) { .panel:not(.sidebar) { right: 8px; left: 8px !important; width: auto; bottom: 60px; max-height: calc(100vh - 80px); } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } .toolbar, button { transition: none; } .spinner span, .dot { animation: none !important; } .spinner span { opacity: .7; } }
.onboarding { pointer-events: auto; position: fixed; margin: auto; width: min(420px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 14px; padding: 18px; box-shadow: 0 16px 64px #0006; }
.onboarding::backdrop { background: #0007; }
.setup-checks { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; margin: 12px 0; font-size: 12px; } .setup-checks dt { color: var(--muted); } .setup-checks dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
.setup-agents p { margin: 4px 0; font-size: 12px; }
.setup-command { display: block; user-select: text; white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; margin: 8px 0; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; font: 12px/1.6 ui-monospace, 'Cascadia Code', monospace; }
button[data-needs-setup=true] { color: var(--accent); }
.setup-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; position: sticky; top: 0; background: var(--bg); padding-block: 2px; z-index: 1; } .setup-heading h2 { margin: 0; font-size: 15px; }
.tip { position: fixed; z-index: 3; max-width: 260px; padding: 5px 8px; border-radius: 7px; background: var(--ink); color: var(--bg); font-size: 11px; line-height: 1.35; font-weight: 500; pointer-events: none; white-space: pre-line; box-shadow: 0 4px 16px #0004; opacity: 0; transform: translateY(2px); transition: opacity .12s, transform .12s; }
.tip[data-show=true] { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .tip { transition: none; } }
.pin { display: inline-flex; align-items: center; justify-content: center; gap: 4px; }
.pin[data-working=true] { width: auto; padding: 0 6px 0 7px; border-radius: 999px 999px 999px 3px; }
.pin .spinner span { background: var(--accent-ink); }
.composer-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; } .composer-row .check { margin: 0 auto 0 0; }
.review-row { display: flex; align-items: flex-end; gap: 6px; } .review-row textarea { margin: 0; flex: 1; min-height: 34px; }
.appearance { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 10px 0 4px; font-size: 12px; color: var(--muted); }
.segmented { display: inline-flex; padding: 2px; gap: 2px; background: var(--surface); border: 1px solid var(--line); border-radius: 9px; }
.segmented button { min-height: 24px; padding: 2px 10px; border: 0; background: transparent; color: var(--muted); border-radius: 7px; }
.segmented button[aria-checked=true] { background: var(--raised); color: var(--ink); box-shadow: 0 1px 2px #0003; }
.tag { flex: none; font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--raised); color: var(--muted); }
button[data-offline=true]::after { content: ''; position: absolute; top: 5px; right: 5px; width: 7px; height: 7px; border-radius: 50%; background: var(--danger); box-shadow: 0 0 0 2px var(--bg); }
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
  applyTheme(host);
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
  // Styled tooltips for anything with data-tip (replaces native titles).
  const tip = node('div', '', 'tip');
  tip.setAttribute('aria-hidden', 'true');
  shadow.append(tip);
  let tipFor: HTMLElement | null = null;
  let tipTimer: ReturnType<typeof setTimeout> | undefined;
  let tipWarmUntil = 0;
  function showTip(target: HTMLElement) {
    const text = target.dataset.tip;
    if (!text) return;
    tip.textContent = text;
    const r = target.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const above = r.top - t.height - 8 >= 4;
    const left = Math.max(
      6,
      Math.min(innerWidth - t.width - 6, r.left + r.width / 2 - t.width / 2),
    );
    tip.style.left = left + 'px';
    tip.style.top = (above ? r.top - t.height - 8 : r.bottom + 8) + 'px';
    tip.dataset.show = 'true';
  }
  function hideTip() {
    clearTimeout(tipTimer);
    if (tip.dataset.show === 'true') tipWarmUntil = Date.now() + 400;
    tip.dataset.show = 'false';
    tipFor = null;
  }
  function tipTarget(event: Event) {
    for (const el of event.composedPath()) {
      if (el === shadow) break;
      if (el instanceof HTMLElement && el.dataset.tip) return el;
    }
    return null;
  }
  function armTip(event: Event) {
    const target = tipTarget(event);
    if (target === tipFor) return;
    hideTip();
    if (!target) return;
    tipFor = target;
    // Short delay on first hover; instant while moving between controls.
    tipTimer = setTimeout(
      () => tipFor === target && showTip(target),
      Date.now() < tipWarmUntil ? 0 : 450,
    );
  }
  shadow.addEventListener('pointerover', armTip);
  shadow.addEventListener('focusin', (event) => {
    if ((event.target as HTMLElement).matches?.(':focus-visible'))
      armTip(event);
  });
  shadow.addEventListener('pointerout', (event) => {
    const next = (event as PointerEvent).relatedTarget as Node | null;
    if (!tipFor || !next || !tipFor.contains(next)) hideTip();
  });
  shadow.addEventListener('focusout', hideTip);
  shadow.addEventListener('pointerdown', hideTip);
  let active = false;
  let selected: Element | null = null;
  let selectedAnchor: ReturnType<typeof anchorFor> | null = null;
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
  // A request about the whole page rather than one element.
  const pageWide = iconButton(icons.page, 'Request a page-wide change', () => {
    setActive(false);
    docked = false;
    selected = document.body;
    showComposer();
  });
  const tray = iconButton(icons.feedback, 'Feedback (0)', () => {
    setActive(false);
    if (view === 'tray') closePanel();
    else showTray();
  });
  const trayCount = node('span', '', 'badge');
  tray.append(trayCount);
  function setTrayCount(count: number) {
    tray.setAttribute('aria-label', `Feedback (${count})`);
    tray.dataset.tip = 'Feedback';
    trayCount.textContent = count ? String(count) : '';
  }
  // Connection state rides on the setup button (a dot only when offline)
  // instead of taking its own slot on the bar.
  function setConnection(text: string, on: boolean) {
    setupButton.dataset.offline = String(!on);
    setupButton.dataset.tip = on ? 'Agent setup' : `Agent setup · ${text}`;
    setupButton.setAttribute(
      'aria-label',
      on ? 'Agent setup' : `Agent setup (${text})`,
    );
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
    if (sidebar || panel.hidden)
      Object.assign(panel.style, { left: '', top: '', maxHeight: '' });
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
  // Astro-style hiding: the bar slides away at once, even under the cursor, and
  // peeks back when the pointer returns to the bottom edge after leaving it.
  let revealed = false;
  let ignoreHover = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  const collapse = button('', () => {
    collapsed = !collapsed;
    try {
      localStorage.setItem('nudge-toolbar-hidden', collapsed ? '1' : '0');
    } catch {
      /* per-viewer convenience only */
    }
    clearTimeout(hideTimer);
    revealed = false;
    ignoreHover = collapsed;
    applyCollapsed();
  });
  collapse.className = 'icon';
  toolbar.addEventListener('pointerenter', () => {
    clearTimeout(hideTimer);
    if (ignoreHover || !collapsed) return;
    revealed = true;
    applyCollapsed();
  });
  toolbar.addEventListener('pointerleave', () => {
    ignoreHover = false;
    if (!collapsed) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      revealed = false;
      applyCollapsed();
    }, 400);
  });
  function applyCollapsed() {
    // Stay fully visible while annotating so Exit annotation is always reachable.
    toolbar.dataset.collapsed = String(collapsed && !active);
    toolbar.dataset.revealed = String(revealed);
    setIcon(
      collapse,
      collapsed ? icons.show : icons.hide,
      collapsed ? 'Show toolbar' : 'Hide toolbar',
    );
  }
  toolbar.append(toggle, pageWide, tray, node('span', '', 'sep'), collapse);
  const setupButton = iconButton(icons.setup, 'Agent setup', () => {});
  tray.after(setupButton);
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
    // Agents rewrite components, so the pinned node is often replaced. Follow it:
    // keep the live node while it exists, otherwise adopt its replacement.
    const known = liveTargets.get(annotation.id);
    const target =
      (known?.isConnected ? known : null) ??
      locateAnchor(annotation.anchor) ??
      replacementFor(annotation);
    if (!target) return null;
    liveTargets.set(annotation.id, target);
    const rect = target.getBoundingClientRect();
    lastSpots.set(annotation.id, {
      x: rect.x + rect.width / 2 + scrollX,
      y: rect.y + rect.height / 2 + scrollY,
    });
    return target;
  }
  // Last on-page centre (document coordinates) of each pinned element.
  const lastSpots = new Map<string, { x: number; y: number }>();
  function isPageWide(a: Annotation) {
    return a.anchor.tagName === 'BODY';
  }
  function usable(element: Element | null | undefined): element is Element {
    return (
      !!element &&
      element !== document.body &&
      element !== document.documentElement &&
      !element.closest('[data-nudge-host]')
    );
  }
  /** Pin-only fallback; before/after comparison still requires findAnchor. */
  function replacementFor(annotation: Annotation): Element | null {
    const { anchor } = annotation;
    // 1. Same tag and visible text anywhere (survives inserted siblings).
    if (anchor.textPreview) {
      const same = [...document.getElementsByTagName(anchor.tagName)]
        .slice(0, 2000)
        .filter((e) => usable(e) && textPreview(e) === anchor.textPreview);
      if (same.length === 1) return same[0]!;
    }
    // 2. Same structural position and tag, even if the agent changed its text.
    try {
      const matches = anchor.selector
        ? document.querySelectorAll(anchor.selector)
        : [];
      if (matches.length === 1 && matches[0]!.tagName === anchor.tagName)
        return matches[0]!;
    } catch {
      /* stored selector no longer parses against this DOM */
    }
    // 3. Whatever now occupies the spot where it was last seen.
    const spot = lastSpots.get(annotation.id);
    if (!spot) return null;
    const x = spot.x - scrollX;
    const y = spot.y - scrollY;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
    const hit = document.elementsFromPoint(x, y).find(usable);
    if (!hit) return null;
    // Prefer an element of the original kind around the hit point.
    for (let e: Element | null = hit, depth = 0; e && depth < 4; depth++) {
      if (e.tagName === anchor.tagName && usable(e)) return e;
      e = e.parentElement;
    }
    return hit;
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
    // Number pins in creation order among this page's comments (the bridge
    // lists newest first).
    const here = `${location.origin}${location.pathname}`;
    const numbers = new Map(
      annotations
        .filter((a) => a.anchor.pageUrl === here && !isPageWide(a))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((a, i) => [a.id, i + 1]),
    );
    for (const annotation of annotations) {
      const target = targetFor(annotation);
      let pin = pinButtons.get(annotation.id);
      if (!pin) {
        pin = button('', () => {
          setActive(false);
          // Clicking the pin of the open comment toggles it closed.
          if (
            !panel.hidden &&
            view === 'detail' &&
            detailId === annotation.id
          ) {
            closePanel();
            return;
          }
          docked = false;
          detailId = annotation.id;
          showDetail();
        });
        pin.className = 'pin';
        pin.dataset.annotationId = annotation.id;
        pinButtons.set(annotation.id, pin);
        pins.append(pin);
      }
      const working = dotState(annotation) === 'working';
      const label = String(numbers.get(annotation.id) ?? '');
      if (
        pin.dataset.label !== label ||
        pin.dataset.working !== String(working)
      ) {
        pin.replaceChildren(document.createTextNode(label));
        if (working) pin.append(spinner());
        pin.dataset.label = label;
        pin.dataset.working = String(working);
      }
      pin.setAttribute(
        'aria-label',
        `Open comment: ${annotation.revisions.at(-1)!.comment}`,
      );
      const rect = target?.getBoundingClientRect();
      if (target) observer.observe(target);
      pin.hidden =
        isPageWide(annotation) ||
        !rect ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.bottom < 0 ||
        rect.top >= window.innerHeight ||
        rect.right < 0 ||
        rect.left >= window.innerWidth;
      if (rect && !pin.hidden)
        Object.assign(pin.style, {
          left: `${Math.min(window.innerWidth - pin.offsetWidth - 4, Math.max(4, rect.right - 12))}px`,
          top: `${Math.min(window.innerHeight - 32, Math.max(4, rect.top - 12))}px`,
        });
    }
  }
  function positionComment() {
    if (panel.hidden || docked || view === 'tray') return;
    const annotation = annotations.find((a) => a.id === detailId);
    if (
      view === 'composer' &&
      selected &&
      !selected.isConnected &&
      selectedAnchor
    )
      selected = locateAnchor(selectedAnchor) ?? selected;
    const target =
      view === 'composer'
        ? selected
        : annotation
          ? targetFor(annotation)
          : null;
    if (target === document.body) {
      const box = panel.getBoundingClientRect();
      const push = parseFloat(host.style.getPropertyValue('--nudge-push')) || 0;
      const top = Math.max(16, window.innerHeight - box.height - 64);
      Object.assign(panel.style, {
        left: `${Math.max(16, (window.innerWidth - push - box.width) / 2)}px`,
        top: `${top}px`,
        maxHeight: `${window.innerHeight - top - 64}px`,
      });
      panel.dataset.anchorState = 'page';
      return;
    }
    const rect = target?.getBoundingClientRect();
    // With no element at all the comment simply floats; nothing is surfaced.
    panel.dataset.anchorState = rect ? 'attached' : 'unavailable';
    const width =
      panel.getBoundingClientRect().width ||
      Math.min(400, window.innerWidth - 32);
    const height = panel.getBoundingClientRect().height;
    // The marker area to keep clear: the real pin when shown (it widens while
    // the agent works), else where the pin sits on the element's top-right.
    const pin =
      view === 'detail' && annotation
        ? pinButtons.get(annotation.id)
        : undefined;
    const marker =
      pin && !pin.hidden
        ? pin.getBoundingClientRect()
        : rect
          ? {
              left: rect.right - 12,
              right: rect.right + 10,
              top: rect.top - 12,
              bottom: rect.top + 10,
            }
          : null;
    const gap = 8;
    let left = marker
      ? marker.right + gap + width <= window.innerWidth - 16
        ? marker.right + gap
        : Math.min(rect!.left, marker.left) - gap - width
      : (window.innerWidth - width) / 2;
    left = Math.max(16, Math.min(window.innerWidth - width - 16, left));
    // Align with the marker; move up only when fewer than 220px remain below.
    let top = marker ? marker.top : 40;
    top = Math.max(
      16,
      Math.min(top, window.innerHeight - 16 - Math.min(height, 220)),
    );
    // If clamping still lands on the pin (narrow screens), drop below it.
    if (
      marker &&
      left < marker.right + gap &&
      left + width > marker.left - gap &&
      top < marker.bottom + gap &&
      top + height > marker.top - gap
    )
      top = Math.min(marker.bottom + gap, window.innerHeight - 16 - 120);
    Object.assign(panel.style, {
      left: `${left}px`,
      top: `${top}px`,
      maxHeight: `${window.innerHeight - top - 16}px`,
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
  // Temporary page-wide cursor while annotating; removed when annotation ends.
  const cursorStyle = node(
    'style',
    `html[data-nudge-annotating], html[data-nudge-annotating] * { cursor: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M3 2.5l17 7.2-7 2.2-2.4 6.9z' fill='%23e05246' stroke='%23fff' stroke-width='1.7' stroke-linejoin='round'/></svg>") 3 2, crosshair !important; }`,
  );
  function setCursor(on: boolean) {
    if (on) {
      document.head.append(cursorStyle);
      document.documentElement.setAttribute('data-nudge-annotating', '');
    } else {
      cursorStyle.remove();
      document.documentElement.removeAttribute('data-nudge-annotating');
    }
  }
  function setActive(value: boolean) {
    setCursor(value);
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
          positionComment();
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
    }
    // Place it before the first paint, once the caller has added its content.
    queueMicrotask(positionComment);
    schedule();
  }
  function showComposer() {
    if (!selected) return;
    selectedAnchor = anchorFor(selected);
    view = 'composer';
    title(
      selected === document.body ? 'Change the whole page' : 'Request a change',
    );
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
    const queue = iconButton(
      managed.state.enabled ? icons.send : icons.save,
      managed.state.enabled ? 'Run agent' : 'Queue for agent',
      () => {
        void save();
      },
      'primary',
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
    // Enter runs (or queues); falls back to saving when a run is not possible.
    submitOnEnter(input, () => {
      if (!queue.disabled) queue.click();
      else if (saveOnly && !saveOnly.disabled) saveOnly.click();
    });
    const capture = node('input');
    capture.type = 'checkbox';
    capture.id = 'nudge-capture';
    capture.setAttribute(
      'aria-label',
      'Capture before and automatically capture after',
    );
    const captureLabel = node('label', undefined, 'check');
    captureLabel.htmlFor = capture.id;
    captureLabel.dataset.tip =
      'Snapshots may contain visible sensitive information. Form values and private regions are excluded. Images stay local.';
    captureLabel.append(
      capture,
      document.createTextNode('Capture before / after'),
    );
    actions.className = 'composer-row';
    // Whole-page snapshots are large and rarely useful; offer capture per element.
    if (selected !== document.body) actions.append(captureLabel);
    if (managed.state.enabled) {
      saveOnly = iconButton(icons.save, 'Save without running', () => {
        void save(false);
      });
      actions.append(saveOnly);
    }
    actions.append(queue);
    panel.append(input);
    if (managed.state.enabled) panel.append(session.node);
    panel.append(runHint, error, actions);
    updateComposerReadiness();
    input.focus();
    async function save(run = managed.state.enabled) {
      const comment = commentSchema.safeParse(input.value);
      if (!comment.success || !selected || busy) return;
      const anchor = anchorFor(selected);
      busy = true;
      queue.disabled = true;
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
      item.dataset.tip = statusLabels[a.status];
      const state = dotState(a);
      const dot = state === 'working' ? spinner() : node('span', '', 'dot');
      dot.dataset.state = state;
      item.append(
        dot,
        node('span', sessionTitle(a) ?? comment.split('\n')[0], 'item-title'),
      );
      if (isPageWide(a)) item.append(node('span', 'Page', 'tag'));
      panel.append(item);
    }
  }
  /** The agent-generated title of this request's latest session, once known. */
  function sessionTitle(a: Annotation) {
    const run = managed.state.runs
      .filter((r) => r.annotationId === a.id)
      .at(-1);
    const session = managed.state.sessions.find((s) => s.id === run?.sessionId);
    return session?.titled ? session.title : undefined;
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
    prompt.dataset.tip = `Revision ${latest.ordinal} · ${a.anchor.pathname}`;
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
        comparison.dataset.tip =
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
      const accept = button('Accept', () => {
        void review('accept');
      });
      accept.innerHTML = icons.check; // static icon markup
      accept.append('Accept');
      const revise = iconButton(icons.send, 'Request changes', () => {
        void review('request-changes');
      });
      accept.classList.add('primary');
      revise.disabled = true;
      followup.addEventListener('input', () => {
        revise.disabled =
          busy || !commentSchema.safeParse(followup.value).success;
      });
      submitOnEnter(followup, () => {
        if (!revise.disabled) revise.click();
      });
      const reviseRow = node('div', undefined, 'review-row');
      reviseRow.append(followup, revise);
      actions.append(accept);
      panel.append(actions);
      if (managed.state.enabled) panel.append(session.node);
      panel.append(reviseRow, error);
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
      clearTimeout(hideTimer);
      clearTimeout(tipTimer);
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
