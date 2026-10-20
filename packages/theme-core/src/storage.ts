/**
 * Persistence for themes.
 *
 * localStorage only. There is no account system and no server, which is the
 * whole reason a parent can hand this site to a seven-year-old: nothing a
 * child does here leaves the device. Every read is defensive, because storage
 * can be disabled, full, or full of something an older version wrote.
 */

import type { Theme } from './themes';

const THEME_KEY = 'pb:themes:v1';
const ACTIVE_KEY = 'pb:theme-active:v1';

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode, or quota. A theme that fails to save is not worth an error. */
  }
};

const required = ['bg', 'surface', 'ink', 'brand', 'accent', 'danger', 'success'] as const;

const looksLikeTheme = (value: unknown): value is Theme => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Theme>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return false;
  if (!candidate.colors || typeof candidate.colors !== 'object') return false;
  return required.every((key) => typeof candidate.colors?.[key] === 'string');
};

export function listCustomThemes(): Theme[] {
  const stored = readJson<unknown[]>(THEME_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter(looksLikeTheme).map((theme) => ({ ...theme, builtIn: false }));
}

export function saveCustomTheme(theme: Theme): Theme[] {
  const others = listCustomThemes().filter((item) => item.id !== theme.id);
  const next = [{ ...theme, builtIn: false }, ...others].slice(0, 24);
  writeJson(THEME_KEY, next);
  return next;
}

export function deleteCustomTheme(id: string): Theme[] {
  const next = listCustomThemes().filter((item) => item.id !== id);
  writeJson(THEME_KEY, next);
  return next;
}

export const getActiveThemeId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
};

export const setActiveThemeId = (id: string): void => {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
};

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'my-theme';
