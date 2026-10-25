import { describe, expect, it } from 'vitest';
import {
  type Board,
  type Creature,
  columnsFor,
  deal,
  nextHint,
  PAIRS_BY_LEVEL,
  seenIn,
  turn,
} from '../src/index';

/** Play a list of presses, so `seenIn` has a real round to read. */
function play(board: Board, presses: readonly number[]): Board {
  let next = board;
  for (const index of presses) next = turn(next, index).board;
  return next;
}

/**
 * A board stated as a literal.
 *
 * The hint tests that are about *where* a card is need to know that the two
 * cards they turn over do not match; taking that from a shuffled deal would make
 * the test pass or fail on the seed.
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

const NINE_PAIRS: Creature[] = [1, 1, 2, 2, 3, 4, 3, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9];

describe('nextHint', () => {
  it('has nothing to say before the player has turned anything', () => {
    const board = deal(6, 11);
    expect(nextHint(board, seenIn(board), 3)).toBeNull();
  });

  it('points only at a card the player has already turned', () => {
    // Three presses: two cards that missed, then a third that covered them and
    // turned itself over. The only face-down cards this round has shown are the
    // two from the miss, so the hint has to pick one of them.
    const board = play(boardOf([1, 2, 2, 1, 3, 3]), [0, 1, 2]);
    const seen = seenIn(board);
    const hint = nextHint(board, seen, 3);

    expect(hint).not.toBeNull();
    if (!hint) return;
    expect(seen.has(hint.index)).toBe(true);
    expect([0, 1]).toContain(hint.index);
    expect(board.faces[hint.index]).toBe('down');
  });

  it('has nothing to say while two unseen cards are in hand', () => {
    // After a miss both cards are still face up, so there is no face-down card
    // the player has seen — which is a true "nothing yet", not a bug.
    const board = play(boardOf([1, 2, 2, 1, 3, 3]), [0, 1]);
    expect(nextHint(board, seenIn(board), 3)).toBeNull();
  });

  it('never points at a card the player has not seen, in any position', () => {
    // Every deal, several lengths of play, several column counts. The invariant
    // is one line long and is the only rule this module has.
    for (let seed = 1; seed <= 12; seed += 1) {
      const dealt = deal(PAIRS_BY_LEVEL.large, seed);
      for (let length = 0; length <= 10; length += 1) {
        const presses = Array.from({ length }, (_, step) => (step * 7 + seed) % dealt.faces.length);
        const board = play(dealt, presses);
        const seen = seenIn(board);
        for (const columns of [3, 4, 6]) {
          const hint = nextHint(board, seen, columns);
          if (!hint) continue;
          expect(seen.has(hint.index), `seed ${seed}, ${length} presses, ${columns} columns`).toBe(true);
          expect(board.faces[hint.index]).toBe('down');
        }
      }
    }
  });

  it('names the row the card is in, in the layout it was asked about', () => {
    // Cards 5 and 6 hold different creatures, so turning them is a miss; the
    // seventh press covers that pair again. Card 5 is index 4: second row of
    // three, first row of six.
    const board = play(boardOf([...NINE_PAIRS]), [4, 5, 6]);
    const seen = seenIn(board);

    const narrow = nextHint(board, seen, 3);
    const wide = nextHint(board, seen, 6);
    expect(narrow?.index).toBe(4);
    expect(narrow?.message).toContain('second row');
    expect(wide?.index).toBe(4);
    expect(wide?.message).toContain('first row');
  });

  it('names the creature rather than a number', () => {
    const board = play(boardOf([1, 2, 2, 1, 3, 3]), [0, 1, 2]);
    const hint = nextHint(board, seenIn(board), 3);
    expect(hint).not.toBeNull();
    if (!hint) return;
    expect(hint.message).toBe('You turned the bear over in the first row. It is still face down.');
  });

  it('says the same thing twice if nothing has changed', () => {
    const board = play(boardOf([1, 2, 2, 1, 3, 3]), [2, 3, 4]);
    const seen = seenIn(board);
    const hint = nextHint(board, seen, 3);
    expect(hint).not.toBeNull();
    expect(hint).toEqual(nextHint(board, seen, 3));
  });

  it('skips a seen card that is currently face up', () => {
    const board = play(boardOf([1, 2, 2, 1, 3, 3]), [2]);
    // Card 3 (index 2) was turned and is still up. The caller says it has also
    // seen card 6 (index 5), which is face down: that is the one to mention.
    expect(nextHint(board, new Set([2, 5]), 3)?.index).toBe(5);
    expect(nextHint(board, new Set([2]), 3)).toBeNull();
  });

  it('never falls back to an unseen card when the first card is unseen', () => {
    // The mutation this test exists to catch is deleting the `seen.has` line:
    // without it the scan stops at card 1, which nobody has turned over. Cards
    // 5 and 6 (index 4 and 5) are the only ones this round has shown, and they
    // are face down again after the third press.
    const board = play(boardOf([1, 2, 3, 1, 2, 3]), [4, 5, 3]);
    expect(board.faces[0]).toBe('down');
    expect(seenIn(board).has(0)).toBe(false);

    const hint = nextHint(board, seenIn(board), 3);
    expect(hint).not.toBeNull();
    expect(hint?.index).toBe(4);
    expect(seenIn(board).has(hint?.index ?? -1)).toBe(true);
    expect(board.faces[hint?.index ?? -1]).toBe('down');
  });

  it('names the row of the card it picked, for every column count the grid uses', () => {
    // The row is the one thing the message claims about the layout, so it is
    // checked against the arithmetic rather than against a hand-written string.
    // Card 5 (index 4) sits in row 2 of three, row 2 of four, row 1 of six.
    const board = play(boardOf([...NINE_PAIRS]), [4, 5, 6]);
    const seen = seenIn(board);
    const WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

    for (const columns of [2, 3, 4, 6]) {
      const hint = nextHint(board, seen, columns);
      expect(hint?.index).toBe(4);
      const row = Math.floor(4 / columns) + 1;
      expect(hint?.message, `${columns} columns`).toContain(`in the ${WORDS[row - 1]} row`);
    }
  });

  it('points at a card the player has seen, over three hundred random rounds', () => {
    // Deterministic randomness: the same three hundred rounds every run, so a
    // failure is reproducible. Every round is played by pressing random cards,
    // which produces states no hand-written case would think of — including the
    // three-card and two-in-hand shapes.
    let state = 99;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };

    for (let round = 0; round < 300; round += 1) {
      const dealt = deal(PAIRS_BY_LEVEL.large, round + 1);
      const presses: number[] = [];
      const length = Math.floor(random() * 24);
      for (let step = 0; step < length; step += 1) {
        presses.push(Math.floor(random() * dealt.faces.length));
      }
      const board = play(dealt, presses);

      // `seen` re-derived here from the log and the face-up cards, without
      // calling `seenIn`: the point of the fuzz is that the two agree.
      const seen = new Set<number>(board.open);
      for (const entry of board.log) {
        seen.add(entry.a);
        seen.add(entry.b);
      }
      expect([...seenIn(board)].sort((a, b) => a - b)).toEqual([...seen].sort((a, b) => a - b));

      const candidates = board.faces
        .map((face, index) => (face === 'down' && seen.has(index) ? index : -1))
        .filter((index) => index >= 0);
      const columns = [3, 4, 6][round % 3];
      const hint = nextHint(board, seen, columns);

      if (candidates.length === 0) {
        // Nothing honest to say. Silence, not a guess.
        expect(hint, `round ${round} should say nothing`).toBeNull();
        continue;
      }

      expect(hint, `round ${round} should say something`).not.toBeNull();
      expect(hint?.index, `round ${round}`).toBe(candidates[0]);
      expect(seen.has(hint?.index ?? -1)).toBe(true);
      expect(board.faces[hint?.index ?? -1]).toBe('down');
      expect(hint?.message).toContain('still face down');
    }
  });
});

describe('seenIn', () => {
  it('is the log plus the cards still face up', () => {
    const board = play(boardOf([1, 2, 3, 1, 2, 3]), [0, 1, 4]);
    expect([...seenIn(board)].sort((a, b) => a - b)).toEqual([0, 1, 4]);
  });

  it('is empty on a fresh board', () => {
    expect(seenIn(deal(6, 3)).size).toBe(0);
  });

  it('holds every card the round has turned, which is why a save need not store it', () => {
    const board = play(boardOf([1, 2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1]), [0, 1, 0, 2]);
    const fromLog = new Set(board.log.flatMap((entry) => [entry.a, entry.b]));
    for (const card of fromLog) expect(seenIn(board).has(card)).toBe(true);
    for (const card of board.open) expect(seenIn(board).has(card)).toBe(true);
  });
});

describe('columnsFor and the hint agree about the grid', () => {
  it('keeps an eighteen-card board inside six rows and six columns', () => {
    for (const wide of [false, true]) {
      const columns = columnsFor(9, wide);
      expect(Math.ceil(18 / columns)).toBeLessThanOrEqual(6);
    }
  });
});
