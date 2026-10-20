/**
 * Contrast guarding.
 *
 * A colour picker in the hands of a child will eventually produce pale grey on
 * white. Rather than blocking that — the theme is theirs, and being told "no"
 * by a website is a bad feeling — the studio measures the result and offers a
 * one-tap repair. The maths is WCAG 2.1: relative luminance, then the ratio.
 */

import type { Theme, ThemeColors } from './themes';
import { deriveAccentInk } from './themes';

export interface ContrastCheck {
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  min: number;
  ok: boolean;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const isHexColor = (value: string): boolean => HEX.test(value.trim());

export function normalizeHex(value: string): string {
  const raw = value.trim();
  if (!HEX.test(raw)) return '#000000';
  const body = raw.slice(1);
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body;
  return `#${full.toLowerCase()}`;
}

function channels(hex: string): [number, number, number] {
  const value = normalizeHex(hex).slice(1);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

/** Every pair a player actually reads, checked at the size it is read at. */
export function auditTheme(colors: ThemeColors): ContrastCheck[] {
  const rows: Array<[string, string, string, number]> = [
    ['Text on cards', colors.ink, colors.surface, 4.5],
    ['Text on the page', colors.ink, colors.bg, 4.5],
    ['Text over the sky band', colors.ink, colors.sky, 4.5],
    ['Links and focus rings', colors.brand, colors.surface, 4.5],
    ['Button label', colors.brandInk ?? '#ffffff', colors.brandSolid ?? colors.brand, 4.5],
    ['Label on the bright accent', colors.accentInk, colors.accent, 4.5],
    ['Wrong-digit warning', colors.danger, colors.surface, 3],
    ['Correct celebration', colors.success, colors.surface, 3],
  ];
  return rows.map(([label, foreground, background, min]) => {
    const ratio = contrastRatio(foreground, background);
    return { label, foreground, background, ratio, min, ok: ratio >= min };
  });
}

export const themeIsReadable = (colors: ThemeColors): boolean =>
  auditTheme(colors).every((check) => check.ok);

/**
 * Nudge `ink` towards black or white until it clears 4.5:1 on both surfaces.
 *
 * Only the ink moves. The surfaces are the part the child chose on purpose;
 * the text colour is the part they cannot see the problem with. `accentInk`
 * is recomputed afterwards, because it is usually a copy of `ink` and would
 * otherwise be left pointing at the colour that just failed.
 */
export function repairInk(colors: ThemeColors): ThemeColors {
  const candidates = ['#14161a', '#ffffff', '#000000', '#f7f7f5'];
  const score = (ink: string) =>
    Math.min(
      contrastRatio(ink, colors.surface),
      contrastRatio(ink, colors.bg),
      contrastRatio(ink, colors.sky),
    );

  const best = candidates.reduce(
    (winner, candidate) => (score(candidate) > score(winner) ? candidate : winner),
    colors.ink,
  );

  const brandOk = contrastRatio(best, colors.surface) >= 4.5 ? colors.brand : best;
  return {
    ...colors,
    ink: best,
    brand: brandOk,
    brandInk: best === '#ffffff' ? '#14161a' : '#ffffff',
    accentInk: deriveAccentInk(colors.accent, best),
  };
}

/** Sets `mood` from the background, so the studio cannot label a dark theme light. */
export function inferMood(colors: ThemeColors): Theme['mood'] {
  return luminance(colors.bg) < 0.22 ? 'dark' : 'light';
}
