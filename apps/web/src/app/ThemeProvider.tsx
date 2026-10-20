/**
 * Theme ownership for the whole site.
 *
 * The theme lives on <html> as ten custom properties, so a switch repaints
 * everything without React re-rendering a single component. This provider only
 * decides *which* theme that is: a link someone sent, a saved favourite, or
 * the meadow it ships with.
 */

import {
  applyTheme,
  BUILT_IN_THEMES,
  DEFAULT_THEME_ID,
  deleteCustomTheme,
  findTheme,
  getActiveThemeId,
  listCustomThemes,
  readThemeParam,
  saveCustomTheme,
  setActiveThemeId,
  slugify,
  type Theme,
} from '@puzzlebloom/theme-core';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { withViewTransition } from './viewTransition';

interface ThemeValue {
  theme: Theme;
  builtIns: Theme[];
  customThemes: Theme[];
  /** Applies a theme for this session without saving it as the default. */
  preview: (theme: Theme) => void;
  /** Applies and remembers a theme. */
  apply: (themeId: string) => void;
  save: (theme: Theme) => Theme;
  remove: (themeId: string) => void;
  reset: () => void;
  /** A theme that arrived in the URL, ready to be kept. */
  incoming: Theme | null;
  acceptIncoming: () => void;
  dismissIncoming: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [customThemes, setCustomThemes] = useState<Theme[]>(() => listCustomThemes());
  const [incoming, setIncoming] = useState<Theme | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const shared = readThemeParam(window.location.search);
    if (shared) return shared;
    const activeId = getActiveThemeId();
    return activeId ? findTheme(activeId, listCustomThemes()) : findTheme(DEFAULT_THEME_ID);
  });

  // If the theme came from a link, keep it in state so the studio can offer it.
  useEffect(() => {
    const shared = readThemeParam(window.location.search);
    if (shared) setIncoming(shared);
  }, []);

  // Layout effect, not effect: `withViewTransition` needs the new colours to be
  // on the document before the browser snapshots it.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  /**
   * Colour-picker drags preview continuously, so `preview` must stay instant.
   * Choosing a *named* mood is a different gesture — one decision, one moment —
   * so that one gets a cross-fade and the studio's live dragging does not.
   */
  const preview = useCallback((next: Theme) => setTheme(next), []);

  const apply = useCallback(
    (themeId: string) => {
      const next = findTheme(themeId, customThemes);
      withViewTransition(() => setTheme(next));
      setActiveThemeId(next.id);
    },
    [customThemes],
  );

  /**
   * The one place that decides what a saved theme's id looks like.
   *
   * Two paths save: the studio, and "Keep it" on a shared link. Both used to
   * invent their own id, and the second one did not — so a theme that arrived
   * in a link was stored under `shared-…` forever, and the studio then treated
   * it as a draft it had never seen and saved a second copy.
   */
  const save = useCallback((next: Theme) => {
    const stored: Theme = {
      ...next,
      builtIn: false,
      id: next.id.startsWith('custom-')
        ? next.id
        : `custom-${slugify(next.name)}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setCustomThemes(saveCustomTheme(stored));
    setActiveThemeId(stored.id);
    setTheme(stored);
    return stored;
  }, []);

  const remove = useCallback(
    (themeId: string) => {
      setCustomThemes(deleteCustomTheme(themeId));
      if (theme.id === themeId) {
        withViewTransition(() => setTheme(findTheme(DEFAULT_THEME_ID)));
        setActiveThemeId(DEFAULT_THEME_ID);
      }
    },
    [theme.id],
  );

  const reset = useCallback(() => {
    withViewTransition(() => setTheme(findTheme(DEFAULT_THEME_ID)));
    setActiveThemeId(DEFAULT_THEME_ID);
  }, []);

  const acceptIncoming = useCallback(() => {
    if (!incoming) return;
    save(incoming);
    setIncoming(null);
  }, [incoming, save]);

  const dismissIncoming = useCallback(() => {
    setIncoming(null);
    if (theme.id.startsWith('shared-')) {
      const activeId = getActiveThemeId();
      setTheme(activeId ? findTheme(activeId, customThemes) : findTheme(DEFAULT_THEME_ID));
    }
  }, [customThemes, theme.id]);

  const value = useMemo<ThemeValue>(
    () => ({
      theme,
      builtIns: BUILT_IN_THEMES,
      customThemes,
      preview,
      apply,
      save,
      remove,
      reset,
      incoming,
      acceptIncoming,
      dismissIncoming,
    }),
    [acceptIncoming, apply, customThemes, dismissIncoming, incoming, preview, remove, reset, save, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
