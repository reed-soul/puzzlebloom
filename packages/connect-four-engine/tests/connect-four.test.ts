import { describe, expect, it } from 'vitest';
import { createFour, drop, freeRow, softMove } from '../src';

describe('four flowers', () => {
  it('a drop lands on the ground, then stacks', () => {
    let state = createFour();
    expect(freeRow(state, 3)).toBe(0);
    state = drop(state, 3);
    expect(state.board[3][0]).toBe(1);
    expect(freeRow(state, 3)).toBe(1);
    expect(state.turn).toBe(2);
  });

  it('four in a column is a win', () => {
    let state = createFour();
    for (let i = 0; i < 3; i++) {
      state = drop(state, 0); // player 1
      state = drop(state, 1); // player 2
    }
    state = drop(state, 0);
    expect(state.winner).toBe(1);
  });

  it('four in a row is a win', () => {
    let state = createFour();
    state = drop(state, 0);
    state = drop(state, 0);
    state = drop(state, 1);
    state = drop(state, 1);
    state = drop(state, 2);
    state = drop(state, 2);
    state = drop(state, 3);
    expect(state.winner).toBe(1);
  });

  it('the CPU takes an open win', () => {
    let state = createFour();
    // Stack three of player 1 in column 0, with player 2 filling column 6.
    for (let i = 0; i < 3; i++) {
      state = drop(state, 0);
      state = drop(state, 6);
    }
    expect(state.turn).toBe(1);
    expect(softMove(state, () => 0)).toBe(0);
  });

  it('a full column is not legal', () => {
    let state = createFour();
    // Fill one column by taking turns in it, so neither side lines up four.
    for (let i = 0; i < 6; i++) {
      const next = drop(state, 2);
      expect(next).not.toBe(state);
      state = next;
    }
    expect(freeRow(state, 2)).toBe(-1);
    expect(drop(state, 2)).toBe(state);
  });
});
