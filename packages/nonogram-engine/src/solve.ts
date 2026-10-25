/**
 * Line reasoning, repeated until it stops producing anything.
 *
 * Rows and columns constrain each other: a column deduction makes a row's clue
 * narrower, which makes another column's deduction possible. Running the two
 * axes alternately to a fixed point is the whole solver, and its stopping
 * condition is the interesting part — when nothing moves, the puzzle is either
 * finished or needs a guess, and those are the only two states this game wants
 * to know about.
 *
 * It does not guess. A picture that cannot be finished by line reasoning alone
 * would make hints sometimes impossible and always unsatisfying, so such a
 * picture is rejected by the test suite rather than papered over with a search.
 */

import { BLANK, CROSS, FILL, lineMarks, pictureComplete } from './board';
import { solveLine } from './lineSolve';
import type { Puzzle } from './puzzle';

export interface SolveStep {
  axis: 'row' | 'column';
  index: number;
  /** Flat cell indices this line settled, in reading order. */
  cells: number[];
}

export interface SolveResult {
  solved: boolean;
  /**
   * 0 for a puzzle line reasoning finishes. 1 when it stalls, which is as far
   * as this engine will commit: the number is a verdict, not a search budget.
   */
  guessesNeeded: number;
  steps: SolveStep[];
  /** What the propagation reached: 1 filled, 2 crossed, 0 still undecided. */
  marks: Uint8Array;
}

const AXES = ['row', 'column'] as const;

export function solveByLogic(puzzle: Puzzle): SolveResult {
  const marks = new Uint8Array(puzzle.rows * puzzle.cols);
  const steps: SolveStep[] = [];

  // Each pass settles at least one cell or the loop ends, so a bound of a few
  // passes per cell is generous. It exists only so a bug cannot spin forever.
  const passLimit = puzzle.rows * puzzle.cols * 2 + 16;
  let pass = 0;
  let moved = true;

  while (moved && pass < passLimit) {
    moved = false;
    pass += 1;

    for (const axis of AXES) {
      const lines = axis === 'row' ? puzzle.rows : puzzle.cols;
      for (let index = 0; index < lines; index++) {
        const { cells, line } = lineMarks(marks, puzzle, axis, index);
        const clue = axis === 'row' ? puzzle.rowClues[index] : puzzle.colClues[index];
        const deduction = solveLine(line, clue);
        if (!deduction.consistent) continue;

        const settled: number[] = [];
        for (const position of deduction.filled) {
          const cell = cells[position];
          if (marks[cell] === BLANK) {
            marks[cell] = FILL;
            settled.push(cell);
          }
        }
        for (const position of deduction.empty) {
          const cell = cells[position];
          if (marks[cell] === BLANK) {
            marks[cell] = CROSS;
            settled.push(cell);
          }
        }
        if (settled.length > 0) {
          settled.sort((a, b) => a - b);
          steps.push({ axis, index, cells: settled });
          moved = true;
        }
      }
    }
  }

  const solved = pictureComplete(marks, puzzle);
  return { solved, guessesNeeded: solved ? 0 : 1, steps, marks };
}

/** A one-line verdict, for the tests and for anything that wants to grade a picture. */
export function isLogicallySolvable(puzzle: Puzzle): boolean {
  return solveByLogic(puzzle).solved;
}
