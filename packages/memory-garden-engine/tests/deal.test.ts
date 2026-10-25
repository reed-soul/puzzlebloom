import { describe, expect, it } from 'vitest';
import { CREATURES, cardCount, columnsFor, deal, MAX_PAIRS, PAIRS_BY_LEVEL, seedFrom } from '../src/index';

/** Every creature on the board, counted. */
function census(creatures: readonly number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const creature of creatures) {
    counts.set(creature, (counts.get(creature) ?? 0) + 1);
  }
  return counts;
}

describe('deal', () => {
  it('puts each creature on exactly two cards, at every size', () => {
    for (const level of ['small', 'medium', 'large'] as const) {
      const pairs = PAIRS_BY_LEVEL[level];
      const board = deal(pairs, 7);
      expect(board.creatures).toHaveLength(pairs * 2);
      expect(census(board.creatures).size).toBe(pairs);
      for (const [creature, count] of census(board.creatures)) {
        expect(count, `creature ${creature} at ${level}`).toBe(2);
      }
    }
  });

  it('deals the same board twice from the same seed', () => {
    const first = deal(9, 12345);
    const second = deal(9, 12345);
    // The whole board, not just the arrangement: a save is `(pairs, seed)` plus
    // the faces, so everything else has to be reproducible from those two.
    expect(second).toEqual(first);
  });

  it('reaches many different arrangements from different seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed += 1) {
      seen.add(deal(9, seed).creatures.join(''));
    }
    // Forty draws out of 18! arrangements: anything near "one" would mean the
    // shuffle is not shuffling.
    expect(seen.size).toBeGreaterThan(20);
  });

  it('deals the three sizes as 12, 16 and 18 cards', () => {
    expect(cardCount(PAIRS_BY_LEVEL.small)).toBe(12);
    expect(cardCount(PAIRS_BY_LEVEL.medium)).toBe(16);
    expect(cardCount(PAIRS_BY_LEVEL.large)).toBe(18);
  });

  it('never needs a tenth creature, even when asked for a bigger board', () => {
    const board = deal(40, 3);
    expect(board.creatures).toHaveLength(CREATURES.length * 2);
    expect(Math.max(...board.creatures)).toBe(9);
  });

  it('caps the ceiling at nine pairs, which is the product decision behind it', () => {
    // Nine creatures, one pair each. A tenth pair would have to repeat a
    // creature four times, and "remember where the snail is" would turn into
    // "remember which cards look the same" — a matching game, not a memory one.
    // Raising `MAX_PAIRS` is the one-character change that would do it, so the
    // number is pinned here and the clamp is measured through `cardCount` and
    // `deal` rather than only asserted on the constant.
    expect(MAX_PAIRS).toBe(9);
    expect(cardCount(MAX_PAIRS)).toBe(18);
    expect(cardCount(MAX_PAIRS + 1)).toBe(18);
    expect(deal(MAX_PAIRS + 1, 5).creatures).toHaveLength(18);
    expect(new Set(deal(MAX_PAIRS + 1, 5).creatures).size).toBe(9);
    expect(deal(MAX_PAIRS + 1, 5).pairs).toBe(9);
    for (const [creature, count] of census(deal(MAX_PAIRS + 1, 5).creatures)) {
      expect(count, `creature ${creature} should appear exactly twice`).toBe(2);
    }
  });

  it('deals exactly two of each creature on the nine-pair board', () => {
    // The level the ceiling exists for: every creature in the garden, once over,
    // two cards each. Four of one and none of another is what a broken shuffle
    // or an off-by-one in the deck builder looks like.
    for (const seed of [1, 2, 3, 99, 4242]) {
      const board = deal(9, seed);
      expect(board.creatures).toHaveLength(18);
      const counts = census(board.creatures);
      expect(counts.size).toBe(9);
      for (const creature of CREATURES) {
        expect(counts.get(creature), `seed ${seed}, creature ${creature}`).toBe(2);
      }
    }
  });

  it('starts every card face down, with nothing in hand', () => {
    const board = deal(6, 99);
    expect(board.faces.every((face) => face === 'down')).toBe(true);
    expect(board.open).toEqual([]);
    expect(board.turns).toBe(0);
    expect(board.kept).toBe(0);
    expect(board.log).toEqual([]);
  });
});

describe('columnsFor', () => {
  it('keeps a card at least 64px wide at 320px', () => {
    // 320px minus the page padding and the gutters, divided by the columns: the
    // number below is the smallest cell each layout can produce.
    const usable = 320 - 24 - 2 * 8;
    for (const pairs of [6, 8, 9]) {
      const columns = columnsFor(pairs, false);
      expect(usable / columns, `${pairs} pairs in ${columns} columns`).toBeGreaterThanOrEqual(64);
    }
  });

  it('spreads the tallest board out when there is room', () => {
    expect(columnsFor(9, false)).toBe(3);
    expect(columnsFor(9, true)).toBe(6);
  });
});

describe('seedFrom', () => {
  it('is the same number for the same text, and moves between texts', () => {
    expect(seedFrom('2026-03-04')).toBe(seedFrom('2026-03-04'));
    expect(seedFrom('2026-03-04')).not.toBe(seedFrom('2026-03-05'));
  });
});
