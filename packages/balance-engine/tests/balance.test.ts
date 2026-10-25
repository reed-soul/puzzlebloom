import { describe, expect, it } from 'vitest';
import {
  addFrog,
  addTile,
  type BalancePuzzle,
  clearPan,
  createBalance,
  equationOf,
  generatePuzzle,
  leftTotal,
  panTotal,
  removeFrog,
  removeTopTile,
  tilt,
  weigh,
} from '../src';

/**
 * The engine is the part of this game that must never lie. A physical beam
 * lies when its pivot sticks; these tests are the guarantee that this one
 * cannot.
 */

describe('totals', () => {
  it('sums tiles and frogs into a pan total', () => {
    expect(panTotal({ tiles: [2, 3], frogs: 4 })).toBe(9);
    expect(panTotal({ tiles: [], frogs: 0 })).toBe(0);
  });

  it('sums the puzzle side', () => {
    expect(leftTotal({ left: [4, 3], targetTotal: 7 } as BalancePuzzle)).toBe(7);
  });
});

describe('tilt', () => {
  const puzzle: BalancePuzzle = { id: 't', left: [6], targetTotal: 6 };

  it('is level when the pans match', () => {
    const state = createBalance(puzzle);
    const level = addFrog(state, 6);
    expect(tilt(level)).toBe(0);
  });

  it('tips toward the heavier side', () => {
    const base = createBalance(puzzle);
    expect(tilt(base)).toBeGreaterThan(0); // left 6, right 0
    const over = addFrog(base, 8);
    expect(tilt(over)).toBeLessThan(0);
  });

  it('never exceeds the beam limit in either direction', () => {
    const puzzle2: BalancePuzzle = { id: 't2', left: [9, 9], targetTotal: 18 };
    let state = createBalance(puzzle2);
    expect(tilt(state)).toBeLessThanOrEqual(14);
    state = addFrog(state, 20);
    expect(tilt(state)).toBeGreaterThanOrEqual(-14);
  });

  it('keeps a difference of one visible but calmer than a difference of three', () => {
    const state = addFrog(createBalance(puzzle), 5); // 6 vs 5
    const bigger = addFrog(createBalance(puzzle), 3); // 6 vs 3
    expect(tilt(state)).toBeGreaterThan(0);
    expect(tilt(state)).toBeLessThan(tilt(bigger));
  });
});

describe('weighing', () => {
  const puzzle: BalancePuzzle = { id: 'w', left: [2, 4], targetTotal: 6 };

  it('solves only on an exact match', () => {
    let state = createBalance(puzzle);
    state = addFrog(state, 5);
    state = weigh(state);
    expect(state.solved).toBe(false);
    expect(state.weighed).toBe(true);
  });

  it('accepts any decomposition that totals correctly', () => {
    let state = createBalance(puzzle);
    state = addTile(state, 5);
    state = addFrog(state, 1);
    state = weigh(state);
    expect(state.solved).toBe(true);
    // 2 + 4 = 5 + 1 is the sentence, and no frog was harmed.
    expect(equationOf(state)).toBe('2 + 4 = 5 + 1');
  });

  it('marks weighing even when wrong, because the scale did move', () => {
    let state = createBalance(puzzle);
    state = addTile(state, 3);
    state = weigh(state);
    expect(state.weighed).toBe(true);
    expect(state.solved).toBe(false);
  });
});

describe('editing the pan', () => {
  const puzzle: BalancePuzzle = { id: 'e', left: [7], targetTotal: 7 };

  it('stacks tiles and removes the top one only', () => {
    let state = createBalance(puzzle);
    state = addTile(state, 2);
    state = addTile(state, 5);
    expect(state.right.tiles).toEqual([2, 5]);
    state = removeTopTile(state);
    expect(state.right.tiles).toEqual([2]);
  });

  it('does not take frogs below zero or above twenty', () => {
    let state = createBalance(puzzle);
    expect(removeFrog(state).right.frogs).toBe(0);
    state = addFrog(state, 25);
    expect(state.right.frogs).toBe(20);
  });

  it('clears the pan and forgets the weigh', () => {
    let state = createBalance(puzzle);
    state = addFrog(state, 3);
    state = weigh(state);
    state = clearPan(state);
    expect(state.right.frogs).toBe(0);
    expect(state.weighed).toBe(false);
  });

  it('locks the pan once solved — a solved balance is not a sandbox', () => {
    let state = createBalance(puzzle);
    state = addFrog(state, 7);
    state = weigh(state);
    expect(state.solved).toBe(true);
    expect(addFrog(state).right.frogs).toBe(7);
    expect(clearPan(state).right.frogs).toBe(7);
  });
});

describe('puzzle generation', () => {
  it('level one gives a single numeral between 3 and 9', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const puzzle = generatePuzzle(1, seed);
      expect(puzzle.left).toHaveLength(1);
      expect(puzzle.left[0]).toBeGreaterThanOrEqual(3);
      expect(puzzle.left[0]).toBeLessThanOrEqual(9);
      expect(puzzle.targetTotal).toBe(puzzle.left[0]);
    }
  });

  it('level two gives two numerals, both at least 2, totalling at most 10', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const puzzle = generatePuzzle(2, seed);
      expect(puzzle.left).toHaveLength(2);
      for (const tile of puzzle.left) expect(tile).toBeGreaterThanOrEqual(2);
      const total = puzzle.left[0] + puzzle.left[1];
      expect(total).toBeLessThanOrEqual(10);
      expect(puzzle.targetTotal).toBe(total);
    }
  });

  it('is deterministic: the same seed is the same puzzle', () => {
    expect(generatePuzzle(2, 42)).toEqual(generatePuzzle(2, 42));
    // and neighbouring seeds usually differ, so "next" is not a stutter
    const differences = new Set();
    for (let seed = 1; seed <= 20; seed++) {
      differences.add(generatePuzzle(2, seed).left.join(','));
    }
    expect(differences.size).toBeGreaterThan(10);
  });
});
