/**
 * Theme ownership for the whole site.
 *
 * The theme lives on <html> as nine custom properties, so a switch repaints
 * everything without React re-rendering a single component. This provider only
 * decides *which* theme that is: a link someone sent, a saved favourite, or
 * the meadow it ships with.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  BUILT_IN_THEMES,
  DEFAULT_THEME_ID,
  applyTheme,
  deleteCustomTheme,
  findTheme,
  getActiveThemeId,
  listCustomThemes,
  readThemeParam,
  saveCustomTheme,
  setActiveThemeId,
  type Theme,
} from '@puzzlebloom/theme-core';

interface ThemeValue {
  theme: Theme;
  builtIns: Theme[];
  customThemes: Theme[];
  /** Applies a theme for this session without saving it as the default. */
  preview: (theme: Theme) => void;
  /** Applies and remembers a theme. */
  use: (themeId: string) => void;
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

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const preview = useCallback((next: Theme) => setTheme(next), []);

  const use = useCallback(
    (themeId: string) => {
      const next = findTheme(themeId, customThemes);
      setTheme(next);
      setActiveThemeId(next.id);
    },
    [customThemes],
  );

  const save = useCallback((next: Theme) => {
    const stored = { ...next, builtIn: false };
    setCustomThemes(saveCustomTheme(stored));
    setActiveThemeId(stored.id);
    setTheme(stored);
    return stored;
  }, []);

  const remove = useCallback(
    (themeId: string) => {
      setCustomThemes(deleteCustomTheme(themeId));
      if (theme.id === themeId) {
        setTheme(findTheme(DEFAULT_THEME_ID));
        setActiveThemeId(DEFAULT_THEME_ID);
      }
    },
    [theme.id],
  );

  const reset = useCallback(() => {
    setTheme(findTheme(DEFAULT_THEME_ID));
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
      use,
      save,
      remove,
      reset,
      incoming,
      acceptIncoming,
      dismissIncoming,
    }),
    [acceptIncoming, customThemes, dismissIncoming, incoming, preview, remove, reset, save, theme, use],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
