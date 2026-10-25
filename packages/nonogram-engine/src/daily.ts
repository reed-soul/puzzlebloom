/**
 * Today's puzzle, agreed on without a server.
 *
 * Everyone who opens the page on the same date gets the same picture, because
 * the date *is* the seed. No request, no account, nothing to keep in sync — and
 * it still works on a train.
 */

import { picturesOfSize, type Size } from './pictures';
import { type Puzzle, puzzleForSize } from './puzzle';

/**
 * FNV-1a. Small, deterministic, and good enough to spread a hundred or so
 * dates across four pictures without clumping. Not for anything that needs
 * unpredictability — nothing here does.
 */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
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
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `YYYY-MM-DD` in the player's own timezone: "today" means their today. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dailyPuzzle(dateKey: string = localDateKey(), size: Size = 10): Puzzle {
  const count = picturesOfSize(size).length;
  const random = createRandom(seedFrom(`pb.nonogram/${dateKey}/${size}`));
  return puzzleForSize(size, Math.floor(random() * count));
}
