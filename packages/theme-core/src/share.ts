/**
 * Sharing a theme by link.
 *
 * A theme a child made is worth sending to a friend, and doing that without a
 * backend means putting the whole theme in the URL. Two things keep it small
 * and safe: single-letter keys, and an allow-list of fields on the way back in.
 * An arriving theme is data from a stranger's clipboard, so it is validated
 * before it is allowed anywhere near the DOM.
 */

import { normalizeHex } from './contrast';
import type { Theme, ThemeColors } from './themes';

interface Packed {
  n: string;
  m: 'light' | 'dark';
  c: string[];
}

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string): string => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function encodeTheme(theme: Theme): string {
  const { colors } = theme;
  const packed: Packed = {
    n: theme.name.slice(0, 32),
    m: theme.mood,
    c: [
      colors.bg,
      colors.surface,
      colors.ink,
      colors.brand,
      colors.accent,
      colors.danger,
      colors.success,
      colors.brandSolid ?? colors.brand,
      colors.brandInk ?? '#ffffff',
    ].map(normalizeHex),
  };
  return toBase64Url(JSON.stringify(packed));
}

export function decodeTheme(token: string): Theme | null {
  try {
    const parsed = JSON.parse(fromBase64Url(token)) as Partial<Packed>;
    if (!parsed || !Array.isArray(parsed.c) || parsed.c.length < 7) return null;
    if (!parsed.c.every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))) {
      return null;
    }
    const [bg, surface, ink, brand, accent, danger, success, brandSolid, brandInk] = parsed.c;
    const colors: ThemeColors = {
      bg,
      surface,
      ink,
      brand,
      accent,
      danger,
      success,
      brandSolid: brandSolid ?? brand,
      brandInk: brandInk ?? '#ffffff',
    };
    return {
      id: `shared-${toBase64Url(parsed.n ?? 'theme').slice(0, 12)}`,
      name: (parsed.n ?? 'Shared theme').toString().slice(0, 32) || 'Shared theme',
      blurb: 'A theme someone sent you.',
      mood: parsed.m === 'dark' ? 'dark' : 'light',
      colors,
      builtIn: false,
    };
  } catch {
    return null;
  }
}

/** Absolute link to the studio with this theme baked in. */
export function buildThemeLink(theme: Theme, origin: string): string {
  return `${origin}/themes?theme=${encodeTheme(theme)}`;
}

/** Reads `?theme=` from a URL, or returns null when there is nothing usable. */
export function readThemeParam(search: string): Theme | null {
  const value = new URLSearchParams(search).get('theme');
  return value ? decodeTheme(value) : null;
}
