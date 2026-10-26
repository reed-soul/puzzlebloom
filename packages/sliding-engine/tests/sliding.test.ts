import { describe, expect, it } from 'vitest';
import { canSlide, createPuzzle, isSolved, slide, solvedTiles } from '../src';

describe('sliding garden', () => {
  it('a fresh walk is not already solved, and is always solvable by reversing', () => {
    const start = createPuzzle(3, 7);
    expect(isSolved(start)).toBe(false);
    expect(start.tiles.filter((t) => t === 0)).toHaveLength(1);
    expect(new Set(start.tiles).size).toBe(9);
  });

  it('only slides a tile next to the empty square', () => {
    const solved = { size: 3 as const, tiles: solvedTiles(3), empty: 8, moves: 0 };
    expect(canSlide(solved, 7)).toBe(true);
    expect(canSlide(solved, 5)).toBe(true);
    expect(canSlide(solved, 0)).toBe(false);
    const next = slide(solved, 7);
    expect(next.tiles[7]).toBe(0);
    expect(next.tiles[8]).toBe(8);
    expect(next.moves).toBe(1);
  });

  it('the identity board is solved', () => {
    expect(isSolved({ size: 4, tiles: solvedTiles(4), empty: 15, moves: 0 })).toBe(true);
  });

  it('the same seed grows the same scramble', () => {
    const a = createPuzzle(4, 42);
    const b = createPuzzle(4, 42);
    expect(a.tiles).toEqual(b.tiles);
  });
});
