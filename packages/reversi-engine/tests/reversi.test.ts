import { describe, expect, it } from 'vitest';
import { counts, createReversi, legalMoves, place } from '../src';

describe('lily pads', () => {
  it('opens with four seeds on the inner pads', () => {
    const start = createReversi();
    expect(counts(start)).toEqual({ sun: 2, moon: 2 });
    expect(start.board[27]).toBe(2);
    expect(start.board[28]).toBe(1);
    expect(start.board[35]).toBe(1);
    expect(start.board[36]).toBe(2);
  });

  it('the opening player has four legal pads, and a place flips a seed', () => {
    const start = createReversi();
    const moves = legalMoves(start);
    expect(moves).toHaveLength(4);
    const next = place(start, moves[0]);
    expect(counts(next).sun).toBeGreaterThan(2);
    expect(next.turn).toBe(2);
  });

  it('an illegal pad is ignored', () => {
    const start = createReversi();
    expect(place(start, 0)).toBe(start);
  });
});
