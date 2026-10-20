/**
 * Theme model.
 *
 * A theme is deliberately tiny: eight colours, no fonts, no radii, no shadows.
 * Everything else in the interface is derived from these eight with
 * `color-mix()` in CSS, which means a child who picks six colours in the Theme
 * Studio gets a coherent site rather than six random splotches. It also means
 * adding a theme costs about twelve lines, so the garden can grow moods as
 * cheaply as it grows games.
 *
 * `brand` and `brandSolid` are split because one colour cannot be both
 * readable text on the surface and a filled button behind white text. Light
 * moods collapse the two; dark moods have to pull them apart.
 */

export type ThemeMood = 'light' | 'dark';

export interface ThemeColors {
  /** Page background. */
  bg: string;
  /** Cards, boards, sheets. */
  surface: string;
  /** Body text. Must clear 4.5:1 against `surface`. */
  ink: string;
  /** Links, focus rings, selected cells, text-on-surface accents. */
  brand: string;
  /** Second accent: highlights, badges, the "same digit" wash. */
  accent: string;
  /** Filled brand surfaces (primary button) when it differs from `brand`. */
  brandSolid?: string;
  /** Text drawn on top of `brandSolid`. */
  brandInk?: string;
  danger: string;
  success: string;
}

export interface Theme {
  id: string;
  /** Shown to kids. Two words at most. */
  name: string;
  /** Shown to parents, one line. */
  blurb: string;
  mood: ThemeMood;
  colors: ThemeColors;
  /** Built-in themes cannot be edited or deleted in the studio. */
  builtIn: boolean;
}

const light = (colors: ThemeColors, brandInk = '#FFFFFF'): ThemeColors => ({
  ...colors,
  brandSolid: colors.brandSolid ?? colors.brand,
  brandInk,
});

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'meadow',
    name: 'Mochi Meadow',
    blurb: 'Mint grass and warm cream. The default, and the calmest.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#EEF5E9',
      surface: '#FFFFFF',
      ink: '#24382B',
      brand: '#2F7D5B',
      accent: '#E9A23B',
      danger: '#C0523F',
      success: '#3E8E5A',
    }),
  },
  {
    id: 'sunny',
    name: 'Sunny Kitchen',
    blurb: 'Butter yellow and terracotta. Feels like a warm afternoon.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#FDF3E3',
      surface: '#FFFDF7',
      ink: '#443019',
      brand: '#B4642F',
      accent: '#2F7F73',
      danger: '#B8463A',
      success: '#4C8F4A',
    }),
  },
  {
    id: 'lagoon',
    name: 'Lagoon Dive',
    blurb: 'Cool water blues with a bright finch of orange.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#E6F2F6',
      surface: '#FFFFFF',
      ink: '#16333F',
      brand: '#1C7C8C',
      accent: '#E99527',
      danger: '#BF4239',
      success: '#2F8A6B',
    }),
  },
  {
    id: 'lantern',
    name: 'Paper Lantern',
    blurb: 'Rice paper and vermilion. Quieter, a little more grown up.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#FAF0EA',
      surface: '#FFFDFB',
      ink: '#3A2A25',
      brand: '#B8432B',
      accent: '#2D6E62',
      danger: '#9C3227',
      success: '#3D7F52',
    }),
  },
  {
    id: 'night',
    name: 'Night Owl',
    blurb: 'A dim room for bedtime puzzles. Easy on tired eyes.',
    mood: 'dark',
    builtIn: true,
    colors: {
      bg: '#151A2B',
      surface: '#202741',
      ink: '#EDEFFA',
      brand: '#93C0EE',
      brandSolid: '#2E6FA8',
      brandInk: '#F4F8FF',
      accent: '#F0B95B',
      danger: '#E8837A',
      success: '#6DC59A',
    },
  },
];

export const DEFAULT_THEME_ID = 'meadow';

export const findTheme = (id: string, extra: Theme[] = []): Theme =>
  [...BUILT_IN_THEMES, ...extra].find((theme) => theme.id === id) ??
  BUILT_IN_THEMES[0];

/** Theme Studio ready-made starting points, so nobody faces a blank slate. */
export const THEME_PRESETS: Array<{ label: string; colors: ThemeColors }> = [
  {
    label: 'Mint',
    colors: light({
      bg: '#EFF6EE',
      surface: '#FFFFFF',
      ink: '#223A2C',
      brand: '#2E7D5B',
      accent: '#E4A23C',
      danger: '#BF5040',
      success: '#3C8C58',
    }),
  },
  {
    label: 'Bubblegum',
    colors: light({
      bg: '#FDEEF1',
      surface: '#FFFCFD',
      ink: '#3E2531',
      brand: '#C0476F',
      accent: '#3C8FA8',
      danger: '#B23A4E',
      success: '#4A8F65',
    }),
  },
  {
    label: 'Honey',
    colors: light({
      bg: '#FEF4DF',
      surface: '#FFFDF6',
      ink: '#40300F',
      brand: '#A96A16',
      accent: '#2F7F6B',
      danger: '#B44A32',
      success: '#4F8B3E',
    }),
  },
  {
    label: 'Deep sea',
    colors: {
      bg: '#0F1C24',
      surface: '#18303C',
      ink: '#E6F1F5',
      brand: '#8CC7D8',
      brandSolid: '#2A6E86',
      brandInk: '#F2FAFD',
      accent: '#F0B15C',
      danger: '#E8877C',
      success: '#69C4A0',
    },
  },
];
