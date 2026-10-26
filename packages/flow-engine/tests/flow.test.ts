import { describe, expect, it } from 'vitest';
import { adjacent, begin, createFlow, extend, FILLINGS, isComplete, PUZZLES } from '../src';

describe('flow paths', () => {
  it('every puzzle names two terminals per colour, on the board', () => {
    for (const puzzle of PUZZLES) {
      const n = puzzle.size * puzzle.size;
      const used = new Set<number>();
      for (const pair of puzzle.pairs) {
        expect(pair.a).toBeGreaterThanOrEqual(0);
        expect(pair.b).toBeLessThan(n);
        expect(pair.a).not.toBe(pair.b);
        expect(used.has(pair.a)).toBe(false);
        expect(used.has(pair.b)).toBe(false);
        used.add(pair.a);
        used.add(pair.b);
      }
    }
  });

  it('every hand-authored filling actually completes its puzzle', () => {
    expect(FILLINGS).toHaveLength(PUZZLES.length);
    for (let i = 0; i < PUZZLES.length; i++) {
      expect(isComplete({ puzzle: PUZZLES[i], paths: FILLINGS[i], active: null })).toBe(true);
    }
  });

  it('a path may not step onto another colour', () => {
    const start = createFlow(0);
    const pair = start.puzzle.pairs[0];
    let state = begin(start, pair.a);
    const size = start.puzzle.size;
    const neighbour = [pair.a + 1, pair.a - 1, pair.a + size, pair.a - size].find((i) =>
      adjacent(size, pair.a, i),
    );
    expect(neighbour).toBeDefined();
    state = extend(state, neighbour!);
    expect(state.paths[pair.color]).toContain(neighbour);
    const other = start.puzzle.pairs[1].a;
    const blocked = extend(state, other);
    expect(blocked.paths[pair.color]).not.toContain(other);
  });

  it('an unfinished path is not complete', () => {
    expect(isComplete(createFlow(0))).toBe(false);
  });
});
