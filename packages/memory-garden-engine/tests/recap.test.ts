import { describe, expect, it } from 'vitest';
import { type Board, type Creature, recap, type TurnLog, turn } from '../src/index';

/**
 * A finished board described only by its log, which is all `recap` reads.
 *
 * Turns are written as pairs of card indices. A card may appear in more than one
 * turn, because in a real round a card that was covered is a card that can be
 * turned again. `matched` is derived from the deal rather than passed in: a log
 * that disagreed with its own board is not a state the game can produce, and a
 * test built on one would be testing the fixture.
 */
function boardWith(creatures: readonly Creature[], turns: ReadonlyArray<readonly [number, number]>): Board {
  const log: TurnLog[] = turns.map(([a, b]) => ({
    a,
    b,
    matched: creatures[a] === creatures[b],
  }));
  return {
    pairs: creatures.length / 2,
    creatures,
    faces: creatures.map(() => 'kept' as const),
    open: [],
    turns: log.length,
    kept: creatures.length / 2,
    log,
  };
}

describe('recap', () => {
  it('counts the longest run, not the total number of matches', () => {
    // Four turns: match, miss, match, match. Three matches in total, but the
    // longest unbroken run is two — and the run is what the sentence on the win
    // panel claims, so the two numbers have to differ here.
    const board = boardWith(
      [1, 1, 2, 3, 2, 3, 4, 4],
      [
        [0, 1],
        [2, 3],
        [2, 4],
        [5, 3],
      ],
    );
    const facts = recap(board);
    expect(facts.turns).toBe(4);
    expect(facts.bestRun).toBe(2);
  });

  it('reports a run of three out of five matches, not five', () => {
    // The widest gap the game can produce: 5 pairs, every turn a match except
    // two misses, and the matches arriving as 1, 1, 3. A `bestRun` that counted
    // matches would say five; a `bestRun` that counted the longest streak says
    // three. Nothing else in this round differs between the two readings.
    const board = boardWith(
      [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
      [
        [0, 1], // match — run 1
        [2, 4], // miss  — run 0
        [4, 5], // match — run 1
        [6, 8], // miss  — run 0
        [8, 9], // match — run 1
        [2, 3], // match — run 2
        [6, 7], // match — run 3
      ],
    );
    const facts = recap(board);
    expect(facts.pairs).toBe(5);
    expect(facts.turns).toBe(7);
    // Five pairs were found. None of them is a run of five.
    expect(board.log.filter((entry) => entry.matched)).toHaveLength(5);
    expect(facts.bestRun).toBe(3);
  });

  it('reports a clean round as one run the length of the round', () => {
    const board = boardWith(
      [1, 1, 2, 2, 3, 3, 4, 4],
      [
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ],
    );
    expect(recap(board).bestRun).toBe(4);
  });

  it('merges the two orderings of the same missed pair', () => {
    const board = boardWith(
      [1, 2, 3, 3, 2, 1],
      [
        [0, 1],
        [1, 0],
        [2, 5],
        [3, 4],
        [4, 3],
        [4, 3],
      ],
    );
    const facts = recap(board);
    // {1, 2} missed twice, {1, 3} once, {2, 3} three times. Named in ascending
    // creature order, whichever card was turned first.
    expect(facts.hardest).toEqual([2, 3]);
    expect(facts.hardestMisses).toBe(3);
  });

  it('counts the snail and the cat as one pair, turned either way round', () => {
    // Nine pairs, and the only repeated mistake is 3-and-7: once as (3 first),
    // once as (7 first). Two cards turned in either order is the same mistake,
    // so the sentence on the panel has to say "twice", not "once".
    const creatures: Creature[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const board = boardWith(creatures, [
      [2, 6], // 3 and 7
      [6, 2], // 7 and 3 — the same two cards, the other way round
    ]);
    const facts = recap(board);
    expect(facts.hardestMisses).toBe(2);
    // Ascending creature order, not "the order the player pressed them".
    expect(facts.hardest).toEqual([3, 7]);
  });

  it('breaks a tie towards the pair that missed first', () => {
    const creatures: Creature[] = [1, 2, 3, 3, 2, 1];
    // 3-and-1 misses first, then 2-and-3. Both once.
    expect(
      recap(
        boardWith(creatures, [
          [2, 5],
          [4, 3],
        ]),
      ).hardest,
    ).toEqual([1, 3]);
    // The same two misses in the other order.
    expect(
      recap(
        boardWith(creatures, [
          [4, 3],
          [2, 5],
        ]),
      ).hardest,
    ).toEqual([2, 3]);
  });

  it('has nothing hard to report when nothing missed', () => {
    const facts = recap(
      boardWith(
        [1, 1, 2, 2],
        [
          [0, 1],
          [2, 3],
        ],
      ),
    );
    expect(facts.hardest).toBeNull();
    expect(facts.hardestMisses).toBe(0);
    // A clean round is one run of `pairs` — the two numbers agree here, which is
    // exactly why the test above has to be the one that pins the difference.
    expect(facts.bestRun).toBe(facts.pairs);
    expect(facts.bestRun).toBe(2);
  });

  it('reads a played board the same way as a written one', () => {
    let board: Board = {
      pairs: 2,
      creatures: [1, 2, 2, 1],
      faces: ['down', 'down', 'down', 'down'],
      open: [],
      turns: 0,
      kept: 0,
      log: [],
    };

    // Miss with 1 and 2, then turn card 4 over and pair it with card 1.
    board = turn(board, 0).board;
    board = turn(board, 1).board;
    board = turn(board, 3).board;
    board = turn(board, 0).board;

    const facts = recap(board);
    expect(facts.pairs).toBe(2);
    expect(facts.turns).toBe(2);
    expect(facts.bestRun).toBe(1);
    expect(facts.hardest).toEqual([1, 2]);
    expect(facts.hardestMisses).toBe(1);
  });
});
