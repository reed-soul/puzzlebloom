/**
 * The nine glyph creatures.
 *
 * Nine digits are hard to tell apart when you are six: 3 and 8, 6 and 9, and
 * every one of them is an abstract squiggle. These little heads exist so the
 * same board can be played with shapes instead of numerals — one creature per
 * digit, always the same creature, so "the bunny is 2" becomes knowledge a
 * child carries between puzzles.
 *
 * Colour is never the only signal: each head has its own outline feature
 * (ears, horn, leaf, crown), which keeps them distinguishable at 28px and in
 * greyscale.
 */

export const GLYPH_COLORS = [
  '#E4736B',
  '#E9A23B',
  '#E3C244',
  '#7FB069',
  '#4FA3A5',
  '#5B8FD6',
  '#8E7CC3',
  '#D98CB3',
  '#B08D6E',
] as const;

export type GlyphVariant = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface Props {
  /** 1–9. Anything else renders nothing. */
  digit: number;
  size?: number;
  /** Fade the whole creature: used for pencil marks. */
  ghost?: boolean;
}

const feature = (variant: GlyphVariant) => {
  switch (variant) {
    case 0:
      return (
        <>
          <circle cx="6.6" cy="7.2" r="2.2" />
          <circle cx="17.4" cy="7.2" r="2.2" />
        </>
      );
    case 1:
      return (
        <>
          <ellipse cx="9.2" cy="4.9" rx="1.55" ry="3.6" transform="rotate(-9 9.2 4.9)" />
          <ellipse cx="14.8" cy="4.9" rx="1.55" ry="3.6" transform="rotate(9 14.8 4.9)" />
        </>
      );
    case 2:
      return <path d="M12 3.4 14.4 8h-4.8z" />;
    case 3:
      return (
        <>
          <path d="M12 6.6V3.9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <circle cx="12" cy="2.9" r="1.5" />
        </>
      );
    case 4:
      return <path d="M12 7.4c0-2.6 1.5-4.1 3.9-4.4.2 2.7-1.7 4.2-3.9 4.4z" />;
    case 5:
      return (
        <>
          <circle cx="12" cy="2.3" r="1.15" />
          <circle cx="9.9" cy="4.1" r="1.15" />
          <circle cx="14.1" cy="4.1" r="1.15" />
        </>
      );
    case 6:
      return <path d="M8.4 7.4 9.9 4.1l1.9 3zM13.4 7.4 15 4.1l1.8 3z" />;
    case 7:
      return <path d="M8.6 7.6 6.6 4.6l3.4.4zM12.4 7.6l2.4-3 1.1 3.3z" />;
    case 8:
      return <path d="M8.2 7.2 9.4 3.6l2.6 1.7 2.6-1.7 1.2 3.6z" />;
    default:
      return null;
  }
};

export function CreatureGlyph({ digit, size = 32, ghost = false }: Props) {
  if (digit < 1 || digit > 9) return null;
  const variant = (digit - 1) as GlyphVariant;
  const color = GLYPH_COLORS[variant];

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={String(digit)}
      style={{ display: 'block', opacity: ghost ? 0.55 : 1 }}
    >
      <g fill={color} stroke={color} strokeWidth="0" color={color}>
        {feature(variant)}
        <circle cx="12" cy="13.6" r="8.1" />
      </g>
      <circle cx="9.6" cy="12.6" r="1.28" fill="#12141a" />
      <circle cx="14.4" cy="12.6" r="1.28" fill="#12141a" />
      <circle cx="8.3" cy="15.6" r="1.5" fill="#ffffff" opacity="0.3" />
      <circle cx="15.7" cy="15.6" r="1.5" fill="#ffffff" opacity="0.3" />
      <path
        d="M10.6 16.6q1.4 1.2 2.8 0"
        fill="none"
        stroke="#12141a"
        strokeWidth="1.05"
        strokeLinecap="round"
      />
    </svg>
  );
}
