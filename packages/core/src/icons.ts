const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
// Static, trusted markup only; never built from annotation or agent data.
export const icons = {
  annotate: svg('<path d="M5 3l14 7-6 2-2 6z"/>'),
  exit: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  feedback: svg('<path d="M4 5h16v11H10l-5 4v-4H4z"/>'),
  setup: svg(
    '<circle cx="12" cy="12" r="8.2" stroke-width="3.2" stroke-dasharray="3.2 3.24" stroke-linecap="butt"/><circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2"/>',
  ),
  hide: svg(
    '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  ),
  show: svg(
    '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
  ),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  back: svg('<path d="M15 6l-6 6 6 6"/>'),
  dock: svg(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
  ),
  pin: svg(
    '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  ),
  refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
  send: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  save: svg('<path d="M7 4h10v16l-5-3.5L7 20z"/>'),
  page: svg(
    '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  ),
  archive: svg(
    '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/>',
  ),
  restore: svg('<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"/>'),
  trash: svg(
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  ),
  stop: svg('<rect x="7" y="7" width="10" height="10" rx="1.5"/>'),
};
export function setIcon(
  element: HTMLButtonElement,
  icon: string,
  label: string,
) {
  element.innerHTML = icon;
  element.setAttribute('aria-label', label);
  element.dataset.tip = label;
}
export function iconButton(
  icon: string,
  label: string,
  action: () => void,
  variant: 'plain' | 'primary' = 'plain',
) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = variant === 'primary' ? 'icon primary' : 'icon';
  element.addEventListener('click', action);
  setIcon(element, icon, label);
  return element;
}
/** Enter submits; Shift+Enter (or an IME composition) keeps a new line. */
export function submitOnEnter(input: HTMLTextAreaElement, submit: () => void) {
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    submit();
  });
}
