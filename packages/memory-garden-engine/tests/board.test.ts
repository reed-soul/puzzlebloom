import { describe, expect, it, vi } from 'vitest';
import { type Board, type Creature, isComplete, turn } from '../src/index';

/**
 * A board stated as a literal, rather than dealt and then played into shape.
 * Every test below is about one rule, and a test that had to shuffle first would
 * be reporting on the shuffle as well.
 */
function boardOf(creatures: readonly Creature[]): Board {
  return {
    pairs: creatures.length / 2,
    creatures,
    faces: creatures.map(() => 'down' as const),
    open: [],
    turns: 0,
    kept: 0,
    log: [],
  };
}

const upCount = (board: Board): number => board.faces.filter((face) => face === 'up').length;

/**
 * A hand-written linear congruential generator.
 *
 * The long random walk below has to be the same walk on every run — a test that
 * fails once in forty runs teaches nobody anything — and it must not borrow the
 * engine's own `createRandom`, because a bug in the shuffle would then be
 * hidden by the same bug driving the test.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('turn: the first card of a turn', () => {
  it('turns it face up and asks for a second', () => {
    const start = boardOf([1, 2, 2, 1]);
    const { board, event } = turn(start, 2);
    expect(event).toBe('first');
    expect(board.faces[2]).toBe('up');
    expect(board.open).toEqual([2]);
    expect(board.turns).toBe(0);
    expect(board.log).toEqual([]);
  });
});

describe('turn: cards that cannot be turned', () => {
  it('ignores a card that is already face up, and returns the same board', () => {
    const start = boardOf([1, 2, 2, 1]);
    const { board } = turn(start, 0);
    const second = turn(board, 0);
    expect(second.event).toBe('ignored');
    expect(second.board).toBe(board);
  });

  it('ignores a card that has been kept', () => {
    const start = boardOf([1, 2, 2, 1]);
    const one = turn(start, 0).board;
    const two = turn(one, 3).board;
    expect(two.faces[0]).toBe('kept');
    const third = turn(two, 0);
    expect(third.event).toBe('ignored');
    expect(third.board).toBe(two);
  });

  it('ignores a card that is not on the board', () => {
    const start = boardOf([1, 2, 2, 1]);
    expect(turn(start, -1).event).toBe('ignored');
    expect(turn(start, 4).event).toBe('ignored');
    expect(turn(start, 1.5).event).toBe('ignored');
  });

  it('returns the very same board object, field for field', () => {
    // Both halves of the promise: identity, so a caller can skip a render, and
    // equality, so a caller that copies cannot end up with a different board.
    const start = boardOf([1, 2, 2, 1]);
    const one = turn(start, 0).board;
    const pressed = turn(one, 0);
    expect(pressed.event).toBe('ignored');
    expect(pressed.board).toBe(one);
    expect(pressed.board).toEqual(one);
  });
});

describe('turn: the second card of a turn', () => {
  it('keeps both cards when the creatures match', () => {
    const start = boardOf([1, 2, 2, 1]);
    const one = turn(start, 1).board;
    const { board, event } = turn(one, 2);
    expect(event).toBe('second-match');
    expect(board.faces[1]).toBe('kept');
    expect(board.faces[2]).toBe('kept');
    expect(board.open).toEqual([]);
    expect(board.kept).toBe(1);
    expect(board.turns).toBe(1);
    expect(board.log).toEqual([{ a: 1, b: 2, matched: true }]);
  });

  it('leaves a mismatched pair face up, with nothing counting down', () => {
    const start = boardOf([1, 2, 3, 1, 2, 3]);
    const one = turn(start, 0).board;
    const { board, event } = turn(one, 1);
    expect(event).toBe('second-miss');
    // The point of the whole game: still up, and still up however long the
    // player takes. There is no state here that a clock could move.
    expect(board.faces[0]).toBe('up');
    expect(board.faces[1]).toBe('up');
    expect(board.open).toEqual([0, 1]);
    expect(board.kept).toBe(0);
    expect(board.turns).toBe(1);
    expect(board.log).toEqual([{ a: 0, b: 1, matched: false }]);
  });

  it('counts a miss as a turn', () => {
    const start = boardOf([1, 2, 3, 1, 2, 3]);
    const board = turn(turn(start, 0).board, 1).board;
    expect(board.turns).toBe(1);
  });
});

/**
 * The product promise, stated as four separate claims.
 *
 * "A pair that misses stays face up until you turn the next card" is the one
 * sentence on the shelf, in the hint line and in `site.json`, so it gets more
 * than one assertion. Each of the tests below is written so that a plausible
 * wrong implementation fails it and a right one passes it — the mutation to try
 * is covering the pair in the `second-miss` branch, which is what every other
 * memory game does.
 */
describe('turn: a missed pair stays up until the next press', () => {
  it('is still face up two seconds later', async () => {
    const start = boardOf([1, 2, 3, 1, 2, 3]);
    const missed = turn(turn(start, 0).board, 1).board;
    expect(missed.faces[0]).toBe('up');
    expect(missed.faces[1]).toBe('up');

    // A four-year-old still working out what they are looking at. Two seconds is
    // longer than any "flip back" animation this genre ships.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(missed.faces[0], 'the first card was covered by a timer').toBe('up');
    expect(missed.faces[1], 'the second card was covered by a timer').toBe('up');
    expect(missed.open).toEqual([0, 1]);
  });

  it('queues no timer at all, so nothing can cover the pair behind the player', () => {
    vi.useFakeTimers();
    try {
      const missed = turn(turn(boardOf([1, 2, 3, 1, 2, 3]), 0).board, 1).board;
      // Zero, not "the ones that have not fired yet": a pending callback is
      // exactly the thing this game must not have.
      expect(vi.getTimerCount()).toBe(0);

      vi.advanceTimersByTime(30_000);
      expect(missed.faces[0]).toBe('up');
      expect(missed.faces[1]).toBe('up');
      expect(missed.open).toEqual([0, 1]);
      expect(missed.turns).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('covers the pair on the next press, not before it, and asks for a partner', () => {
    const start = boardOf([1, 2, 3, 1, 2, 3]);
    const missed = turn(turn(start, 0).board, 1).board;

    // Nine presses on cards that are already up are not "the next press": the
    // pair has to survive anything that is not a card being turned over.
    let untouched = missed;
    for (let press = 0; press < 9; press += 1) {
      untouched = turn(untouched, 0).board;
    }
    expect(untouched.faces[0]).toBe('up');
    expect(untouched.faces[1]).toBe('up');
    expect(untouched.open).toEqual([0, 1]);

    const { board, event } = turn(untouched, 2);
    expect(event).toBe('first');
    expect(board.faces[0]).toBe('down');
    expect(board.faces[1]).toBe('down');
    expect(board.faces[2]).toBe('up');
    expect(board.open).toEqual([2]);
  });

  it('does not edit the board it was given', () => {
    const start = boardOf([1, 2, 3, 1, 2, 3]);
    const before = JSON.parse(JSON.stringify(start));
    const missed = turn(turn(start, 0).board, 1).board;
    turn(missed, 2);
    expect(start).toEqual(before);
  });
});

describe('turn: the third press', () => {
  it('covers the missed pair before turning the new card', () => {
    const start = boardOf([1, 2, 3, 1, 2, 3]);
    const missed = turn(turn(start, 0).board, 1).board;
    const { board, event } = turn(missed, 2);
    expect(event).toBe('first');
    expect(board.faces[0]).toBe('down');
    expect(board.faces[1]).toBe('down');
    expect(board.faces[2]).toBe('up');
    expect(board.open).toEqual([2]);
    // The press that clears a miss is not a turn of its own.
    expect(board.turns).toBe(1);
  });

  it('never leaves three cards face up', () => {
    const start = boardOf([1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1]);
    // A fixed, mixed sequence: two misses, a match, and presses on cards that
    // are already up. Whatever the order, three face-up cards is a state the
    // board must never reach.
    const presses = [0, 1, 5, 11, 4, 5, 7, 2, 9, 3, 8, 6, 6, 10, 1, 0];
    let board = start;
    for (const index of presses) {
      board = turn(board, index).board;
      expect(upCount(board)).toBeLessThanOrEqual(2);
      expect(board.open.length).toBeLessThanOrEqual(2);
    }
  });

  it('holds the invariants for four hundred random presses, from three seeds', () => {
    // The hand-written sequences above pick the cases a designer thought of.
    // This one picks the cases nobody thought of — and every step checks the
    // whole board, not just the card that was pressed.
    for (const seed of [1, 7, 2026]) {
      const random = seeded(seed);
      let board = boardOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      for (let press = 0; press < 400; press += 1) {
        const index = Math.floor(random() * board.faces.length);
        const before = board;
        const result = turn(board, index);
        board = result.board;

        expect(board.open.length, `seed ${seed}, press ${press}`).toBeLessThanOrEqual(2);
        // `open` is not a second source of truth: it is exactly the up cards.
        expect(upCount(board)).toBe(board.open.length);
        for (const card of board.open) expect(board.faces[card]).toBe('up');
        expect(board.kept * 2).toBe(board.faces.filter((face) => face === 'kept').length);
        expect(board.log.length).toBe(board.turns);

        if (result.event === 'ignored') expect(board).toBe(before);
        if (isComplete(before)) {
          // A finished board is finished: every further press is ignored.
          expect(result.event).toBe('ignored');
          expect(board).toBe(before);
        }
      }

      expect(isComplete(board), `seed ${seed} should finish inside 400 presses`).toBe(true);
      expect(board.kept).toBe(9);
    }
  });
});

describe('turn: the end', () => {
  it('reports won instead of second-match on the last pair', () => {
    const start = boardOf([1, 2, 2, 1, 3, 3]);
    const one = turn(start, 0).board;
    const firstPair = turn(one, 3);
    expect(firstPair.event).toBe('second-match');
    expect(firstPair.board.kept).toBe(1);

    const secondPair = turn(firstPair.board, 1);
    const two = turn(secondPair.board, 2);
    expect(two.event).toBe('second-match');
    expect(two.board.kept).toBe(2);

    const last = turn(turn(two.board, 4).board, 5);
    expect(last.event).toBe('won');
    expect(isComplete(last.board)).toBe(true);
    expect(last.board.kept).toBe(3);
  });

  it('only reports won once, and only on the board that finishes', () => {
    const start = boardOf([1, 1]);
    const only = turn(turn(start, 0).board, 1);
    expect(only.event).toBe('won');
    expect(turn(only.board, 0).event).toBe('ignored');
  });

  it('is not complete before it is finished', () => {
    const start = boardOf([1, 2, 2, 1]);
    expect(isComplete(start)).toBe(false);
    // One pair out of two is half a board, whatever the faces say.
    expect(isComplete(turn(turn(start, 1).board, 2).board)).toBe(false);
    expect(isComplete(turn(turn(boardOf([1, 1]), 0).board, 1).board)).toBe(true);
  });
});
