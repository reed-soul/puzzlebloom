import { describe, expect, it } from 'vitest';
import { CENTRE, createEnglish, hop, hopsFrom, isOnBoard, seedCount, select, undo } from '../src';

describe('peg pond', () => {
  it('starts with 32 seeds and an empty centre', () => {
    const board = createEnglish();
    expect(seedCount(board)).toBe(32);
    expect(board.holes[CENTRE]).toBe('empty');
    expect(board.holes.filter((h) => h !== 'none')).toHaveLength(33);
  });

  it('the four orthogonal hops into the centre are legal at the start', () => {
    const board = createEnglish();
    expect(hopsFrom(board, CENTRE - 14).sort((a, b) => a - b)).toEqual([CENTRE]);
    expect(hopsFrom(board, CENTRE + 14)).toEqual([CENTRE]);
    expect(hopsFrom(board, CENTRE - 2)).toEqual([CENTRE]);
    expect(hopsFrom(board, CENTRE + 2)).toEqual([CENTRE]);
  });

  it('a hop removes the jumped seed, and undo puts it back', () => {
    const start = createEnglish();
    const next = hop(start, CENTRE - 2, CENTRE);
    expect(next.holes[CENTRE]).toBe('seed');
    expect(next.holes[CENTRE - 1]).toBe('empty');
    expect(next.holes[CENTRE - 2]).toBe('empty');
    expect(seedCount(next)).toBe(31);
    const back = undo(next);
    expect(back.holes).toEqual(start.holes);
  });

  it('selecting a landing pad hops; selecting empty deselects', () => {
    const start = createEnglish();
    const picked = select(start, CENTRE - 2);
    expect(picked.selected).toBe(CENTRE - 2);
    const hopped = select(picked, CENTRE);
    expect(hopped.holes[CENTRE]).toBe('seed');
    expect(hopped.selected).toBeNull();
  });

  it('the four corners of the 7×7 are not on the pond', () => {
    expect(isOnBoard(0)).toBe(false);
    expect(isOnBoard(6)).toBe(false);
    expect(isOnBoard(48)).toBe(false);
  });
});
