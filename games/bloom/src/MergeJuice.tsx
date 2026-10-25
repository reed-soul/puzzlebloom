import { type MergeEvent, TIERS } from '@puzzlebloom/bloom-engine';
import { chime, type SparkBurst, SparkBursts, useReducedMotion } from '@puzzlebloom/ui';
import { useEffect, useRef, useState } from 'react';

/**
 * Bloom's merge celebration, on the garden's shared juice layer: one spark
 * burst where the merge happened, in the new creature's colour, with a chime
 * pitched by tier. The engine reports merge events; this decides what they
 * look like. Dedupes by position — the rAF loop can publish one tick more
 * than once.
 *
 * The chime deepens with the tier, so a crown merge sounds like one; the
 * sparks wear the new creature's colour, so they look like they came from the
 * thing that was just born.
 */

const DEDUPE_LIMIT = 400;

/** Each tier's burst colour: the creature's own glyph colour. */
const BURST_COLORS = [
  '#e4736b',
  '#e9a23b',
  '#e3c244',
  '#7fb069',
  '#4fa3a5',
  '#5b8fd6',
  '#8e7cc3',
  '#d98cb3',
  '#b08d6e',
] as const;

export function MergeJuice({ merges }: { merges: MergeEvent[] }) {
  const [bursts, setBursts] = useState<SparkBurst[]>([]);
  const seen = useRef(new Set<string>());
  const reduced = useReducedMotion();

  useEffect(() => {
    if (merges.length === 0) return;
    const fresh: SparkBurst[] = [];
    for (const event of merges) {
      const key = `${event.x.toFixed(1)}:${event.y.toFixed(1)}:${event.tier}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      fresh.push({
        id: performance.now() + event.x,
        x: event.x,
        y: event.y,
        color: BURST_COLORS[event.tier],
        size: TIERS[event.tier].radius * 2.6,
      });
    }
    if (seen.current.size > DEDUPE_LIMIT) {
      seen.current = new Set([...seen.current].slice(-DEDUPE_LIMIT / 2));
    }
    if (fresh.length === 0) return;

    // Audio is not motion: the chime plays either way; the burst does not.
    chime(0.75 - (merges[0]?.tier ?? 0) * 0.07);
    if (!reduced) {
      setBursts((current) => [...current, ...fresh]);
    }
  }, [merges, reduced]);

  return (
    <div className="pb-bloom__juice" aria-hidden="true">
      <SparkBursts
        bursts={bursts}
        done={(id) => setBursts((current) => current.filter((b) => b.id !== id))}
      />
    </div>
  );
}
