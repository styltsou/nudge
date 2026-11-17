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
