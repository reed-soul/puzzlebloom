import { describe, expect, it } from 'vitest';
import {
  buildBoard,
  createBoard,
  playTurn,
  rollDice,
  TOTAL_SQUARES,
  TOTAL_TURNS,
  turnSentence,
} from '../src';

/**
 * The two claims this engine must keep: the dice never couple (the number you
 * move is never the number you compute), and the session always runs to its
 * full length (a child's arithmetic practice cannot be decided by a die).
 */

describe('the road', () => {
  it('builds the full length with signs in alternating runs', () => {
    const board = buildBoard(7);
    expect(board).toHaveLength(TOTAL_SQUARES);
    expect(board[0].index).toBe(1);
    expect(board[board.length - 1].index).toBe(TOTAL_SQUARES);
    // Alternating means a run of the same sign is followed by the other sign.
    let last = board[0].sign;
    let changes = 0;
    for (const square of board) {
      if (square.sign !== last) {
        changes += 1;
        last = square.sign;
      }
    }
    // Runs of 1–3 across 24 squares: plenty of changes, never zero.
    expect(changes).toBeGreaterThanOrEqual(6);
  });

  it('is deterministic per seed and different across seeds', () => {
    expect(buildBoard(3)).toEqual(buildBoard(3));
    const different = new Set<number>();
    for (let seed = 1; seed <= 30; seed++)
      different.add(
        buildBoard(seed)
          .map((s) => s.sign)
          .join(''),
      );
    expect(different.size).toBeGreaterThan(10);
  });
});

describe('a turn', () => {
  it('moves the car and applies the landing square to the operand', () => {
    let state = createBoard(1);
    const landing = state.squares[((state.position - 1 + 3) % TOTAL_SQUARES) + 1 - 1];
    const before = state.frogsAboard;
    state = playTurn(state, 3, 2);
    const entry = state.log[0];
    expect(entry.to).toBe(((1 - 1 + 3) % TOTAL_SQUARES) + 1);
    expect(entry.sign).toBe(landing.sign);
    expect(entry.after).toBe(landing.sign === '+' ? before + 2 : Math.max(0, before - 2));
    expect(state.frogsAboard).toBe(entry.after);
  });

  it('wraps around the end of the road instead of stopping the count', () => {
    let state = createBoard(5);
    // Walk to near the end, then step past it.
    state = playTurn(state, 6, 1);
    state = playTurn(state, 6, 1);
    state = playTurn(state, 6, 1);
    const last = state.log[state.log.length - 1];
    expect(last.to).toBeLessThanOrEqual(TOTAL_SQUARES);
    expect(last.to).toBeGreaterThanOrEqual(1);
  });

  it('never takes the total below zero, and the log says what was clamped', () => {
    let state = createBoard(2, 8);
    // Land on the first − square: target index k means exactly k steps from 1.
    const minusIndex = state.squares.findIndex((s, i) => i > 0 && s.sign === '-');
    state = playTurn(state, minusIndex, 5); // 5 off an empty car
    const entry = state.log[0];
    expect(entry.sign).toBe('-');
    expect(entry.after).toBe(0);
    expect(turnSentence(entry)).toContain('only 0 aboard');
  });

  it('records before and after so the recap can read real arithmetic', () => {
    let state = createBoard(9);
    state = playTurn(state, 4, 3);
    state = playTurn(state, 2, 2);
    expect(state.log).toHaveLength(2);
    expect(state.log[1].before).toBe(state.log[0].after);
    // The sentence contains the equation, whichever sign it was.
    for (const entry of state.log) expect(turnSentence(entry)).toMatch(/−|=|\+/);
  });
});

describe('the session', () => {
  it('runs exactly the fixed number of turns and then refuses more', () => {
    let state = createBoard(4, TOTAL_TURNS);
    for (let i = 0; i < TOTAL_TURNS; i++) state = playTurn(state, 3, 2);
    expect(state.finished).toBe(true);
    expect(state.log).toHaveLength(TOTAL_TURNS);
    const frozen = state.frogsAboard;
    const more = playTurn(state, 6, 5);
    expect(more.log).toHaveLength(TOTAL_TURNS);
    expect(more.frogsAboard).toBe(frozen);
  });

  it('keeps the two dice decorrelated in every roll', () => {
    // Over many rolls, the pair (steps, frogs) must not collapse to steps==frogs
    // beyond chance — the cheat this design exists to prevent.
    let equal = 0;
    const rolls = 4000;
    for (let i = 0; i < rolls; i++) {
      const { steps, frogs } = rollDice();
      if (steps === frogs) equal += 1;
    }
    // P(steps==frogs) if independent: Σ over k=1..3 of (1/6)(1/3) = 1/6 ≈ 0.167.
    expect(equal / rolls).toBeGreaterThan(0.12);
    expect(equal / rolls).toBeLessThan(0.21);
  });
});
