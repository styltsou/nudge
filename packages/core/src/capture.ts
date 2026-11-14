import { MAX_SNAPSHOT_BYTES, MAX_SNAPSHOT_DIMENSION } from '@usenudge/shared';

const excluded =
  'input,textarea,select,option,iframe,video,audio,script,style,[contenteditable]:not([contenteditable="false"]),[data-nudge-private],[data-nudge-host],[hidden],[aria-hidden="true"]';
function included(element: Element): boolean {
  if (element.closest(excluded)) return false;
  const style = getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}
function safeRasterUrl(value: string): boolean {
  if (
    value.length > Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 + 24 ||
    !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value)
  )
    return false;
  try {
    const header = atob(
      value.slice(value.indexOf(',') + 1, value.indexOf(',') + 25),
    );
    return value.startsWith('data:image/png;')
      ? header.startsWith('\x89PNG\r\n\x1a\n')
      : header.startsWith('\xff\xd8\xff');
  } catch {
    return false;
  }
}

// Refuse resource-bearing captures rather than allowing the renderer to fetch remote assets.
export function checkCapture(element: Element): asserts element is HTMLElement {
  if (
    !(element instanceof HTMLElement) ||
    !element.isConnected ||
    !included(element)
  )
    throw new Error(
      'Snapshot unavailable: select a visible, non-private HTML element.',
    );
  const bounds = element.getBoundingClientRect();
  if (
    bounds.width < 1 ||
    bounds.height < 1 ||
    bounds.width > MAX_SNAPSHOT_DIMENSION ||
    bounds.height > MAX_SNAPSHOT_DIMENSION
  )
    throw new Error(
      'Snapshot unavailable: the element must be between 1 and 2048 pixels in each dimension.',
    );
  const descendants = element.querySelectorAll('*');
  if (descendants.length > 1500)
    throw new Error('Snapshot unavailable: select a smaller region.');
  for (const current of [element, ...descendants]) {
    if (!included(current)) continue;
    const source =
      (current instanceof HTMLImageElement ? current.currentSrc : null) ||
      current.getAttribute('src') ||
      current.getAttribute('href') ||
      current.getAttribute('xlink:href');
    if (current.hasAttribute('srcset'))
      throw new Error(
        'Snapshot unavailable: responsive image resources are unsupported.',
      );
    if (
      (current.matches('img,image,use,object,embed,link') &&
        source &&
        !source.startsWith('#') &&
        !safeRasterUrl(source)) ||
      current.matches('object,embed')
    )
      throw new Error(
        'Snapshot unavailable: external or unsupported image resources are present.',
      );
    for (const pseudo of [null, '::before', '::after']) {
      const style = getComputedStyle(current, pseudo);
      for (let i = 0; i < style.length; i++) {
        const value = style.getPropertyValue(style[i]!);
        for (const match of value.matchAll(
          /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
        )) {
          if (!safeRasterUrl(match[1]!.trim()))
            throw new Error(
              'Snapshot unavailable: CSS image resources are present.',
            );
        }
      }
    }
  }
}
export async function captureElement(
  element: Element,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw new Error('Snapshot cancelled.');
  checkCapture(element);
  const bounds = element.getBoundingClientRect();
  const { toPng } = await import('html-to-image');
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;
  try {
    const dataUrl = await Promise.race([
      toPng(element, {
        pixelRatio: 1,
        skipFonts: true,
        cacheBust: false,
        canvasWidth: Math.ceil(bounds.width),
        canvasHeight: Math.ceil(bounds.height),
        filter: (node) => !(node instanceof Element) || included(node),
        style: {
          animation: 'none',
          transition: 'none',
          caretColor: 'transparent',
        },
      }),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Snapshot unavailable: capture timed out.')),
          8000,
        );
      }),
      new Promise<never>((_resolve, reject) => {
        cancel = () => reject(new Error('Snapshot cancelled.'));
        signal?.addEventListener('abort', cancel, { once: true });
        if (signal?.aborted) cancel();
      }),
    ]);
    if (
      !dataUrl.startsWith('data:image/png;base64,') ||
      dataUrl.length > Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 + 22
    )
      throw new Error('Snapshot unavailable: image exceeds the 2 MiB limit.');
    return dataUrl;
  } finally {
    clearTimeout(timeout);
    if (cancel) signal?.removeEventListener('abort', cancel);
  }
}
