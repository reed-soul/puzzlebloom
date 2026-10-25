/**
 * A clock, and the one line of arithmetic the win panel needs.
 *
 * This could be imported from the sudoku package and would work, but a game
 * borrowing another game's timer makes the two packages impossible to separate
 * later, and a shared package holding two functions would be ceremony. It is
 * thirty lines; the duplication is cheaper than either alternative.
 *
 * Two behaviours are deliberate. Wall clocks are adjusted by NTP and by the
 * person holding the laptop, so the elapsed time never goes backwards. And
 * `pause` banks the time rather than freezing a start stamp, so a pause, a tab
 * switch and a resume all end up in the same number.
 */

export interface Clock {
  readonly elapsedMs: number;
  readonly running: boolean;
  start(): void;
  pause(): void;
  reset(ms?: number): void;
}

export function createClock(now: () => number = () => Date.now()): Clock {
  let banked = 0;
  let startedAt: number | null = null;

  const accumulate = (): void => {
    if (startedAt === null) return;
    const slice = now() - startedAt;
    if (slice > 0) banked += slice;
    startedAt = now();
  };

  return {
    get elapsedMs() {
      if (startedAt === null) return banked;
      const slice = now() - startedAt;
      return banked + Math.max(slice, 0);
    },
    get running() {
      return startedAt !== null;
    },
    start() {
      if (startedAt !== null) return;
      startedAt = now();
    },
    pause() {
      accumulate();
      startedAt = null;
    },
    reset(ms = 0) {
      banked = Number.isFinite(ms) && ms > 0 ? ms : 0;
      startedAt = null;
    },
  };
}

/** `m:ss`, with hours only once they are earned. Truncates, never rounds up. */
export function formatClock(ms: unknown): string {
  const total = typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
