import { chime, type SparkBurst, SparkBursts, useReducedMotion } from '@puzzlebloom/ui';
import { useEffect, useState } from 'react';

/**
 * The weigh-success celebration, on the garden's shared juice layer. A solved
 * balance rings once (a bright chime — solving IS the moment here), and two
 * spark bursts bloom over the pans: the equation's two sides, both equal,
 * both celebrating. Longer streaks raise the pitch, so a run of correct
 * weighs sounds like climbing.
 *
 * Positions are percentages of the win overlay, which covers the whole game:
 * the bursts hang over where the pans are behind it.
 */

interface Props {
  /** Timestamp of the solve; a new value re-fires the celebration. */
  solvedAt: number;
  streak: number;
}

export function BalanceJuice({ solvedAt, streak }: Props) {
  const [bursts, setBursts] = useState<SparkBurst[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!solvedAt) return;
    // Audio is not motion: the chime climbs with the streak either way.
    chime(Math.min(0.9, 0.55 + streak * 0.08));
    if (reduced) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    setBursts([
      { id: solvedAt, x: width * 0.35, y: height * 0.45, color: '#7fb069', size: 72 },
      { id: solvedAt + 1, x: width * 0.65, y: height * 0.45, color: '#4fa3a5', size: 72 },
    ]);
  }, [solvedAt, streak, reduced]);

  return (
    <SparkBursts bursts={bursts} done={(id) => setBursts((current) => current.filter((b) => b.id !== id))} />
  );
}
