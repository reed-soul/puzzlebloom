/**
 * Guards on the palette.
 *
 * The failure this file exists to prevent is not a crash — it is a slow drift
 * back to "tasteful but flat". Palette decisions are easy to soften one hex at
 * a time, and nobody notices until the site has lost its colour. So the
 * saturated-ness of the palette is asserted here, next to the contrast rules,
 * and `pnpm verify` refuses to build a washed-out theme.
 */

import { describe, expect, it } from 'vitest';
import { auditTheme, contrastRatio } from '../src/contrast';
import { decodeTheme, encodeTheme } from '../src/share';
import type { ThemeColors } from '../src/themes';
import { BUILT_IN_THEMES, completeColors, deriveAccentInk, deriveSky, THEME_PRESETS } from '../src/themes';

const SRGB = (hex: string): number[] => {
  const body = hex.replace('#', '');
  return [0, 2, 4].map((i) => {
    const v = parseInt(body.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
};

/** OKLCH chroma — the axis that "pale" and "vivid" actually live on. */
function chroma(hex: string): number {
  const [r, g, b] = SRGB(hex);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const [l_, m_, s_] = [l, m, s].map((v) => Math.cbrt(v));
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return Math.hypot(A, B);
}

const ALL: Array<{ label: string; colors: ThemeColors }> = [
  ...BUILT_IN_THEMES.map((t) => ({ label: t.id, colors: t.colors })),
  ...THEME_PRESETS.map((p) => ({ label: `preset:${p.label}`, colors: p.colors })),
];

describe('every shipped palette is readable', () => {
  for (const { label, colors } of ALL) {
    it(`${label} clears every contrast pair`, () => {
      const failed = auditTheme(colors).filter((check) => !check.ok);
      const detail = failed.map((c) => `${c.label} ${c.ratio}:1 (needs ${c.min}:1)`).join('; ');
      expect(failed, detail).toHaveLength(0);
    });
  }
});

describe('every shipped palette is actually colourful', () => {
  // A children's brand palette sits around C 0.20 in OKLCH. Below 0.15 the
  // page reads as mist rather than as a toy. This is the floor.
  const FLOOR = 0.15;

  for (const { label, colors } of ALL) {
    it(`${label} keeps at least one colour above C ${FLOOR}`, () => {
      const best = Math.max(
        chroma(colors.accent),
        chroma(colors.brand),
        chroma(colors.sky),
        chroma(colors.danger),
      );
      expect(best).toBeGreaterThan(FLOOR);
    });

    it(`${label} lets the accent carry the room`, () => {
      // The accent is the largest single block of colour on the page, so it is
      // the one that has to be loud. If it is quieter than the brand, the
      // hierarchy has collapsed back into "everything is the same green".
      expect(chroma(colors.accent)).toBeGreaterThanOrEqual(0.12);
    });
  }
});

describe('the sky is a place, not another grey', () => {
  for (const { label, colors } of ALL) {
    it(`${label} separates the sky from the cards`, () => {
      // Big enough to see as a band behind the hero; small enough not to fight
      // the card that sits on top of it.
      expect(colors.sky).not.toBe(colors.surface);
      expect(colors.sky).not.toBe(colors.bg);
      expect(contrastRatio(colors.ink, colors.sky)).toBeGreaterThanOrEqual(4.5);
      expect(chroma(colors.sky)).toBeGreaterThan(0.012);
    });
  }
});

describe('derivation keeps a stranger’s palette safe', () => {
  it('always finds a legible label for the accent', () => {
    // Sweep the hue circle at three lightness levels; every accent a child can
    // reach with the colour picker must still get a readable label.
    for (let hue = 0; hue < 360; hue += 15) {
      for (const [l, c] of [
        [0.9, 0.4],
        [0.75, 0.55],
        [0.55, 0.7],
      ] as const) {
        const rad = (hue * Math.PI) / 180;
        const hex = `#${[
          l + c * Math.cos(rad),
          l + c * Math.cos(rad - (2 * Math.PI) / 3),
          l + c * Math.cos(rad - (4 * Math.PI) / 3),
        ]
          .map((v) =>
            Math.max(0, Math.min(255, Math.round(((v - 0.5) * 1.15 + 0.5) * 255)))
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')}`;
        expect(contrastRatio(deriveAccentInk(hex, '#122B1C'), hex)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('gives an untouched palette a sky and an accent label', () => {
    const colors = completeColors({
      bg: '#FDEEF1',
      surface: '#FFFCFD',
      ink: '#3E2531',
      brand: '#C0476F',
      accent: '#3C8FA8',
    });
    expect(colors.sky).toMatch(/^#[0-9a-f]{6}$/);
    expect(colors.accentInk).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(colors.accentInk, colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('derives a lighter sky in light moods and a deeper one in dark moods', () => {
    const lightSky = deriveSky('#ECF7E4', '#FDFEFC', '#FAB72A', 'light');
    const darkSky = deriveSky('#111522', '#1F2433', '#EEB23D', 'dark');
    expect(chroma(lightSky)).toBeGreaterThan(chroma(darkSky) * 0.4);
  });
});

describe('a shared theme survives the trip', () => {
  const theme = BUILT_IN_THEMES[0];

  it('round-trips every role, including the two new ones', () => {
    const decoded = decodeTheme(encodeTheme(theme));
    expect(decoded).not.toBeNull();
    // The wire format normalises to lowercase, which is the canonical form.
    const canonical = Object.fromEntries(
      Object.entries(theme.colors).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.toLowerCase() : value,
      ]),
    );
    expect(decoded!.colors).toEqual(canonical);
  });

  it('still opens a link made before the sky existed', () => {
    // Seven colours, the oldest wire format. The missing roles must be derived
    // rather than passed through as undefined.
    const legacy = {
      n: 'Old theme',
      m: 'light' as const,
      c: ['#FDEEF1', '#FFFCFD', '#3E2531', '#C0476F', '#3C8FA8', '#B23A4E', '#4A8F65'],
    };
    const token = btoa(JSON.stringify(legacy)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const decoded = decodeTheme(token);
    expect(decoded?.colors.brand).toBe('#c0476f');
    expect(decoded?.colors.sky).toMatch(/^#[0-9a-f]{6}$/);
    expect(decoded?.colors.accentInk).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('refuses a link carrying something that is not a colour', () => {
    const bad = { n: 'x', m: 'light', c: ['#fff', 'url(evil)', '#000000'] };
    const token = btoa(JSON.stringify(bad)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(decodeTheme(token)).toBeNull();
  });
});
