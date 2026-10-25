import { useEffect } from 'react';
import { chime, useReducedMotion } from './juice';

/**
 * The garden's spark burst — the shared particle layer behind every game's
 * celebration. Twelve sparks fly out from a point in the named colour, pop
 * once, and remove themselves. The vfx budgets hold everywhere it is used:
 * ≤12 particles per burst, one burst element, 0.45 s life, and a full
 * reduced-motion collapse (the chime survives; audio is not motion).
 *
 * Games report events; this component celebrates them. Keep it dumb: give it
 * a key, a point in its own coordinate space, and a colour.
 */

export interface SparkBurst {
  id: number;
  x: number;
  y: number;
  color: string;
  /** Optional scale for the pop, in px. Defaults to a modest 56. */
  size?: number;
}

const SPARKS = 12;
const SPARK_ANGLES = Array.from({ length: SPARKS }, (_, i) => (i / SPARKS) * 360);

interface Props {
  bursts: SparkBurst[];
  /** Coordinate space of x/y — the component positions absolutely inside its
   *  parent, so the parent decides what "px" means via its own CSS. */
  done: (id: number) => void;
}

export function SparkBursts({ bursts, done }: Props) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (bursts.length === 0 || reduced) return;
    chime(0.6);
  }, [bursts, reduced]);

  if (reduced && bursts.length > 0) {
    // Chime still plays (above); the visible burst is skipped.
    return null;
  }

  return (
    <div className="pb-juice" aria-hidden="true">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="pb-juice__burst"
          style={
            {
              left: `${burst.x}px`,
              top: `${burst.y}px`,
              '--burst-size': `${burst.size ?? 56}px`,
              color: burst.color,
            } as React.CSSProperties
          }
          onAnimationEnd={() => done(burst.id)}
        >
          {SPARK_ANGLES.map((angle) => (
            <i key={angle} style={{ '--spark-angle': `${angle}deg` } as React.CSSProperties} />
          ))}
        </span>
      ))}
    </div>
  );
}
