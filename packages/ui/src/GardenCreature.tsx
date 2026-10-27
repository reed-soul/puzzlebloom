/**
 * The garden's painted creatures — the same clay-matte family Bloom Drop and
 * Memory Garden wear, so a sliding tile and a memory card are still one world.
 *
 * Colour is never the only signal: each name has its own silhouette (antennae,
 * ears, leaf, crown), which is why the files are named rather than numbered.
 */

export const BLOOM_CREATURES = [
  'ant',
  'bunny',
  'sprout',
  'fox',
  'frog',
  'bird',
  'ram',
  'panda',
  'crown',
] as const;

export type BloomCreature = (typeof BLOOM_CREATURES)[number];

export function bloomCreature(index: number): BloomCreature {
  const count = BLOOM_CREATURES.length;
  return BLOOM_CREATURES[((index % count) + count) % count];
}

interface Props {
  name: BloomCreature;
  /** Pixel size. Omit to fill the parent. */
  size?: number;
  alt?: string;
  className?: string;
}

export function GardenCreature({ name, size, alt = '', className }: Props) {
  return (
    <img
      className={['pb-garden-creature', className].filter(Boolean).join(' ')}
      src={`/art/bloom/creature-${name}.png`}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  );
}
