type Theme = 'system' | 'light' | 'dark';
const key = 'nudge-theme';

function stored(): Theme {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
/** System preference by default; an explicit choice is set on the host. */
export function applyTheme(host: HTMLElement, theme: Theme = stored()) {
  if (theme === 'system') delete host.dataset.theme;
  else host.dataset.theme = theme;
}
/** Segmented System / Light / Dark control; the choice is per browser. */
export function themeControl(host: HTMLElement): HTMLElement {
  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Appearance');
  const buttons = (['system', 'light', 'dark'] as const).map((theme) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.textContent = theme[0]!.toUpperCase() + theme.slice(1);
    button.addEventListener('click', () => {
      try {
        if (theme === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, theme);
      } catch {
        /* still applies for this page */
      }
      applyTheme(host, theme);
      sync(theme);
    });
    return button;
  });
  const sync = (current: Theme) =>
    buttons.forEach((button, i) =>
      button.setAttribute(
        'aria-checked',
        String(['system', 'light', 'dark'][i] === current),
      ),
    );
  sync(stored());
  group.append(...buttons);
  return group;
}
