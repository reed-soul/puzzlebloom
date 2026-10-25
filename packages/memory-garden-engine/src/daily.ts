/**
 * Today's board, agreed on without a server.
 *
 * The date is hashed into the seed, so everyone who opens the page on the same
 * day gets the same arrangement — no request, no account, nothing to keep in
 * step, and it still works on a train. The size comes out of the same hash, so
 * the daily board also grows and shrinks through the week instead of being the
 * same six pairs for ever.
 *
 * `localDateKey` is the local date, not the UTC one. "Today" means the player's
 * today: a hash of the UTC date would change the board in the middle of the
 * evening for half the world.
 */

import { createRandom, LEVELS, type Level, PAIRS_BY_LEVEL, seedFrom } from './deal';

export interface DailyDeal {
  readonly level: Level;
  readonly pairs: number;
  readonly seed: number;
}

/** `YYYY-MM-DD` in the player's own timezone. */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dailyDeal(dateKey: string = localDateKey()): DailyDeal {
  const seed = seedFrom(`pb.memory-garden/${dateKey}`);
  const random = createRandom(seed);
  const level = LEVELS[Math.floor(random() * LEVELS.length)] ?? 'small';
  return { level, pairs: PAIRS_BY_LEVEL[level], seed };
}
