/**
 * The hint, which is a sentence before it is an action.
 *
 * A hint reads the line the player is stuck on, states what that line proves,
 * and names the one square it proves it about. The panel on screen offers the
 * sentence first and a button second: reading the reason is the exercise, and
 * a player who only wants to move on can still take the square.
 *
 * Two rules keep it honest. It only ever names a square that *every* arrangement
 * of that line agrees about — the deduction comes from `solveLine`, not from
 * the answer. And before offering anything it checks the line against the
 * picture: if the marks in it cannot be right, the hint says so instead of
 * building on a mistake, because a hint that reasons from a wrong cross is a
 * hint that lies.
 */

import { BLANK, CROSS, FILL, lineMarks, type Mark, pictureComplete } from './board';
import { type Clue, clueRuns } from './clues';
import { type LineCell, solveLine } from './lineSolve';
import type { Puzzle } from './puzzle';

export type HintKind = 'step' | 'conflict' | 'complete' | 'stuck';

export interface Hint {
  kind: HintKind;
  /** Which line the sentence is about. Null when the hint is about the board. */
  axis: 'row' | 'column' | null;
  index: number | null;
  /** The square to change, and what to change it to. */
  cell: number | null;
  mark: Mark | null;
  message: string;
  /** The line the reasoning came from, so the board can point at it. */
  focus: number[];
}

const lineName = (axis: 'row' | 'column', index: number): string =>
  axis === 'row' ? `Row ${index + 1}` : `Column ${index + 1}`;

/** `column 4` — the position across a row, or down a column. */
const positionName = (axis: 'row' | 'column', position: number): string =>
  axis === 'row' ? `column ${position + 1}` : `row ${position + 1}`;

const positionRange = (axis: 'row' | 'column', from: number, to: number): string => {
  if (from === to) return positionName(axis, from);
  const noun = axis === 'row' ? 'columns' : 'rows';
  return `${noun} ${from + 1} to ${to + 1}`;
};

const contiguous = (positions: number[]): boolean =>
  positions.every((position, index) => index === 0 || position === positions[index - 1] + 1);

/**
 * One sentence per shape of reasoning. There are only four because there are
 * only four things a single line can prove, and a child who has read them once
 * starts recognising the shapes rather than the words.
 */
function explain(
  axis: 'row' | 'column',
  index: number,
  clue: Clue,
  lineLength: number,
  deduction: { filled: number[]; empty: number[] },
  target: number,
  fill: boolean,
): string {
  const runs = clueRuns(clue);
  const settled = deduction.filled.length + deduction.empty.length;
  const where = positionName(axis, target);

  if (runs.length === 0) {
    return `${lineName(axis, index)} has no numbers, so ${where} stays empty.`;
  }

  const cluePhrase = `a clue of ${runs.join(' ')}`;

  // The whole line is decided: this is the case a player can check by counting
  // on their fingers, so the sentence names the range rather than one square.
  if (settled === lineLength && fill && runs.length === 1 && contiguous(deduction.filled)) {
    const from = deduction.filled[0];
    const to = deduction.filled[deduction.filled.length - 1];
    return `${lineName(axis, index)} holds one run of ${runs[0]}, which fits only at ${positionRange(axis, from, to)}.`;
  }

  if (settled === lineLength) {
    return `${lineName(axis, index)} has ${cluePhrase}, and only one arrangement fits: ${where} ${fill ? 'is filled' : 'stays empty'}.`;
  }

  return `${lineName(axis, index)} has ${cluePhrase}, and ${where} ${fill ? 'is filled' : 'stays empty'} however the runs are arranged.`;
}

export function nextHint(puzzle: Puzzle, marks: Uint8Array): Hint {
  if (pictureComplete(marks, puzzle)) {
    return {
      kind: 'complete',
      axis: null,
      index: null,
      cell: null,
      mark: null,
      message: `The picture is finished: ${puzzle.name}. Nothing left to work out.`,
      focus: [],
    };
  }

  // Two passes, in this order and not the other way round. A board with a wrong
  // mark in it can still offer true deductions, but handing one over wastes the
  // player's attention: the useful news is that something is already broken.
  const conflict = scanLines(puzzle, marks, (axis, index, cells, line, clue) => {
    const deduction = solveLine(line, clue);
    if (!deduction.consistent) return conflictHint(axis, index, cells);
    const fillsOutsidePicture = deduction.filled.some((position) => puzzle.solution[cells[position]] !== 1);
    const emptiesInsidePicture = deduction.empty.some((position) => puzzle.solution[cells[position]] === 1);
    return fillsOutsidePicture || emptiesInsidePicture ? conflictHint(axis, index, cells) : null;
  });
  if (conflict) return conflict;

  const step = scanLines(puzzle, marks, (axis, index, cells, line, clue) => {
    const deduction = solveLine(line, clue);
    // A conflict has been ruled out above, so anything the line proves agrees
    // with the picture and the only question left is whether the square is
    // still blank.
    for (const position of [...deduction.filled, ...deduction.empty]) {
      const cell = cells[position];
      if (marks[cell] !== BLANK) continue;
      const fill = deduction.filled.includes(position);
      return {
        kind: 'step',
        axis,
        index,
        cell,
        mark: fill ? FILL : CROSS,
        message: explain(axis, index, clue, line.length, deduction, position, fill),
        focus: cells,
      };
    }
    return null;
  });
  if (step) return step;

  return {
    kind: 'stuck',
    axis: null,
    index: null,
    cell: null,
    mark: null,
    message: 'Nothing follows from the numbers alone just here. Try a row or column with the longest clue.',
    focus: [],
  };
}

type LineVisitor = (
  axis: 'row' | 'column',
  index: number,
  cells: number[],
  line: LineCell[],
  clue: Clue,
) => Hint | null;

function scanLines(puzzle: Puzzle, marks: Uint8Array, visit: LineVisitor): Hint | null {
  const axes = ['row', 'column'] as const;
  for (const axis of axes) {
    const lines = axis === 'row' ? puzzle.rows : puzzle.cols;
    for (let index = 0; index < lines; index++) {
      const { cells, line } = lineMarks(marks, puzzle, axis, index);
      const clue = axis === 'row' ? puzzle.rowClues[index] : puzzle.colClues[index];
      const hit = visit(axis, index, cells, line, clue);
      if (hit) return hit;
    }
  }
  return null;
}

function conflictHint(axis: 'row' | 'column', index: number, cells: number[]): Hint {
  return {
    kind: 'conflict',
    axis,
    index,
    cell: null,
    mark: null,
    message: `${lineName(axis, index)} cannot be read the way it is marked. One of the squares or crosses in it is wrong.`,
    focus: cells,
  };
}
