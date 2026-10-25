import { type MergeEvent, TIERS } from '@puzzlebloom/bloom-engine';
import { useEffect, useRef, useState } from 'react';

/**
 * The merge celebration: squash, sparks and a chime, in that order of
 * importance. The feedback triple every hit deserves — the merge IS this
 * game's hit — with the budgets the vfx spec demands: ≤12 particles per
 * burst, one bright layer at a time, nothing over the jar's rim where the
 * player is aiming, and every motion wrapped in the reduced-motion check.
 *
 * Particles are DOM spans with one CSS animation each (transform + opacity,
 * the two cheap properties), keyed by merge id, removed on animationend.
 * The chime is WebAudio synthesis — no files, no fetch, lazily created on
 * first user gesture, pitched by tier so a crown merge sounds bigger than
 * an ant merge.
 */

let audioCtx: AudioContext | null = null;

function chime(tier: number) {
  if (typeof window === 'undefined') return;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const t = audioCtx.currentTime;
    // Two sine partials, a fifth apart; base pitch falls with tier so bigger
    // merges sound deeper and richer.
    const base = 520 - tier * 38;
    for (const [mult, gain, dur] of [
      [1, 0.12, 0.16],
      [1.5, 0.07, 0.22],
    ] as const) {
      const osc = audioCtx.createOscillator();
      const amp = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * mult;
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  } catch {
    // Audio is juice, not law: a blocked context must never break the game.
  }
}

interface Burst {
  id: number;
  event: MergeEvent;
}

const SPARKS_PER_BURST = 12;
const SPARK_ANGLES = Array.from({ length: SPARKS_PER_BURST }, (_, i) => (i / SPARKS_PER_BURST) * 360);

export function MergeJuice({ merges }: { merges: MergeEvent[] }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seen = useRef(new Set<string>());
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (merges.length === 0) return;
    const fresh: Burst[] = [];
    for (const event of merges) {
      // The engine can report the same tick's merges to React twice (state
      // publishes on every frame); dedupe by position+tier.
      const key = `${event.x.toFixed(1)}:${event.y.toFixed(1)}:${event.tier}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      fresh.push({ id: performance.now() + event.x, event });
    }
    if (fresh.length === 0) return;

    // Prune the dedupe set occasionally so it cannot grow unbounded.
    if (seen.current.size > 400) {
      seen.current = new Set([...seen.current].slice(-200));
    }

    if (!reduced) {
      chime(fresh[0].event.tier);
      setBursts((current) => [...current, ...fresh]);
    } else {
      // Reduced motion still gets the chime (audio is not motion) but no
      // particles; the squash animation is disabled in CSS by the same query.
      chime(fresh[0].event.tier);
    }
  }, [merges, reduced]);

  return (
    <div className="pb-bloom__juice" aria-hidden="true">
      {bursts.map((burst) => {
        const r = TIERS[burst.event.tier].radius;
        return (
          <span
            key={burst.id}
            className={`pb-bloom__burst pb-bloom__burst--${burst.event.tier}`}
            style={
              {
                left: `calc(${burst.event.x}px * var(--pb-bloom-scale, 1))`,
                top: `calc(${burst.event.y}px * var(--pb-bloom-scale, 1))`,
                '--burst-size': `${r * 2.6}px`,
              } as React.CSSProperties
            }
            onAnimationEnd={() => setBursts((current) => current.filter((b) => b.id !== burst.id))}
          >
            {SPARK_ANGLES.map((angle) => (
              <i key={angle} style={{ '--spark-angle': `${angle}deg` } as React.CSSProperties} />
            ))}
          </span>
        );
      })}
    </div>
  );
}
