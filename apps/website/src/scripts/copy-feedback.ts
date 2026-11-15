/**
 * Shared "copied" feedback: a short tooltip above the button and a copied
 * state on the button (data-copied) that resets on its own.
 */
const timers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
const tips = new WeakMap<HTMLElement, HTMLElement>();

/** Change a button's label behind a brief blur so it doesn't snap. */
export function swapText(button: HTMLElement, text: string) {
  button.dataset.swapping = 'true';
  setTimeout(() => {
    button.textContent = text;
    delete button.dataset.swapping;
  }, 120);
}

export function showCopied(
  button: HTMLElement,
  onReset?: () => void,
  ms = 3000,
) {
  clearTimeout(timers.get(button));
  tips.get(button)?.remove();
  const tip = document.createElement('span');
  tip.className = 'copy-tip';
  tip.textContent = 'Copied';
  tip.setAttribute('aria-hidden', 'true'); // the page's status region announces it
  document.body.append(tip);
  const r = button.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  tip.style.left = `${Math.max(6, r.left + r.width / 2 - t.width / 2)}px`;
  tip.style.top = `${Math.max(6, r.top - t.height - 8)}px`;
  tips.set(button, tip);
  button.dataset.copied = 'true';
  timers.set(
    button,
    setTimeout(() => {
      tip.remove();
      delete button.dataset.copied;
      onReset?.();
    }, ms),
  );
}
