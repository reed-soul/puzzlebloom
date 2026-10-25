/**
 * Turning a picture into a puzzle, and picking which picture a puzzle is about.
 *
 * Both directions are deterministic: the same picture always yields the same
 * clues, and the same seed always yields the same picture. There is no
 * generator that could fail, no timeout, no retry loop, and no chance of a
 * puzzle with two solutions — properties this game gets for free by starting
 * from the answer.
 */

import { type Clue, lineToClue } from './clues';
import { type Picture, pictureById, picturesOfSize, pictureWidth, type Size, solutionOf } from './pictures';

export interface Puzzle {
  pictureId: string;
  /** The name the picture is given once it is finished. */
  name: string;
  rows: number;
  cols: number;
  rowClues: Clue[];
  colClues: Clue[];
  /** 1 where the picture is filled, 0 elsewhere. Reading order. */
  solution: Uint8Array;
}

export function puzzleFromPicture(picture: Picture): Puzzle {
  const cols = pictureWidth(picture);
  const cells = solutionOf(picture);

  const rowClues: Clue[] = [];
  for (let row = 0; row < picture.rows; row++) {
    rowClues.push(lineToClue(Array.from(cells.subarray(row * cols, row * cols + cols))));
  }

  const colClues: Clue[] = [];
  for (let col = 0; col < cols; col++) {
    const column: number[] = [];
    for (let row = 0; row < picture.rows; row++) column.push(cells[row * cols + col]);
    colClues.push(lineToClue(column));
  }

  return {
    pictureId: picture.id,
    name: picture.name,
    rows: picture.rows,
    cols,
    rowClues,
    colClues,
    solution: cells,
  };
}

/** Every puzzle of a size, in the order the pictures are declared. */
export function puzzlesOfSize(size: Size): Puzzle[] {
  return picturesOfSize(size).map(puzzleFromPicture);
}

/**
 * Seed to puzzle. Used for "another one" and for the daily; the caller decides
 * what the seed means, which keeps the daily rule in `daily.ts` and the
 * ordinary shuffle in the component.
 */
export function puzzleForSize(size: Size, seed: number): Puzzle {
  const puzzles = puzzlesOfSize(size);
  const index = Math.abs(Math.trunc(seed)) % puzzles.length;
  return puzzles[index];
}

export function puzzleByPictureId(id: string): Puzzle | null {
  const picture = pictureById(id);
  return picture ? puzzleFromPicture(picture) : null;
}
