import { describe, expect, it } from 'vitest';
import { createLights, isSolved, press } from '../src';

describe('firefly lights', () => {
  it('a press toggles the firefly and its four neighbours', () => {
    const dark: ReturnType<typeof createLights> = {
      size: 5,
      lit: Array.from({ length: 25 }, () => false),
      presses: 0,
    };
    const next = press(dark, 12);
    const on = next.lit.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    expect(on.sort((a, b) => a - b)).toEqual([7, 11, 12, 13, 17]);
  });

  it('an edge press does not wrap around the garden', () => {
    const dark = { size: 3, lit: Array.from({ length: 9 }, () => false), presses: 0 };
    const next = press(dark, 0);
    const on = next.lit.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    expect(on.sort((a, b) => a - b)).toEqual([0, 1, 3]);
  });

  it('pressing the same cells that carved the puzzle solves it', () => {
    // Carve by hand so the solving path is known.
    let state = { size: 3, lit: Array.from({ length: 9 }, () => false), presses: 0 };
    state = press(state, 4);
    state = press(state, 0);
    expect(isSolved(state)).toBe(false);
    state = press({ ...state, presses: 0 }, 4);
    state = press(state, 0);
    expect(isSolved(state)).toBe(true);
  });

  it('the same seed lights the same fireflies', () => {
    expect(createLights(5, 12).lit).toEqual(createLights(5, 12).lit);
  });

  it('a carved bed is never already quiet', () => {
    for (const seed of [1, 2, 7, 12, 99]) {
      expect(isSolved(createLights(5, seed))).toBe(false);
      expect(isSolved(createLights(4, seed))).toBe(false);
    }
  });
});
