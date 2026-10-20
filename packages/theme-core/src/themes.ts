/**
 * Theme model.
 *
 * A theme is deliberately small: nine or ten colours, no fonts, no radii, no
 * shadows. Everything else in the interface is derived from them with
 * `color-mix()` in CSS, which means a child who picks six colours in the Theme
 * Studio gets a coherent site rather than six random splotches. It also means
 * adding a theme costs about twelve lines, so the garden can grow moods as
 * cheaply as it grows games.
 *
 * Three roles exist because one colour cannot do three jobs:
 *
 *   `brand`     readable text — links, focus rings, headings. Capped at the
 *               saturation that still clears 4.5:1 against the surface.
 *   `accent`    the loud colour. It is meant to own a quarter of the screen,
 *               which is only legal because `accentInk` gives it a label
 *               dark enough to survive on top of it.
 *   `sky`       decoration with no text on it, so its chroma has no ceiling.
 *               This is where a pale, "washed out" palette gets its colour
 *               back without breaking a single contrast pair.
 *
 * `brandSolid` / `brandInk` remain for the dark moods, where the colour you can
 * read as text and the colour you can fill a button with are not the same.
 */

export type ThemeMood = 'light' | 'dark';

export interface ThemeColors {
  /** Page background. */
  bg: string;
  /** Cards, boards, sheets. */
  surface: string;
  /** Large-area decorative wash: hero backdrop, section bands. No text sits on
   *  it directly except `ink`, so it is free to be more colourful than `bg`. */
  sky: string;
  /** Body text. Must clear 4.5:1 against `surface` and against `sky`. */
  ink: string;
  /** Links, focus rings, selected cells, text-on-surface accents. */
  brand: string;
  /** The loud colour: primary CTA fill, the day's badge, a celebration wash. */
  accent: string;
  /** Label drawn on top of `accent`. Usually the theme's own ink. */
  accentInk: string;
  /** Filled brand surfaces (primary button) when it differs from `brand`. */
  brandSolid?: string;
  /** Text drawn on top of `brandSolid`. */
  brandInk?: string;
  danger: string;
  success: string;
}

/** The six colours a person actually chooses; the rest can be derived. */
export type ColorCore = Pick<ThemeColors, 'bg' | 'surface' | 'ink' | 'brand' | 'accent'> &
  Partial<Pick<ThemeColors, 'danger' | 'success'>>;

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

/* ------------------------------------------------------------------ *
 * Derivation
 *
 * The studio offers six colour wells, not ten. `sky` and `accentInk` are
 * computed from the six, so a homemade theme lands as coherent as a built-in
 * one and nobody has to understand what a "decorative wash" is.
 * ------------------------------------------------------------------ */

const parse = (hex: string): [number, number, number] => {
  const body = hex.replace('#', '');
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

const toHex = (rgb: number[]): string =>
  `#${rgb
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/**
 * A pale wash that belongs to the theme: two thirds of the way from `bg`
 * towards `surface` (so it reads as "up there, behind everything") with a
 * little of the accent's hue stirred in.
 */
export function deriveSky(bg: string, surface: string, accent: string, mood: ThemeMood): string {
  const weight = mood === 'dark' ? 0.06 : 0.2;
  const base = parse(bg).map((channel, index) => {
    const up = channel + (parse(surface)[index] - channel) * 0.6;
    const tinted = up + (parse(accent)[index] - up) * weight;
    return tinted;
  });
  return toHex(base);
}

const relativeLuminance = (hex: string): number => {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * The theme's own ink when it survives on the accent, otherwise pure black or
 * white. Pure is the fallback on purpose: for any fill in sRGB one of black or
 * white clears 4.58:1, so a label is never illegible no matter which colour a
 * child lands on. A tinted near-black is tried first because it is prettier,
 * but it is not allowed to be the last resort.
 */
export function deriveAccentInk(accent: string, ink: string): string {
  if (ratio(accent, ink) >= 4.5) return ink;
  if (ratio(accent, '#141412') >= 4.5) return '#141412';
  return ratio(accent, '#ffffff') >= ratio(accent, '#000000') ? '#ffffff' : '#000000';
}

/** Completes a hand-authored or hand-picked palette. Idempotent. */
export function completeColors(
  core: ColorCore & Partial<ThemeColors>,
  mood: ThemeMood = 'light',
): ThemeColors {
  const danger = core.danger ?? '#A6352D';
  const success = core.success ?? '#2F7A46';
  const sky = core.sky ?? deriveSky(core.bg, core.surface, core.accent, mood);
  return {
    bg: core.bg,
    surface: core.surface,
    sky,
    ink: core.ink,
    brand: core.brand,
    accent: core.accent,
    accentInk: core.accentInk ?? deriveAccentInk(core.accent, core.ink),
    brandSolid: core.brandSolid ?? core.brand,
    brandInk: core.brandInk ?? '#ffffff',
    danger,
    success,
  };
}

const light = (core: ColorCore & Partial<ThemeColors>): ThemeColors => completeColors(core, 'light');

/* ------------------------------------------------------------------ *
 * Built-in moods
 *
 * Measured in OKLCH, not by eye. Every one of these clears 4.5:1 on the five
 * text pairs and 3:1 on the two decorative ones — `tests/palette.test.ts`
 * fails the build if that ever stops being true.
 * ------------------------------------------------------------------ */

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'meadow',
    name: 'Mochi Meadow',
    blurb: 'Mint grass, a wide pale sky and one marigold sun. The default.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#ECF7E4',
      surface: '#FDFEFC',
      sky: '#A9E1EF',
      ink: '#122B1C',
      brand: '#007D43',
      accent: '#FAB72A',
      accentInk: '#151E0F',
      danger: '#A6352D',
      success: '#157A46',
    }),
  },
  {
    id: 'sunny',
    name: 'Sunny Kitchen',
    blurb: 'Butter yellow, terracotta tile and a bowl of lemons.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#FCF1DE',
      surface: '#FFFEFB',
      sky: '#F2D9A6',
      ink: '#351F10',
      brand: '#A74017',
      accent: '#E6C329',
      accentInk: '#221909',
      danger: '#A63439',
      success: '#2F7A46',
    }),
  },
  {
    id: 'lagoon',
    name: 'Lagoon Dive',
    blurb: 'Deep water blue, coral, and light coming down through the surface.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#DEF8FE',
      surface: '#FCFEFF',
      sky: '#B4DDF7',
      ink: '#092935',
      brand: '#007897',
      accent: '#FF9685',
      accentInk: '#071E23',
      danger: '#A53246',
      success: '#157A63',
    }),
  },
  {
    id: 'lantern',
    name: 'Paper Lantern',
    blurb: 'Rice paper and vermilion, with jade green lanterns strung across.',
    mood: 'light',
    builtIn: true,
    colors: light({
      bg: '#FFEEE1',
      surface: '#FFFDFC',
      sky: '#E3D6A8',
      ink: '#371E16',
      brand: '#A93C2F',
      accent: '#1ECB9C',
      accentInk: '#25170D',
      danger: '#A5324B',
      success: '#2F7A52',
    }),
  },
  {
    id: 'night',
    name: 'Night Owl',
    blurb: 'A dim room for bedtime puzzles. Warm lamp, cool window.',
    mood: 'dark',
    builtIn: true,
    colors: completeColors(
      {
        bg: '#111522',
        surface: '#1F2433',
        sky: '#37405A',
        ink: '#E8EBF5',
        brand: '#85BCF5',
        brandSolid: '#2E6FA8',
        brandInk: '#F4F8FF',
        accent: '#FFB62E',
        accentInk: '#151927',
        danger: '#DD766F',
        success: '#6DC59A',
      },
      'dark',
    ),
  },
];

export const DEFAULT_THEME_ID = 'meadow';

export const findTheme = (id: string, extra: Theme[] = []): Theme =>
  [...BUILT_IN_THEMES, ...extra].find((theme) => theme.id === id) ?? BUILT_IN_THEMES[0];

/** Theme Studio ready-made starting points, so nobody faces a blank slate. */
export const THEME_PRESETS: Array<{ label: string; colors: ThemeColors }> = [
  {
    label: 'Mint',
    colors: light({
      bg: '#E9F8EC',
      surface: '#FCFEFC',
      sky: '#B2E5F0',
      ink: '#0F2A1C',
      brand: '#00794C',
      accent: '#F6AF2B',
      danger: '#A6352D',
      success: '#157A46',
    }),
  },
  {
    label: 'Bubblegum',
    colors: light({
      bg: '#FDE8F0',
      surface: '#FFFCFD',
      sky: '#DCD6F2',
      ink: '#33172A',
      brand: '#A62A64',
      accent: '#00C8E0',
      danger: '#A82B45',
      success: '#257C5C',
    }),
  },
  {
    label: 'Honey',
    colors: light({
      bg: '#FEEFCF',
      surface: '#FFFDF6',
      sky: '#C9E7C6',
      ink: '#34220A',
      brand: '#8F5606',
      accent: '#F5C518',
      danger: '#A63F22',
      success: '#3D7A2A',
    }),
  },
  {
    label: 'Deep sea',
    colors: completeColors(
      {
        bg: '#08171F',
        surface: '#122B37',
        sky: '#20485C',
        ink: '#E2F2F7',
        brand: '#7CCBE0',
        brandSolid: '#1D6E88',
        brandInk: '#F2FAFD',
        accent: '#FF9F43',
        accentInk: '#0B1A20',
        danger: '#F0877C',
        success: '#5FD0A6',
      },
      'dark',
    ),
  },
];
