/** Small, inline disclosures: no floating layer that can cover the host app. */
export function closePromptDisclosures(
  scope: ParentNode,
  path: EventTarget[] = [],
) {
  for (const picker of scope.querySelectorAll<HTMLElement>(
    '.prompt-disclosure[data-open=true]',
  )) {
    if (path.includes(picker)) continue;
    const trigger = picker.querySelector<HTMLButtonElement>(':scope > button');
    const content = picker.querySelector<HTMLElement>(':scope > .prompt-menu');
    if (content) content.hidden = true;
    trigger?.setAttribute('aria-expanded', 'false');
    picker.dataset.open = 'false';
  }
}

export function promptDisclosure(trigger: HTMLButtonElement) {
  const node = document.createElement('div');
  node.className = 'prompt-disclosure';
  node.dataset.open = 'false';
  const content = document.createElement('div');
  content.className = 'prompt-menu';
  content.id = `nudge-prompt-${crypto.randomUUID()}`;
  content.hidden = true;
  trigger.type = 'button';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', content.id);
  node.append(trigger, content);
  const close = (focus = false) => {
    content.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    node.dataset.open = 'false';
    if (focus) trigger.focus({ preventScroll: true });
  };
  trigger.addEventListener('click', () => {
    const open = content.hidden;
    closePromptDisclosures(node.getRootNode() as ParentNode);
    content.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    node.dataset.open = String(open);
  });
  node.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || content.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    close(true);
  });
  return { node, trigger, content, close };
}
