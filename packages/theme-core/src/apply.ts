/**
 * Applying a theme to the document.
 *
 * One function writes ten custom properties onto <html>. Everything else —
 * every tint, every cell state, every border — is derived from those by
 * `tokens.css`, so switching mood is a single frame of work and cannot leave
 * a component behind. `color-scheme` travels with the theme so form controls
 * and scrollbars darken with Night Owl instead of staying white.
 *
 * `data-mood` also drives the one `@property`-registered animation in the
 * product (`--pb-lift`), which is how a theme change can look like light
 * changing rather than a stylesheet being swapped.
 */

import type { Theme } from './themes';

export const THEME_VARS: Record<string, keyof Theme['colors'] | 'brandSolid' | 'brandInk'> = {
  '--pb-bg': 'bg',
  '--pb-surface': 'surface',
  '--pb-sky': 'sky',
  '--pb-ink': 'ink',
  '--pb-brand': 'brand',
  '--pb-brand-solid': 'brandSolid',
  '--pb-brand-ink': 'brandInk',
  '--pb-accent': 'accent',
  '--pb-accent-ink': 'accentInk',
  '--pb-danger': 'danger',
  '--pb-success': 'success',
};

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  const { colors } = theme;
  root.style.setProperty('--pb-bg', colors.bg);
  root.style.setProperty('--pb-surface', colors.surface);
  root.style.setProperty('--pb-sky', colors.sky);
  root.style.setProperty('--pb-ink', colors.ink);
  root.style.setProperty('--pb-brand', colors.brand);
  root.style.setProperty('--pb-brand-solid', colors.brandSolid ?? colors.brand);
  root.style.setProperty('--pb-brand-ink', colors.brandInk ?? '#ffffff');
  root.style.setProperty('--pb-accent', colors.accent);
  root.style.setProperty('--pb-accent-ink', colors.accentInk);
  root.style.setProperty('--pb-danger', colors.danger);
  root.style.setProperty('--pb-success', colors.success);
  root.style.colorScheme = theme.mood;
  root.dataset.mood = theme.mood;
  root.dataset.theme = theme.id;
  // Keeps the browser chrome on mobile in tune with the page.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg);
}
