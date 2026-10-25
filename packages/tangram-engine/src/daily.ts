/**
 * Today's figure, agreed on without a server.
 *
 * The date is the seed, so everyone who opens the page on the same day gets the
 * same silhouette — no request, no account, nothing to keep in step, and it
 * still works on a train.
 *
 * Both functions are copies of the nonogram engine's, and the duplication is
 * deliberate: importing `@puzzlebloom/nonogram-engine` to reach twenty lines of
 * hashing would put the whole nonogram engine in the tangram chunk. Twenty
 * lines are cheaper than a dependency, and this file is where the reason lives
 * so nobody "tidies" it into an import later.
 */

import { FIGURES, type Figure, TUTORIAL_FIGURE_ID } from './figures';

/**
 * FNV-1a. Deterministic, tiny, and good enough to spread dates across six
 * figures without clumping. Not for anything that needs unpredictability —
 * nothing here does.
 */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Mulberry32. Hand-written because `Math.random()` cannot be seeded, and the
 * whole promise of a daily puzzle is that the seed is the only input.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** `YYYY-MM-DD` in the player's own timezone: "today" means their today. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The box is held back from the daily rotation twice over: it is the tutorial,
 * and a player who meets it here first would have nothing to learn from it
 * later. With six figures that leaves five to take turns.
 */
const DAILY_POOL = FIGURES.filter((figure) => figure.id !== TUTORIAL_FIGURE_ID);

export function dailyFigure(dateKey: string = localDateKey()): Figure {
  const random = createRandom(seedFrom(`pb.tangram/${dateKey}`));
  return DAILY_POOL[Math.floor(random() * DAILY_POOL.length)] ?? FIGURES[0];
}
