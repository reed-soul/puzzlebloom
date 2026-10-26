import { describe, expect, it } from 'vitest';
import { createTic, play, softMove, winnerOf } from '../src';

describe('tri-marks', () => {
  it('three in a row wins', () => {
    let state = createTic();
    state = play(state, 0);
    state = play(state, 3);
    state = play(state, 1);
    state = play(state, 4);
    state = play(state, 2);
    expect(state.winner).toBe(1);
  });

  it('a full board with no line is a draw', () => {
    // 1 2 1 / 1 2 2 / 2 1 1
    expect(winnerOf([1, 2, 1, 1, 2, 2, 2, 1, 1])).toBe('draw');
  });

  it('an occupied square is ignored', () => {
    const once = play(createTic(), 4);
    expect(play(once, 4)).toBe(once);
  });

  it('the neighbour takes an open win', () => {
    let state = createTic();
    state = play(state, 0);
    state = play(state, 3);
    state = play(state, 1);
    state = play(state, 4);
    // Board: 1 1 _ / 2 2 _ / _ _ _  — player 1 to play, 2 wins.
    expect(softMove(state, () => 0)).toBe(2);
  });
});
