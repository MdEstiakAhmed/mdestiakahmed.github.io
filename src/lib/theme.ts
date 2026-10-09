export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage blocked: theme still applies for this page view
  }
}
