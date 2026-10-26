import { describe, expect, it } from 'vitest';
import { createJigsaw, isSolved, tap } from '../src';

describe('piece garden', () => {
  it('a scramble is not identity, and uses each piece once', () => {
    const state = createJigsaw(3, 4);
    expect(isSolved(state)).toBe(false);
    expect(new Set(state.pieces).size).toBe(9);
  });

  it('tapping two slots swaps them; tapping the same slot deselects', () => {
    const start = createJigsaw(2, 1);
    const picked = tap(start, 0);
    expect(picked.selected).toBe(0);
    expect(tap(picked, 0).selected).toBeNull();
    const swapped = tap(picked, 1);
    expect(swapped.pieces[0]).toBe(start.pieces[1]);
    expect(swapped.pieces[1]).toBe(start.pieces[0]);
    expect(swapped.swaps).toBe(1);
  });

  it('swapping every piece back to its slot solves the picture', () => {
    let state = { size: 2 as const, pieces: [1, 0, 2, 3], selected: null as number | null, swaps: 0 };
    state = tap(state, 0);
    state = tap(state, 1);
    expect(isSolved(state)).toBe(true);
  });

  it('the same seed cuts the same scramble', () => {
    expect(createJigsaw(4, 8).pieces).toEqual(createJigsaw(4, 8).pieces);
  });
});
