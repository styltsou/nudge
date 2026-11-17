import {
  css,
  renderPrompt,
  renderDetail,
  mountToolbar,
  renderHeader,
  renderTray,
  renderLayout,
  mountPin,
  disposeViews,
  type PromptSubmission,
} from '@usenudge/overlay';
import { commentSchema, statusLabels } from '@usenudge/shared';
import type { Annotation, SnapshotRef } from '@usenudge/shared';
import { anchorFor, findAnchor, locateAnchor, textPreview } from './anchors';
import { captureElement } from './capture';
import { BridgeClient } from './client';
import { ManagedControls } from './managed';
import { OnboardingPanel } from './onboarding';
import { applyTheme } from './theme';
export { anchorFor, findAnchor, selectorFor, textPreview } from './anchors';
export type NudgeOptions = {
  enabled?: boolean;
  bridgeUrl: string;
  token: string;
};
export type NudgeHandle = { destroy(): void };

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
/** Per-browser display preferences; storage may be unavailable. */
function readPref<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* convenience only */
  }
}
const barPositions = ['bottom', 'top', 'left', 'right'] as const;
type BarPosition = (typeof barPositions)[number];
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
  let updateDetail: (() => void) | undefined;
  let updateComposerReadiness: (() => void) | undefined;
  const host = node('div');
  host.dataset.nudgeHost = '';
  host.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  const shadow = host.attachShadow({ mode: 'open' });
  applyTheme(host);
  const style = node('style', css);
  const toolbar = node('div', undefined, 'toolbar');
  let barPosition: BarPosition = readPref(
    'nudge-toolbar-position',
    barPositions,
    'bottom',
  );
  toolbar.dataset.position = barPosition;
  toolbar.style.pointerEvents = 'auto';
  const outline = node('div', undefined, 'outline');
  const highlightBox = node('div', undefined, 'highlight-box');
  highlightBox.hidden = true;
  const pins = node('div');
  pins.setAttribute('aria-label', 'Pinned comments');
  outline.hidden = true;
  const panel = node('section', undefined, 'panel');
  let panelSide = readPref(
    'nudge-panel-side',
    ['left', 'right'] as const,
    'right',
  );
  panel.dataset.side = panelSide;
  panel.style.pointerEvents = 'auto';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Nudge feedback');
  const live = node('span');
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText =
    'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  shadow.append(style, outline, highlightBox, pins, panel, toolbar, live);
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
    const side = target.closest<HTMLElement>('.toolbar')?.dataset.position;
    const midY = Math.max(
      6,
      Math.min(innerHeight - t.height - 6, r.top + r.height / 2 - t.height / 2),
    );
    const left = Math.max(
      6,
      Math.min(innerWidth - t.width - 6, r.left + r.width / 2 - t.width / 2),
    );
    if (side === 'left' || side === 'right') {
      tip.style.left =
        (side === 'left' ? r.right + 8 : r.left - t.width - 8) + 'px';
      tip.style.top = midY + 'px';
    } else {
      const above = side !== 'top' && r.top - t.height - 8 >= 4;
      tip.style.left = left + 'px';
      tip.style.top = (above ? r.top - t.height - 8 : r.bottom + 8) + 'px';
    }
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
  const pinViews = new Map<string, ReturnType<typeof mountPin>>();
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
  const toolbarView = mountToolbar(toolbar, {
    annotate: () => setActive(!active),
    pageWide: () => {
      setActive(false);
      docked = false;
      selected = document.body;
      showComposer();
    },
    feedback: () => {
      setActive(false);
      if (view === 'tray') closePanel();
      else showTray();
    },
    setup: () => onboarding.open(),
    layout: () => togglePopover(),
    collapse: () => {
      collapsed = !collapsed;
      clearTimeout(hideTimer);
      revealed = false;
      ignoreHover = collapsed;
      applyCollapsed();
    },
  });
  const {
    toggle,
    tray,
    setup: setupButton,
    layout: layoutButton,
  } = toolbarView.refs;
  function updateTrayCount() {
    const open = annotations.filter(
      (a) =>
        a.anchor.pageUrl === `${location.origin}${location.pathname}` &&
        !a.archivedAt &&
        a.status !== 'accepted',
    );
    toolbarView.update({
      count: open.length,
      review: open.filter((a) => a.status === 'ready_for_review').length,
    });
  }
  function setConnection(text: string, on: boolean) {
    toolbarView.update({ connected: on, connection: text });
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
    setPush(sidebar && window.innerWidth >= 720 ? SIDEBAR_WIDTH : 0);
    schedule();
  }
  // The page slides with the panel: a temporary margin-right transition on the
  // root, using the same curve and duration. Both inline values are saved and
  // restored exactly once the page is back.
  const DRAWER_MS = 260;
  const reducedMotion = () =>
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
  let savedTransition: [string, string] | undefined;
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  const restoreInline = (name: string, saved: [string, string]) => {
    if (saved[0]) pageRoot.style.setProperty(name, saved[0], saved[1]);
    else pageRoot.style.removeProperty(name);
  };
  let pushedProp: string | undefined;
  function setPush(push: number, animate = !reducedMotion()) {
    const prop = panelSide === 'left' ? 'margin-left' : 'margin-right';
    host.style.setProperty('--nudge-push', push + 'px');
    host.style.setProperty(
      '--nudge-push-left',
      panelSide === 'left' ? push + 'px' : '0px',
    );
    host.style.setProperty(
      '--nudge-push-right',
      panelSide === 'right' ? push + 'px' : '0px',
    );
    if (!push && !savedMargin) return;
    clearTimeout(restoreTimer);
    // Side switched while pushed: put the old side back at once.
    if (savedMargin && pushedProp && pushedProp !== prop) {
      restoreInline(pushedProp, savedMargin);
      if (savedTransition) restoreInline('transition', savedTransition);
      savedMargin = savedTransition = pushedProp = undefined;
      if (!push) return;
    }
    if (!savedMargin) {
      pushedProp = prop;
      savedMargin = [
        pageRoot.style.getPropertyValue(prop),
        pageRoot.style.getPropertyPriority(prop),
      ];
      savedTransition = [
        pageRoot.style.getPropertyValue('transition'),
        pageRoot.style.getPropertyPriority('transition'),
      ];
    }
    if (animate)
      pageRoot.style.setProperty(
        'transition',
        `${prop} ${DRAWER_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        'important',
      );
    else if (savedTransition) restoreInline('transition', savedTransition);
    if (push) {
      pageRoot.style.setProperty(prop, push + 'px', 'important');
      return;
    }
    restoreInline(prop, savedMargin);
    const finish = () => {
      if (savedTransition) restoreInline('transition', savedTransition);
      savedMargin = savedTransition = pushedProp = undefined;
    };
    if (animate) restoreTimer = setTimeout(finish, DRAWER_MS);
    else finish();
  }
  // The bar always starts open; hiding lasts until the page reloads.
  let collapsed = false;
  try {
    localStorage.removeItem('nudge-toolbar-hidden'); // older builds saved it
  } catch {
    /* storage may be unavailable */
  }
  // Astro-style hiding: the bar slides away at once, even under the cursor, and
  // peeks back when the pointer returns to the bottom edge after leaving it.
  let revealed = false;
  let ignoreHover = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
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
    if (!destroyed) toolbarView.update({ collapsed, active });
  }
  layoutButton.setAttribute('aria-expanded', 'false');
  const popover = node('div', undefined, 'popover');
  popover.hidden = true;
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Layout and theme');
  renderLayout(popover, {
    position: barPosition,
    side: panelSide,
    theme: readPref(
      'nudge-theme',
      ['system', 'light', 'dark'] as const,
      'system',
    ),
    onPosition: (value) => {
      barPosition = value;
      toolbar.dataset.position = value;
      writePref('nudge-toolbar-position', value);
      requestAnimationFrame(placePopover);
      schedule();
    },
    onSide: (value) => {
      panelSide = value;
      panel.dataset.side = value;
      writePref('nudge-panel-side', value);
      syncSidebar();
    },
    onTheme: (value) => {
      writePref('nudge-theme', value);
      applyTheme(host, value);
    },
  });
  shadow.append(popover);
  /** Opens beside the toolbar, toward the page, growing from its button. */
  function placePopover() {
    if (popover.hidden) return;
    const r = layoutButton.getBoundingClientRect();
    const p = popover.getBoundingClientRect();
    const clampX = (x: number) =>
      Math.max(8, Math.min(innerWidth - p.width - 8, x));
    const clampY = (y: number) =>
      Math.max(8, Math.min(innerHeight - p.height - 8, y));
    const gap = 10;
    const place = {
      bottom: [
        clampX(r.left + r.width / 2 - p.width / 2),
        r.top - p.height - gap,
        '50% 100%',
      ],
      top: [
        clampX(r.left + r.width / 2 - p.width / 2),
        r.bottom + gap,
        '50% 0%',
      ],
      left: [
        r.right + gap,
        clampY(r.top + r.height / 2 - p.height / 2),
        '0% 50%',
      ],
      right: [
        r.left - p.width - gap,
        clampY(r.top + r.height / 2 - p.height / 2),
        '100% 50%',
      ],
    }[barPosition] as [number, number, string];
    popover.style.left = place[0] + 'px';
    popover.style.top = place[1] + 'px';
    popover.style.setProperty('--origin', place[2]);
  }
  function togglePopover(open = popover.hidden) {
    popover.hidden = !open;
    layoutButton.setAttribute('aria-expanded', String(open));
    if (open) placePopover();
  }
  const closePopover = (event: Event) => {
    if (popover.hidden) return;
    const path = event.composedPath();
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Escape') return;
      togglePopover(false);
      layoutButton.focus();
      return;
    }
    if (!path.includes(popover) && !path.includes(layoutButton))
      togglePopover(false);
  };
  document.addEventListener('pointerdown', closePopover, true);
  document.addEventListener('keydown', closePopover, true);
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
    toolbarView.update({ needsSetup: !state.enabled || !state.online });
    updateComposerReadiness?.();
    updateDetail?.();
  };
  function announce(text: string) {
    live.textContent = text;
  }
  function draw() {
    frame = 0;
    drawPins();
    positionComment();
    drawHighlight();
    uncoverPins();
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
  function drawHighlight() {
    const a = annotations.find((x) => x.id === highlightId);
    const target = a && !isPageWide(a) ? targetFor(a) : null;
    for (const [id, pin] of pinButtons)
      pin.dataset.highlight = String(id === highlightId);
    highlightBox.hidden = !target;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    Object.assign(highlightBox.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
  /** Pins of other requests under the open popup step aside, not over text. */
  function uncoverPins() {
    const box =
      !panel.hidden && panel.classList.contains('pinned')
        ? panel.getBoundingClientRect()
        : null;
    for (const [id, pin] of pinButtons) {
      const r = pin.getBoundingClientRect();
      const covered =
        !!box &&
        !(view === 'detail' && id === detailId) &&
        r.left < box.right &&
        r.right > box.left &&
        r.top < box.bottom &&
        r.bottom > box.top;
      pin.dataset.covered = String(covered);
    }
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
  /** Pin numbers in creation order among this page's pinned comments (the
   *  bridge lists newest first). Shared by pins and side-panel rows. */
  function pinNumbers() {
    const here = `${location.origin}${location.pathname}`;
    return new Map(
      annotations
        .filter(
          (a) => a.anchor.pageUrl === here && !isPageWide(a) && !a.archivedAt,
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((a, i) => [a.id, i + 1]),
    );
  }
  // Request whose pin, row and element are highlighted together on hover.
  let highlightId: string | null = null;
  function setHighlight(id: string | null) {
    if (highlightId === id) return;
    highlightId = id;
    for (const row of panel.querySelectorAll<HTMLElement>('.row'))
      row.dataset.highlight = String(row.dataset.annotationId === id);
    schedule();
  }
  function drawPins() {
    const ids = new Set(annotations.map((a) => a.id));
    for (const id of pinButtons.keys()) {
      if (!ids.has(id)) {
        const pinView = pinViews.get(id);
        if (pinView) {
          disposeViews(pinView.node);
          pinView.node.remove();
          pinViews.delete(id);
        }
        pinButtons.delete(id);
        liveTargets.delete(id);
      }
    }
    const numbers = pinNumbers();
    for (const annotation of annotations) {
      const target = targetFor(annotation);
      let pin = pinButtons.get(annotation.id);
      if (!pin) {
        const pinView = mountPin({
          onClick: () => {
            setActive(false);
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
          },
          onHover: (active) => setHighlight(active ? annotation.id : null),
        });
        pin = pinView.button;
        pin.dataset.annotationId = annotation.id;
        pinButtons.set(annotation.id, pin);
        pinViews.set(annotation.id, pinView);
        pins.append(pinView.node);
      }
      const working = dotState(annotation) === 'working';
      const label = String(numbers.get(annotation.id) ?? '');
      if (
        pin.dataset.label !== label ||
        pin.dataset.working !== String(working)
      ) {
        pinViews.get(annotation.id)!.update(label, working);
      }
      pin.setAttribute(
        'aria-label',
        `Open comment: ${annotation.revisions.at(-1)!.comment}`,
      );
      const rect = target?.getBoundingClientRect();
      if (target) observer.observe(target);
      pin.hidden =
        isPageWide(annotation) ||
        !!annotation.archivedAt ||
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
    if (panel.hidden || docked || view === 'tray' || panel.dataset.closing)
      return;
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
      const pushLeft =
        parseFloat(host.style.getPropertyValue('--nudge-push-left')) || 0;
      const pushRight =
        parseFloat(host.style.getPropertyValue('--nudge-push-right')) || 0;
      const clearance = barPosition === 'bottom' ? 64 : 16;
      const top = Math.max(16, window.innerHeight - box.height - clearance);
      Object.assign(panel.style, {
        left: `${Math.max(16, pushLeft + (window.innerWidth - pushLeft - pushRight - box.width) / 2)}px`,
        top: `${top}px`,
        maxHeight: `${window.innerHeight - top - clearance}px`,
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
    if (!destroyed) toolbarView.update({ active });
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
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  function closePanel(immediate = false) {
    const slide =
      !immediate &&
      !panel.hidden &&
      panel.classList.contains('sidebar') &&
      !reducedMotion();
    docked = false;
    view = 'closed';
    if (!slide) return finishClose();
    // Exit the way it entered; inert so the leaving panel takes no clicks.
    panel.dataset.closing = 'true';
    panel.inert = true;
    setPush(0);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(finishClose, DRAWER_MS);
  }
  function finishClose() {
    clearTimeout(closeTimer);
    delete panel.dataset.closing;
    panel.inert = false;
    panel.hidden = true;
    disposeViews(panel);
    panel.replaceChildren();
    syncSidebar();
  }
  function title(text: string) {
    clearTimeout(closeTimer);
    delete panel.dataset.closing;
    panel.inert = false;
    panel.hidden = false;
    const head = node('div', undefined, 'panel-head');
    disposeViews(panel);
    panel.replaceChildren(head);
    syncSidebar();
    renderHeader(head, {
      title: text,
      tray: view === 'tray',
      docked,
      onBack: showTray,
      onRefresh: () => {
        void refresh();
      },
      onDock: () => {
        docked = !docked;
        syncSidebar();
        positionComment();
        schedule();
      },
      onClose: () => {
        setActive(false);
        closePanel();
        tray.focus();
      },
    });
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
    const prompt = node('div');
    panel.append(prompt);
    const requestId = crypto.randomUUID();
    let saved: Annotation | undefined;
    updateComposerReadiness = () => {
      if (!prompt.isConnected) return;
      renderPrompt(prompt, {
        state: managed.state,
        canRun: managed.canRun(),
        hint: managed.runHint(),
        pageWide: selected === document.body,
        onSubmit: save,
      });
    };
    updateComposerReadiness();
    async function save(submission: PromptSubmission, run: boolean) {
      const comment = commentSchema.safeParse(submission.comment);
      if (!comment.success || !selected || busy) return;
      const anchor = anchorFor(selected);
      busy = true;
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
          submission.capture &&
          !destroyed &&
          !captureAttempts.has(keyFor(annotation, 'before'))
        )
          await captureFor(annotation, 'before', target, false);
        if (destroyed) return;
        if (run)
          await managed.dispatch(annotation, submission.sessionId, requestId);
        announce(
          run
            ? 'Agent run requested.'
            : managed.state.enabled
              ? 'Saved for later. Start the agent from this comment when setup is ready.'
              : 'Saved locally. Ask your coding agent to read Nudge annotations.',
        );
        // Swap to the saved comment in the same task: clearing the selection
        // first and then awaiting would leave the box with no element to sit
        // beside for a moment, so it jumped to the top and back.
        setActive(false);
        detailId = annotation.id;
        showDetail();
        await refresh();
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
    updateTrayCount();
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
  function loadSnapshot(ref: SnapshotRef): Promise<string> {
    let pending = imageLoads.get(ref.id);
    if (!pending) {
      pending = client
        .snapshot(ref.id)
        .then((blob) => {
          if (destroyed) throw new Error('Overlay closed');
          const url = URL.createObjectURL(blob);
          imageUrls.set(ref.id, url);
          return url;
        })
        .catch((error: unknown) => {
          imageLoads.delete(ref.id);
          throw error;
        });
      imageLoads.set(ref.id, pending);
    }
    return pending;
  }
  function showTray() {
    view = 'tray';
    title('Feedback');
    const onPage = annotations.filter(
      (a) => a.anchor.pageUrl === `${location.origin}${location.pathname}`,
    );
    const archivedCount = onPage.filter((a) => a.archivedAt).length;
    const current = onPage.filter((a) => !!a.archivedAt === showArchived);
    const numbers = pinNumbers();
    const content = node('div');
    panel.append(content);
    renderTray(content, {
      items: current.map((a) => {
        const text =
          sessionTitle(a) ?? a.revisions.at(-1)!.comment.split('\n')[0]!;
        return {
          annotation: a,
          ...(numbers.has(a.id) ? { number: numbers.get(a.id)! } : {}),
          title: text,
          excerpt: excerptFor(a, text),
          time: relativeTime(a.updatedAt),
          state: dotState(a),
        };
      }),
      archivedCount,
      archived: showArchived,
      highlight: highlightId,
      onNew: () => setActive(true),
      onOpen: (id) => {
        detailId = id;
        docked = true;
        showDetail();
      },
      onHighlight: setHighlight,
      onFilter: () => {
        showArchived = !showArchived;
        showTray();
      },
      onArchive: async (a) => {
        const updated = await client.mutate(`/annotations/${a.id}/archive`, {
          expectedVersion: a.version,
          archived: !a.archivedAt,
        });
        upsert(updated);
        announce(a.archivedAt ? 'Request restored.' : 'Request archived.');
        showTray();
      },
      onDelete: async (a) => {
        await client.request(`/annotations/${a.id}/delete`, {
          expectedVersion: a.version,
        });
        annotations = annotations.filter((item) => item.id !== a.id);
        if (detailId === a.id) detailId = null;
        announce('Request deleted.');
        void refresh();
        showTray();
      },
      onError: (cause) =>
        announce(cause instanceof Error ? cause.message : 'Action failed'),
    });
  }
  let showArchived = false;
  /** Second line of a row: what the agent did or is doing, else the prompt. */
  function excerptFor(a: Annotation, title: string) {
    const latest = a.revisions.at(-1)!;
    if (latest.implementation) return latest.implementation.summary;
    const run = managed.state.runs
      .filter((r) => r.annotationId === a.id)
      .at(-1);
    if (run && dotState(a) === 'working')
      return run.events.at(-1)?.text ?? 'Working…';
    const prompt = latest.comment.replace(/\s+/g, ' ').trim();
    // Show the prompt when the title is the agent's; else the rest of it.
    return prompt !== title && !prompt.startsWith(title)
      ? prompt
      : prompt.slice(title.length).trim() || statusLabels[a.status];
  }
  function relativeTime(iso: string) {
    const seconds = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
    if (seconds < 60) return 'now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
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
    const content = node('div');
    panel.append(content);
    updateDetail = () => {
      if (!content.isConnected) return;
      const current = annotations.find((item) => item.id === detailId);
      if (!current) return;
      const latest = current.revisions.at(-1)!;
      const kind: CaptureKind | null =
        current.status === 'queued' && !latest.beforeSnapshot
          ? 'before'
          : current.status === 'ready_for_review' && !latest.afterSnapshot
            ? 'after'
            : null;
      const key = kind ? keyFor(current, kind) : '';
      renderDetail(content, {
        annotation: current,
        state: managed.state,
        managed: {
          canRun: managed.canRun(),
          hint: managed.runHint(),
          request: (path, body) => client.request(path, body),
          refresh,
          dispatch: (sessionId, requestId) =>
            managed.dispatch(current, sessionId, requestId),
        },
        openComparisons,
        loadSnapshot,
        capture: kind
          ? {
              kind,
              busy: captures.has(key),
              ...(captureErrors.has(key)
                ? { error: captureErrors.get(key)! }
                : {}),
            }
          : null,
        onCapture: (captureKind, manual) => {
          if (!manual) {
            void captureFor(current, captureKind);
            return;
          }
          setActive(true);
          manualTarget = {
            annotationId: current.id,
            revisionId: latest.id,
            kind: captureKind,
          };
          announce(
            `Select the intended element for the ${captureKind} image. This capture will be labeled Manual selection. Escape cancels.`,
          );
        },
        onAccept: () => review('accept'),
        onRevise: (submission) => review('request-changes', submission),
        onLayout: schedule,
      });
    };
    updateDetail();
    async function review(
      action: 'accept' | 'request-changes',
      submission?: PromptSubmission,
    ) {
      const current = annotations.find((item) => item.id === detailId);
      if (busy || !current) return;
      busy = true;
      try {
        const updated = await client.mutate(
          `/annotations/${current.id}/${action}`,
          {
            expectedVersion: current.version,
            ...(submission ? { comment: submission.comment } : {}),
          },
        );
        upsert(updated);
        if (
          action === 'request-changes' &&
          current.revisions.at(-1)!.beforeSnapshot
        )
          await captureFor(updated, 'before');
        if (action === 'request-changes' && managed.state.enabled)
          await managed.dispatch(updated, submission?.sessionId);
        await refresh();
        if (!destroyed) showDetail();
      } finally {
        busy = false;
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
          updateTrayCount();
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
      closePanel(true);
      setPush(0, false);
      clearTimeout(restoreTimer);
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('resize', syncSidebar);
      document.removeEventListener('pointerdown', closePopover, true);
      document.removeEventListener('keydown', closePopover, true);
      clearTimeout(hideTimer);
      clearTimeout(tipTimer);
      lifetime.abort();
      if (frame) cancelAnimationFrame(frame);
      for (const url of imageUrls.values()) URL.revokeObjectURL(url);
      document.removeEventListener('keydown', key);
      disposeViews(shadow);
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
