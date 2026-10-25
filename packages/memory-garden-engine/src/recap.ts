/**
 * What happened in this round, in three facts.
 *
 * A memory game cannot explain its own reasoning, because it has none: there is
 * no deduction to walk a player through, only attention. So the end of the round
 * is where this game answers the question the rest of the site asks — "why did
 * that work?" — and it answers it with a description of the round instead of a
 * verdict on the player.
 *
 * Which is why there is no score, no stars, no percentage, and why the numbers
 * below are the ones that describe a *round* rather than rank it: how many turns
 * it took, the longest run without a miss, and the pair that kept not matching.
 * All three are computed from the log, so none of them can be flattering.
 */

import type { Board } from './board';
import type { Creature } from './creatures';

export interface Recap {
  readonly pairs: number;
  readonly turns: number;
  /** Longest *consecutive* run of matches. Not the total, which is always `pairs`. */
  readonly bestRun: number;
  /** The pair that missed most often, in ascending creature order. Null if none did. */
  readonly hardest: readonly [Creature, Creature] | null;
  readonly hardestMisses: number;
}

export function recap(board: Board): Recap {
  let bestRun = 0;
  let run = 0;
  for (const entry of board.log) {
    if (!entry.matched) {
      run = 0;
      continue;
    }
    run += 1;
    if (run > bestRun) bestRun = run;
  }

  // Insertion-ordered, and the key is the unordered pair, so `{snail, beetle}`
  // and `{beetle, snail}` accumulate into one count no matter which card was
  // turned first. Two cards turned in either order is the same mistake.
  const misses = new Map<string, { pair: readonly [Creature, Creature]; count: number }>();
  for (const entry of board.log) {
    if (entry.matched) continue;
    const a = board.creatures[entry.a];
    const b = board.creatures[entry.b];
    const key = a <= b ? `${a}-${b}` : `${b}-${a}`;
    const pair: readonly [Creature, Creature] = a <= b ? [a, b] : [b, a];
    const found = misses.get(key);
    if (found) {
      found.count += 1;
    } else {
      misses.set(key, { pair, count: 1 });
    }
  }

  let hardest: readonly [Creature, Creature] | null = null;
  let hardestMisses = 0;
  for (const entry of misses.values()) {
    // Strictly greater: a tie goes to the pair that reached the count first,
    // which is the pair the player struggled with earlier in the round.
    if (entry.count > hardestMisses) {
      hardest = entry.pair;
      hardestMisses = entry.count;
    }
  }

  return { pairs: board.pairs, turns: board.turns, bestRun, hardest, hardestMisses };
}
