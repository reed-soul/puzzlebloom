import {
  type BloomState,
  createBloom,
  aim as engineAim,
  drop as engineDrop,
  step,
} from '@puzzlebloom/bloom-engine';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Bloom Drop's screen state: one rAF loop, engine ticks, React repaints.
 *
 * The engine is pure; this hook owns the clock. Each frame ticks the world
 * and mirrors it into React state once (not per bloom), which is plenty at
 * sixty frames a second for ninety circles — the DOM path draws absolutely
 * positioned divs, and React reconciling ninety style tags is well within
 * budget on the hardware this site assumes.
 *
 * Input is pointer-only: move to aim, release to drop. Children aged four do
 * not have drag-and-release timing; they have "put it there" and "let go".
 * The keyboard gets the same two things via arrows and space, because every
 * game here is playable without a pointer.
 */
export function useBloom() {
  const [state, setState] = useState<BloomState>(() => createBloom());
  const ref = useRef(state);
  ref.current = state;

  // The loop. Ticks the engine, then publishes. Pauses when the tab hides —
  // not for battery niceness but because a physics world that ran while
  // away would be a different garden than the one the player left.
  useEffect(() => {
    let frame = 0;
    let running = true;
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        loop();
      }
    };
    const tick = () => {
      const next = step(ref.current);
      if (next !== ref.current) setState(next);
      frame = requestAnimationFrame(loop);
    };
    const loop = () => {
      frame = requestAnimationFrame(tick);
    };
    loop();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const aim = useCallback((x: number) => setState((s) => engineAim(s, x)), []);
  const drop = useCallback(() => setState((s) => engineDrop(s)), []);
  const restart = useCallback(() => setState(createBloom()), []);

  // Keyboard parity with the pointer: left/right aim in steps, space drops.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') {
        setState((s) => engineAim(s, s.pending.x - 14));
      } else if (event.key === 'ArrowRight') {
        setState((s) => engineAim(s, s.pending.x + 14));
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setState((s) => engineDrop(s));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { state, aim, drop, restart } as const;
}
