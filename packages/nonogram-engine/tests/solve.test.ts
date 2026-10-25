import { describe, expect, it } from 'vitest';
import { FILL } from '../src/board';
import { PICTURES, SIZES } from '../src/pictures';
import { type Puzzle, puzzleByPictureId, puzzleFromPicture, puzzlesOfSize } from '../src/puzzle';
import { isLogicallySolvable, solveByLogic } from '../src/solve';

describe('puzzleFromPicture', () => {
  it('derives clues that describe the drawing', () => {
    const puzzle = puzzleFromPicture(PICTURES[0]);
    expect(puzzle.rowClues).toHaveLength(puzzle.rows);
    expect(puzzle.colClues).toHaveLength(puzzle.cols);

    const leaf = puzzleByPictureId('leaf');
    expect(leaf?.rowClues).toEqual([[0], [3], [5], [3], [1]]);
    expect(leaf?.colClues).toEqual([[1], [3], [4], [3], [1]]);
  });

  it('keeps the answer with the puzzle, because it is the picture', () => {
    const puzzle = puzzleFromPicture(PICTURES[0]);
    const filled = Array.from(puzzle.solution).filter((cell) => cell === 1).length;
    const drawn = PICTURES[0].grid
      .join('')
      .split('')
      .filter((cell) => cell === '#').length;
    expect(filled).toBe(drawn);
  });

  it('is deterministic', () => {
    const first = puzzleFromPicture(PICTURES[2]);
    const second = puzzleFromPicture(PICTURES[2]);
    expect(first.rowClues).toEqual(second.rowClues);
    expect(first.colClues).toEqual(second.colClues);
  });

  it('returns null for a picture that does not exist', () => {
    expect(puzzleByPictureId('no-such-picture')).toBeNull();
  });
});

describe('solveByLogic', () => {
  it('finishes every picture in the library', () => {
    // This is the load-bearing assertion of the whole engine. If it fails for a
    // picture, hints for that picture can become impossible, so the drawing is
    // what has to change — not the solver.
    //
    // The count is asserted first so the check cannot pass vacuously: a library
    // that lost a picture would otherwise satisfy `filter(...)` with an empty
    // list and look like a green run.
    expect(PICTURES).toHaveLength(8);
    const stuck = PICTURES.filter((picture) => !isLogicallySolvable(puzzleFromPicture(picture)));
    expect(stuck.map((picture) => picture.id)).toEqual([]);
  });

  it('reaches the picture it started from', () => {
    for (const size of SIZES) {
      for (const puzzle of puzzlesOfSize(size)) {
        const result = solveByLogic(puzzle);
        expect(result.solved, puzzle.pictureId).toBe(true);
        expect(result.guessesNeeded).toBe(0);
        for (let cell = 0; cell < puzzle.solution.length; cell++) {
          expect(result.marks[cell] === FILL, `${puzzle.pictureId} cell ${cell}`).toBe(
            puzzle.solution[cell] === 1,
          );
        }
      }
    }
  });

  it('records which line each deduction came from', () => {
    const result = solveByLogic(puzzlesOfSize(5)[0]);
    expect(result.steps.length).toBeGreaterThan(0);
    for (const step of result.steps) {
      expect(['row', 'column']).toContain(step.axis);
      expect(step.cells.length).toBeGreaterThan(0);
    }
    expect(result.steps.some((step) => step.axis === 'row')).toBe(true);
    expect(result.steps.some((step) => step.axis === 'column')).toBe(true);
  });

  it('says so when a puzzle needs a guess rather than pretending', () => {
    // A two-by-two with a diagonal: two arrangements satisfy every clue, and no
    // amount of line reasoning separates them.
    const ambiguous: Puzzle = {
      pictureId: 'ambiguous',
      name: 'Ambiguous',
      rows: 2,
      cols: 2,
      rowClues: [[1], [1]],
      colClues: [[1], [1]],
      solution: Uint8Array.from([1, 0, 0, 1]),
    };
    const result = solveByLogic(ambiguous);
    expect(result.solved).toBe(false);
    expect(result.guessesNeeded).toBe(1);
    expect(result.steps).toEqual([]);
  });
});
