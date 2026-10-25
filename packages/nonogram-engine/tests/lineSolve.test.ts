import { describe, expect, it } from 'vitest';
import { lineToClue } from '../src/clues';
import { createRandom } from '../src/daily';
import { type LineCell, type LineDeduction, solveLine, solveLineByExhaustion } from '../src/lineSolve';

const repeat = (cell: LineCell, times: number): LineCell[] => new Array<LineCell>(times).fill(cell);

/**
 * The DP and the oracle must agree on all three answers, including "this line
 * cannot be right". Failures carry the input, because a disagreement between
 * two implementations is only useful if the message says which line caused it.
 */
const agree = (cells: LineCell[], clue: number[]): void => {
  const fast: LineDeduction = solveLine(cells, clue);
  const slow: LineDeduction = solveLineByExhaustion(cells, clue);
  const label = `states ${cells.join(',')} clue ${clue.join(' ')}`;
  expect(fast.consistent, label).toBe(slow.consistent);
  if (!fast.consistent) return;
  expect(fast.filled, `filled for ${label}`).toEqual(slow.filled);
  expect(fast.empty, `empty for ${label}`).toEqual(slow.empty);
};

describe('solveLine', () => {
  it('fills a line whose clue is exactly its width', () => {
    const result = solveLine(repeat('unknown', 5), [5]);
    expect(result.consistent).toBe(true);
    expect(result.filled).toEqual([0, 1, 2, 3, 4]);
    expect(result.empty).toEqual([]);
  });

  it('empties a line whose clue is [0]', () => {
    const result = solveLine(repeat('unknown', 4), [0]);
    expect(result.consistent).toBe(true);
    expect(result.filled).toEqual([]);
    expect(result.empty).toEqual([0, 1, 2, 3]);
  });

  it('finds the overlap of a single run and nothing else', () => {
    // Three arrangements fit 3 into 5: 0-2, 1-3, 2-4. Only the middle is common.
    const result = solveLine(repeat('unknown', 5), [3]);
    expect(result.filled).toEqual([2]);
    expect(result.empty).toEqual([]);
  });

  it('respects cells the player has already decided', () => {
    // The crossed cell at the end leaves the run of 4 only one place to sit.
    const cells: LineCell[] = ['unknown', 'unknown', 'unknown', 'unknown', 'empty'];
    const result = solveLine(cells, [4]);
    expect(result.filled).toEqual([0, 1, 2, 3]);
    expect(result.empty).toEqual([4]);
  });

  it('reports a cell the player has already filled as filled', () => {
    // Filled, empty and forced all mean "in every arrangement", so a mark that
    // is already there comes back out. The panel filters it out; the solver has
    // no reason to special-case it.
    const result = solveLine(['filled', 'unknown', 'unknown', 'unknown', 'empty'], [4]);
    expect(result.filled).toEqual([0, 1, 2, 3]);
  });

  it('reports an impossible line instead of guessing', () => {
    const cells: LineCell[] = ['filled', 'empty', 'filled', 'unknown', 'unknown'];
    const result = solveLine(cells, [4]);
    expect(result.consistent).toBe(false);
  });

  it('keeps a run off a cell the player has crossed out', () => {
    const cells: LineCell[] = ['unknown', 'unknown', 'empty', 'unknown', 'unknown'];
    const result = solveLine(cells, [2]);
    expect(result.consistent).toBe(true);
    // Two places for the run, 0-1 and 3-4, so nothing is forced either way —
    // and the cross the player made comes back as empty, because it is.
    expect(result.filled).toEqual([]);
    expect(result.empty).toEqual([2]);
  });

  it('leaves a genuinely ambiguous line alone', () => {
    // 1 in 4: four arrangements, no cell common to all of them. This line has to
    // be guessed, and the engine says so by returning nothing.
    const result = solveLine(repeat('unknown', 4), [1]);
    expect(result.consistent).toBe(true);
    expect(result.filled).toEqual([]);
    expect(result.empty).toEqual([]);
  });
});

describe('solveLine against the reference implementation', () => {
  const random = createRandom(20261025);

  it('agrees on every consistent random line', () => {
    for (let sample = 0; sample < 400; sample++) {
      const length = 1 + Math.floor(random() * 9);
      const answer = Array.from({ length }, () => random() < 0.45);
      const clue = lineToClue(answer);
      const cells: LineCell[] = answer.map((cell) => {
        const decided = random() < 0.55;
        if (!decided) return 'unknown';
        return cell ? 'filled' : 'empty';
      });
      agree(cells, clue);
    }
  });

  it('agrees on lines that have been marked wrongly', () => {
    for (let sample = 0; sample < 200; sample++) {
      const length = 2 + Math.floor(random() * 8);
      const answer = Array.from({ length }, () => random() < 0.5);
      const clue = lineToClue(answer);
      const cells: LineCell[] = answer.map((cell) => (cell ? 'filled' : 'empty'));
      // Flip a whole cell's state: the line now either needs a different
      // arrangement or has none at all. Both must be reported identically.
      const victim = Math.floor(random() * length);
      cells[victim] = cells[victim] === 'filled' ? 'empty' : 'filled';
      agree(cells, clue);
    }
  });

  it('agrees on lines that are fully known', () => {
    for (let sample = 0; sample < 100; sample++) {
      const length = 1 + Math.floor(random() * 8);
      const answer = Array.from({ length }, () => random() < 0.5);
      const clue = lineToClue(answer);
      agree(
        answer.map((cell) => (cell ? 'filled' : 'empty')),
        clue,
      );
    }
  });
});

describe('solveLine is exactly the oracle, not merely close to it', () => {
  /**
   * Complete rather than sampled: for every clue a line of this width can have,
   * crossed with every marking a player could have left on it. At width five
   * that is the whole input space (2ⁿ clues × 3ⁿ states), so agreement here is
   * a proof for short lines instead of evidence from a lucky seed.
   */
  const everyAnswer = (width: number): boolean[][] =>
    Array.from({ length: 2 ** width }, (_, mask) =>
      Array.from({ length: width }, (_, index) => ((mask >> index) & 1) === 1),
    );

  const everyMarking = (width: number): LineCell[][] => {
    const states: LineCell[] = ['unknown', 'filled', 'empty'];
    let markings: LineCell[][] = [[]];
    for (let index = 0; index < width; index++) {
      markings = markings.flatMap((prefix) => states.map((state) => [...prefix, state]));
    }
    return markings;
  };

  it('agrees on every line, clue and marking up to width five', () => {
    for (let width = 1; width <= 5; width++) {
      const clues = everyAnswer(width).map((answer) => lineToClue(answer));
      const markings = everyMarking(width);
      for (const cells of markings) {
        for (const clue of clues) agree(cells, clue);
      }
    }
  });

  it('agrees that a clue too long for the line fits nowhere', () => {
    // These clues describe no drawing of that width at all, which is a
    // different failure from "the player marked it wrong": the DP has to reject
    // them before any placement is considered.
    const impossible: Array<[number, number[]]> = [
      [3, [4]],
      [5, [6]],
      [5, [3, 3]],
      [5, [2, 2, 2]],
      [5, [5, 1]],
      [5, [1, 5]],
    ];
    for (const [width, clue] of impossible) {
      for (const cells of everyMarking(width)) {
        agree(cells, clue);
      }
    }
  });

  it('agrees on the shapes a random draw almost never produces', () => {
    // `[0]`, the full line, and alternating runs are the three cases where an
    // off-by-one in the DP hides. A random answer of width nine makes each of
    // them about once in five hundred draws, so they are written down here
    // with a marking on every square that is not simply the answer.
    // In order: the empty line, the full line, every other cell, two long runs,
    // a run at each end. All twelve wide, so `[1 1 1 1 1 1]` and `[6]` are both
    // legal clues for the same width.
    const shapes: boolean[][] = [
      new Array<boolean>(12).fill(false),
      new Array<boolean>(12).fill(true),
      [true, false, true, false, true, false, true, false, true, false, true, false],
      [true, true, true, false, false, true, true, true, true, false, true, true],
      [true, true, false, false, false, false, false, false, false, true, true, true],
    ];
    const random = createRandom(424242);
    const states: LineCell[] = ['unknown', 'filled', 'empty'];
    for (const answer of shapes) {
      const clue = lineToClue(answer);
      for (let sample = 0; sample < 40; sample++) {
        const cells = answer.map(() => states[Math.floor(random() * 3)]);
        agree(cells, clue);
      }
    }
  });

  it('agrees on lines wider than a ten-by-ten grid', () => {
    // The file's own comment promises this stays honest at fifteen wide, and a
    // brute force that only just fits is a trap for whoever grows the grid.
    const random = createRandom(90210);
    for (let sample = 0; sample < 120; sample++) {
      const length = 10 + Math.floor(random() * 3);
      const answer = Array.from({ length }, () => random() < 0.5);
      const clue = lineToClue(answer);
      const cells: LineCell[] = answer.map((cell) => {
        const roll = random();
        if (roll < 0.3) return 'unknown';
        return cell ? 'filled' : 'empty';
      });
      agree(cells, clue);
    }
  });
});

describe('solveLineByExhaustion', () => {
  it('is exhaustive rather than clever', () => {
    // Every cell of an empty 3-cell line with clue 1 is possible both ways, so
    // the reference implementation reports no forced cell either.
    const result = solveLineByExhaustion(repeat('unknown', 3), [1]);
    expect(result.consistent).toBe(true);
    expect(result.filled).toEqual([]);
    expect(result.empty).toEqual([]);
  });

  it('rejects a clue that cannot fit', () => {
    expect(solveLineByExhaustion(repeat('unknown', 3), [4]).consistent).toBe(false);
    expect(solveLineByExhaustion(['empty', 'empty'], [1]).consistent).toBe(false);
  });
});
