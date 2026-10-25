import { describe, expect, it } from 'vitest';
import { BLANK, CROSS, FILL, type Mark, pictureComplete } from '../src/board';
import { nextHint } from '../src/hints';
import { PICTURES } from '../src/pictures';
import { puzzleByPictureId, puzzleFromPicture } from '../src/puzzle';

describe('nextHint', () => {
  it('starts from a row or a column, and names one square', () => {
    const puzzle = puzzleFromPicture(PICTURES[0]);
    const hint = nextHint(puzzle, new Uint8Array(puzzle.rows * puzzle.cols));
    expect(hint.kind).toBe('step');
    expect(hint.cell).not.toBeNull();
    expect(hint.mark === FILL || hint.mark === CROSS).toBe(true);
    expect(hint.focus.length).toBeGreaterThan(0);
    expect(hint.message).toMatch(/^(Row|Column) \d+/);
    expect(hint.message.endsWith('.')).toBe(true);
  });

  it('never points at a square the picture disagrees with', () => {
    for (const picture of PICTURES) {
      const puzzle = puzzleFromPicture(picture);
      const hint = nextHint(puzzle, new Uint8Array(puzzle.rows * puzzle.cols));
      expect(hint.kind, picture.id).toBe('step');
      const want = puzzle.solution[hint.cell ?? 0] === 1 ? FILL : CROSS;
      expect(hint.mark, picture.id).toBe(want);
    }
  });

  it('finishes every picture, one honest square at a time', () => {
    // The end-to-end promise: take every hint you are offered and the picture
    // completes, always agreeing with the drawing. A hint that reasons from a
    // wrong deduction could not survive this.
    for (const picture of PICTURES) {
      const puzzle = puzzleFromPicture(picture);
      const marks = new Uint8Array(puzzle.rows * puzzle.cols);
      for (let step = 0; step < 200; step++) {
        const hint = nextHint(puzzle, marks);
        if (hint.kind === 'complete') break;
        expect(hint.kind, `${picture.id} after ${step} hints: ${hint.message}`).toBe('step');
        const cell = hint.cell ?? -1;
        const want: Mark = puzzle.solution[cell] === 1 ? FILL : CROSS;
        expect(hint.mark, `${picture.id} cell ${cell}`).toBe(want);
        marks[cell] = want;
      }
      expect(pictureComplete(marks, puzzle), picture.id).toBe(true);
    }
  });

  it('never names a square that is not still blank', () => {
    // The hint is the only voice allowed to touch a square the player did not,
    // so a hint that points at a filled or crossed cell is the one bug that
    // silently destroys work. This walks every picture from an empty board and
    // checks the square *before* applying the hint, which is the only moment
    // the mistake would still be visible.
    for (const picture of PICTURES) {
      const puzzle = puzzleFromPicture(picture);
      const marks = new Uint8Array(puzzle.rows * puzzle.cols);
      const budget = puzzle.rows * puzzle.cols + 1;
      let applied = 0;

      for (;;) {
        const hint = nextHint(puzzle, marks);
        if (hint.kind === 'complete') break;
        expect(hint.kind, `${picture.id} after ${applied} hints: ${hint.message}`).toBe('step');

        const cell = hint.cell ?? -1;
        const mark = hint.mark;
        expect(cell, picture.id).toBeGreaterThanOrEqual(0);
        expect(mark === FILL || mark === CROSS, `${picture.id} cell ${cell}`).toBe(true);
        expect(hint.focus, `${picture.id} cell ${cell} should be inside the line it reasons from`).toContain(
          cell,
        );
        // The sentence and the coordinates have to be about the same line, or
        // the player is told to look somewhere other than where the answer is.
        const named =
          hint.axis === 'row' ? `Row ${(hint.index ?? -1) + 1}` : `Column ${(hint.index ?? -1) + 1}`;
        expect(hint.message.startsWith(named), `${picture.id}: "${hint.message}" vs ${named}`).toBe(true);
        expect(marks[cell], `${picture.id}: hint named cell ${cell}, which is already marked`).toBe(BLANK);

        marks[cell] = mark as Mark;
        applied += 1;
        expect(applied, `${picture.id} took more hints than it has squares`).toBeLessThan(budget);
      }

      expect(pictureComplete(marks, puzzle), picture.id).toBe(true);
    }
  });

  it('says so when the board is finished', () => {
    const puzzle = puzzleFromPicture(PICTURES[1]);
    const marks = Uint8Array.from(puzzle.solution);
    const hint = nextHint(puzzle, marks);
    expect(hint.kind).toBe('complete');
    expect(hint.cell).toBeNull();
    expect(hint.message).toContain(puzzle.name);
  });

  it('refuses to reason from a cross that cannot be right', () => {
    const puzzle = puzzleByPictureId('leaf');
    if (!puzzle) throw new Error('the leaf picture is part of the library');
    const marks = new Uint8Array(puzzle.rows * puzzle.cols);
    // The leaf's middle row is full, so crossing out its first square makes the
    // row's clue unsatisfiable. The hint has to notice that instead of building
    // on it.
    const middle = puzzle.rowClues.findIndex((clue) => clue.length === 1 && clue[0] === puzzle.cols);
    marks[middle * puzzle.cols] = CROSS;
    const hint = nextHint(puzzle, marks);
    expect(hint.kind).toBe('conflict');
    expect(hint.cell).toBeNull();
    expect(hint.message).toContain(`Row ${middle + 1}`);
  });

  it('leaves a square the player already got right alone', () => {
    const puzzle = puzzleFromPicture(PICTURES[3]);
    const marks = new Uint8Array(puzzle.rows * puzzle.cols);
    const first = nextHint(puzzle, marks);
    if (first.cell === null || first.mark === null) throw new Error('expected a step');
    marks[first.cell] = first.mark;
    const second = nextHint(puzzle, marks);
    expect(second.cell).not.toBe(first.cell);
    expect(marks[second.cell ?? 0]).toBe(BLANK);
  });
});
