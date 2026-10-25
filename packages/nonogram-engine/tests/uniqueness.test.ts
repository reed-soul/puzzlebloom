/**
 * A second opinion on the one claim the whole game rests on: each puzzle has
 * exactly one answer.
 *
 * The engine says this is true by construction — the clues are read off the
 * drawing, so the drawing is a solution, and `solve.ts` proves there is no
 * other one by propagation. That reasoning is sound but it is *inside* the
 * thing being tested. This file solves the same puzzles a completely different
 * way: enumerate every row that fits its clue, place them one row at a time,
 * and throw away a partial board the moment a column can no longer become its
 * clue. No DP, no shared line solver, no hint machinery.
 *
 * The point is not that the search is better. It is that two unrelated methods
 * agreeing on "one solution" is evidence, where one method asserting its own
 * consistency is not.
 */

import { describe, expect, it } from 'vitest';
import { pictureById } from '../src/pictures';
import { type Puzzle, puzzleFromPicture, puzzlesOfSize } from '../src/puzzle';

/** The run lengths of a 0/1 line, the way the clue beside it is printed. */
function runsOf(line: readonly number[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell) {
      run += 1;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);
  return runs;
}

const sameRuns = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((run, index) => run === b[index]);

/** `[0]` and `[]` mean the same thing to the grid; compare the positive runs. */
const runs = (clue: readonly number[]): number[] => clue.filter((run) => run > 0);

/**
 * Every row of `width` cells that reads as this clue. Straight enumeration of
 * the 2^width lines, because at this size the clever version is the one with
 * the bug in it.
 */
function layoutsFor(clue: readonly number[], width: number): number[][] {
  const target = runs(clue);
  const layouts: number[][] = [];
  for (let mask = 0; mask < 2 ** width; mask++) {
    const line = Array.from({ length: width }, (_, index) => (mask >> index) & 1);
    if (sameRuns(runsOf(line), target)) layouts.push(line);
  }
  return layouts;
}

/**
 * Could this partial column still become the clue when the rows below arrive?
 *
 * Runs that have already been closed by a blank are final, so they have to
 * match the clue run for run. The run currently open at the bottom may still
 * grow, so it only has to be short enough to fit the run it would become.
 */
function columnCanStillFit(partial: readonly number[], clue: readonly number[]): boolean {
  const target = runs(clue);
  const closed: number[] = [];
  let open = 0;
  for (const cell of partial) {
    if (cell) {
      open += 1;
    } else if (open > 0) {
      closed.push(open);
      open = 0;
    }
  }
  if (closed.length > target.length) return false;
  for (let index = 0; index < closed.length; index++) {
    if (closed[index] !== target[index]) return false;
  }
  if (open > 0) {
    if (closed.length >= target.length) return false;
    if (open > target[closed.length]) return false;
  }
  return true;
}

interface SolutionCount {
  count: number;
  first: number[] | null;
}

/**
 * Row-by-row search with column pruning, stopping at `cap` answers.
 *
 * The cap is what makes an ambiguous puzzle cheap to detect: there is no need
 * to know whether a bad puzzle has two answers or two thousand.
 */
function countSolutions(puzzle: Puzzle, cap = 2): SolutionCount {
  const { rows, cols, rowClues, colClues } = puzzle;
  const rowLayouts = rowClues.map((clue) => layoutsFor(clue, cols));
  const columns: number[][] = Array.from({ length: cols }, () => []);
  const placed: number[] = [];
  const outcome: SolutionCount = { count: 0, first: null };

  const place = (row: number): void => {
    if (outcome.count >= cap) return;

    if (row === rows) {
      // Pruning is necessary, not sufficient: the last row can close a run of
      // the wrong length, so the finished board is checked against every clue.
      const fits = columns.every((cells, col) => sameRuns(runsOf(cells), runs(colClues[col])));
      if (!fits) return;
      if (
        rowClues.some(
          (clue, index) => !sameRuns(runsOf(placed.slice(index * cols, (index + 1) * cols)), runs(clue)),
        )
      ) {
        return;
      }
      outcome.count += 1;
      if (!outcome.first) outcome.first = [...placed];
      return;
    }

    for (const layout of rowLayouts[row]) {
      let viable = true;
      for (let col = 0; col < cols; col++) {
        columns[col].push(layout[col]);
        if (viable && !columnCanStillFit(columns[col], colClues[col])) viable = false;
      }
      if (viable) {
        placed.push(...layout);
        place(row + 1);
        placed.length -= cols;
      }
      for (let col = 0; col < cols; col++) columns[col].pop();
    }
  };

  place(0);
  return outcome;
}

/** The search has to be able to say "two", or "one" means nothing. */
describe('the independent solver can tell one answer from two', () => {
  it('finds the two answers of a puzzle the engine already calls ambiguous', () => {
    // The diagonal of a two-by-two: every clue is a single 1, and either
    // diagonal satisfies them. If this came back as one, the counter would be
    // broken in the direction that makes the real assertions meaningless.
    const ambiguous: Puzzle = {
      pictureId: 'ambiguous',
      name: 'Ambiguous',
      rows: 2,
      cols: 2,
      rowClues: [[1], [1]],
      colClues: [[1], [1]],
      solution: Uint8Array.from([1, 0, 0, 1]),
    };
    expect(countSolutions(ambiguous).count).toBe(2);
  });
});

describe('every shipped puzzle has exactly one answer', () => {
  it('and that answer is the drawing it was derived from', () => {
    // Both sizes run here. Ten wide is where the search would hurt if the
    // pruning were wrong, which is itself worth knowing.
    for (const size of [5, 10] as const) {
      for (const puzzle of puzzlesOfSize(size)) {
        const result = countSolutions(puzzle);
        expect(result.count, `${puzzle.pictureId} should have exactly one solution`).toBe(1);
        expect(result.first, puzzle.pictureId).toEqual(Array.from(puzzle.solution));
      }
    }
  });

  it('holds for a picture reached by id as well as by the list', () => {
    const picture = pictureById('tree');
    if (!picture) throw new Error('the tree picture is part of the library');
    expect(countSolutions(puzzleFromPicture(picture)).count).toBe(1);
  });
});
