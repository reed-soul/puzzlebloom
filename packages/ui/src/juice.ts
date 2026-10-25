import { useEffect, useState } from 'react';

/**
 * The garden's chime: two sine partials a fifth apart, synthesised — no files,
 * no fetch. The AudioContext is created lazily on first play (a user gesture
 * in practice) and never blocks the game: any failure is swallowed, because
 * audio is juice, not law.
 *
 * `pitch` is 0..1, low to high. A merge's chime deepens with the tier; a
 * solved scale rings brighter; anything can call this without knowing what
 * WebAudio is.
 */
let audioCtx: AudioContext | null = null;

export function chime(pitch = 0.5, gain = 0.11) {
  if (typeof window === 'undefined') return;
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const t = audioCtx.currentTime;
    const base = 330 + pitch * 320;
    for (const [mult, g, dur] of [
      [1, gain, 0.16],
      [1.5, gain * 0.6, 0.22],
    ] as const) {
      const osc = audioCtx.createOscillator();
      const amp = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * mult;
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(g, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  } catch {
    // A blocked context must never break a game.
  }
}

/** True when the user asked the system for less motion. Reactive. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
