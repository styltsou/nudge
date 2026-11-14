import type { ElementAnchor } from '@usenudge/shared';

const privateSelector =
  'input,textarea,select,option,[contenteditable]:not([contenteditable="false"]),[data-nudge-private],[hidden],[aria-hidden="true"],script,style,noscript';
function cssEscape(value: string): string {
  return Array.from(value)
    .map((char) =>
      /[a-zA-Z0-9_-]/.test(char)
        ? char
        : `\\${char.codePointAt(0)!.toString(16)} `,
    )
    .join('');
}
function safeVisible(node: Element): boolean {
  if (node.closest(privateSelector)) return false;
  for (
    let current: Element | null = node;
    current;
    current = current.parentElement
  ) {
    const style = getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    )
      return false;
  }
  return true;
}
export function textPreview(element: Element): string {
  if (!safeVisible(element)) return '';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let text = '';
  let count = 0;
  while (walker.nextNode() && count++ < 500 && text.length < 500) {
    const node = walker.currentNode;
    if (node.parentElement && safeVisible(node.parentElement))
      text += ` ${node.textContent ?? ''}`;
  }
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(
      /\b(?:bearer\s+\S+|(?:sk|pk)[_-][A-Za-z0-9_-]{12,})\b/gi,
      '[redacted token]',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}
export function selectorFor(element: Element): string | null {
  const testId = element.getAttribute('data-testid');
  if (testId && testId.length <= 160)
    return `[data-testid="${cssEscape(testId)}"]`;
  const id = element.id;
  if (
    /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(id) &&
    !/\d{5}|[a-f0-9]{8,}/i.test(id)
  )
    return `[id="${cssEscape(id)}"]`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement && parts.length < 6) {
    let part = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings: Element[] = Array.from(parent.children).filter(
        (sibling) => sibling.tagName === current!.tagName,
      );
      if (siblings.length > 1)
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parent;
  }
  const selector = parts.join(' > ');
  return selector.length <= 512 ? selector : null;
}
export function anchorFor(element: Element): ElementAnchor {
  const url = new URL(window.location.href);
  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  const rect = element.getBoundingClientRect();
  const testId = element.getAttribute('data-testid');
  const role = element.getAttribute('role');
  return {
    pageUrl: url.href,
    pathname: url.pathname,
    selector: selectorFor(element),
    tagName: element.tagName,
    ...(testId && testId.length <= 160 ? { testId } : {}),
    ...(role && role.length <= 80 ? { role } : {}),
    textPreview: textPreview(element),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}
export type AnchorResult =
  { state: 'found'; element: Element } | { state: 'missing' | 'ambiguous' };
export function findAnchor(anchor: ElementAnchor): AnchorResult {
  if (anchor.pageUrl !== `${window.location.origin}${window.location.pathname}`)
    return { state: 'missing' };
  const selector = anchor.testId
    ? `[data-testid="${cssEscape(anchor.testId)}"]`
    : anchor.selector;
  if (!selector || selector.length > 512) return { state: 'missing' };
  // Positional paths are useful agent context, but cannot prove recapture identity.
  if (
    !anchor.testId &&
    !/^\[id="[a-zA-Z][a-zA-Z0-9_-]{0,79}"\]$/.test(selector)
  )
    return { state: 'missing' };
  try {
    const matches = document.querySelectorAll(selector);
    if (matches.length > 1) return { state: 'ambiguous' };
    const element = matches[0];
    if (
      !element ||
      element.tagName !== anchor.tagName ||
      element.closest('[data-nudge-host]')
    )
      return { state: 'missing' };
    return { state: 'found', element };
  } catch {
    return { state: 'missing' };
  }
}
