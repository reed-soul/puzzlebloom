/**
 * The player's board, and the two questions the interface asks of it: "is this
 * line finished" and "is the picture finished".
 *
 * Marks are numbers rather than strings because there are a hundred of them and
 * they are copied on every stroke. The three states are deliberately not
 * symmetrical in meaning: `blank` is "not decided", `cross` is "decided empty".
 * That distinction is the whole game, so it lives in the type.
 */

import type { LineCell } from './lineSolve';
import type { Puzzle } from './puzzle';

export type Mark = 0 | 1 | 2;

export const BLANK: Mark = 0;
export const FILL: Mark = 1;
export const CROSS: Mark = 2;

export function isMark(value: unknown): value is Mark {
  return value === BLANK || value === FILL || value === CROSS;
}

export const rowOf = (index: number, cols: number): number => Math.floor(index / cols);
export const colOf = (index: number, cols: number): number => index % cols;
export const indexOf = (row: number, col: number, cols: number): number => row * cols + col;

export function blankMarks(puzzle: Puzzle): Uint8Array {
  return new Uint8Array(puzzle.rows * puzzle.cols);
}

/** A player's marks, read as one line of the grid. */
export function lineMarks(marks: Uint8Array, puzzle: Puzzle, axis: 'row' | 'column', index: number) {
  const line: LineCell[] = [];
  const cells: number[] = [];
  if (axis === 'row') {
    for (let col = 0; col < puzzle.cols; col++) cells.push(indexOf(index, col, puzzle.cols));
  } else {
    for (let row = 0; row < puzzle.rows; row++) cells.push(indexOf(row, index, puzzle.cols));
  }
  for (const cell of cells) {
    const mark = marks[cell];
    line.push(mark === FILL ? 'filled' : mark === CROSS ? 'empty' : 'unknown');
  }
  return { cells, line };
}

/**
 * Whether a line agrees with the picture.
 *
 * Crosses are ignored on purpose: a player who has filled every square of a row
 * has finished that row, and asking them to also cross nine blanks would be
 * bookkeeping rather than puzzle. The clue strip goes quiet for a line whose
 * picture is empty from the start, which is truthful — there is nothing to do
 * there — and it is the one piece of positive feedback this game has.
 */
export function lineSettled(marks: Uint8Array, puzzle: Puzzle, axis: 'row' | 'column', index: number) {
  const { cells } = lineMarks(marks, puzzle, axis, index);
  for (const cell of cells) {
    if ((marks[cell] === FILL) !== (puzzle.solution[cell] === 1)) return false;
  }
  return true;
}

/** Every filled square of the picture is filled, and nothing else is. */
export function pictureComplete(marks: Uint8Array, puzzle: Puzzle): boolean {
  const total = puzzle.rows * puzzle.cols;
  if (marks.length !== total) return false;
  for (let cell = 0; cell < total; cell++) {
    if ((marks[cell] === FILL) !== (puzzle.solution[cell] === 1)) return false;
  }
  return true;
}

/** How many squares are still wrong, for the win panel's arithmetic. */
export function filledCount(marks: Uint8Array): number {
  let total = 0;
  for (const mark of marks) if (mark === FILL) total += 1;
  return total;
}
