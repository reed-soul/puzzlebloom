import { describe, expect, it } from 'vitest';
import { clueLength, clueRuns, clueSpan, clueText, lineToClue } from '../src/clues';
import { PICTURES, picturesOfSize, pictureWidth } from '../src/pictures';

describe('lineToClue', () => {
  it('reads an empty line as [0], not as an empty list', () => {
    expect(lineToClue([false, false, false])).toEqual([0]);
    expect(lineToClue([0, 0, 0, 0])).toEqual([0]);
  });

  it('reads a full line as one run the length of the line', () => {
    expect(lineToClue([true, true, true, true, true])).toEqual([5]);
  });

  it('reads interleaved runs', () => {
    expect(lineToClue([true, true, false, true, false, true, true, true])).toEqual([2, 1, 3]);
  });

  it('ignores leading and trailing blanks', () => {
    expect(lineToClue([false, true, false])).toEqual([1]);
    expect(lineToClue([false, false])).toEqual([0]);
  });

  it('treats numbers as booleans, because the solver has already narrowed cells', () => {
    expect(lineToClue([1, 1, 0, 1])).toEqual([2, 1]);
  });
});

describe('clueText', () => {
  it('prints an empty clue as a single zero', () => {
    expect(clueText([0])).toBe('0');
    expect(clueText([])).toBe('0');
  });

  it('prints runs separated by a space', () => {
    expect(clueText([4])).toBe('4');
    expect(clueText([1, 2])).toBe('1 2');
    expect(clueText([0, 3, 0, 1])).toBe('3 1');
  });
});

describe('clue arithmetic', () => {
  it('sums the cells a clue must fill', () => {
    expect(clueLength([0])).toBe(0);
    expect(clueLength([1, 2, 3])).toBe(6);
  });

  it('counts the narrowest possible width, gaps included', () => {
    expect(clueSpan([0])).toBe(0);
    expect(clueSpan([4])).toBe(4);
    expect(clueSpan([1, 1, 1])).toBe(5);
  });

  it('drops zeros without reordering', () => {
    expect(clueRuns([0, 2, 0, 1])).toEqual([2, 1]);
    expect(clueRuns([0])).toEqual([]);
  });
});

describe('the picture library', () => {
  it('ships four pictures of each size', () => {
    expect(picturesOfSize(5)).toHaveLength(4);
    expect(picturesOfSize(10)).toHaveLength(4);
    expect(PICTURES).toHaveLength(8);
  });

  it('every picture is square and uses only # and .', () => {
    for (const picture of PICTURES) {
      expect(picture.rows).toBe(picture.grid.length);
      expect(pictureWidth(picture)).toBe(picture.rows);
      for (const row of picture.grid) {
        expect(row).toMatch(/^[#.]+$/);
        expect(row).toHaveLength(picture.rows);
      }
    }
  });

  it('has unique ids, so a save can name one', () => {
    const ids = PICTURES.map((picture) => picture.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws something — no picture is blank or solid', () => {
    for (const picture of PICTURES) {
      const filled = picture.grid
        .join('')
        .split('')
        .filter((cell) => cell === '#').length;
      expect(filled, picture.id).toBeGreaterThan(picture.rows);
      expect(filled, picture.id).toBeLessThan(picture.rows * picture.rows);
    }
  });
});
