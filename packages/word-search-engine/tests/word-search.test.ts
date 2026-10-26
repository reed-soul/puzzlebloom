import { describe, expect, it } from 'vitest';
import { createMeadow, isSolved, select } from '../src';

describe('word meadow', () => {
  it('plants every listed word somewhere on the grid', () => {
    const meadow = createMeadow(21);
    expect(meadow.words).toHaveLength(6);
    expect(meadow.placements).toHaveLength(6);
    for (const word of meadow.words) {
      expect(contains(meadow.grid, meadow.size, word)).toBe(true);
    }
  });

  it('selecting a planted word marks it found, twice is a no-op', () => {
    const meadow = createMeadow(3);
    const span = locate(meadow.grid, meadow.size, meadow.words[0]);
    expect(span).not.toBeNull();
    const next = select(meadow, span![0], span![1]);
    expect(next.found).toContain(meadow.words[0]);
    expect(select(next, span![0], span![1]).found).toEqual(next.found);
  });

  it('a nonsense span finds nothing', () => {
    const meadow = createMeadow(8);
    const next = select(meadow, 0, 1);
    if (!meadow.words.some((w) => w === meadow.grid[0] + meadow.grid[1])) {
      expect(next.found).toEqual([]);
    }
  });

  it('the same seed plants the same meadow', () => {
    expect(createMeadow(5).grid).toEqual(createMeadow(5).grid);
  });

  it('plants the asked-for count of words across seeds', () => {
    for (const seed of [1, 2, 3, 21, 42, 99]) {
      expect(createMeadow(seed).words).toHaveLength(6);
    }
  });

  it('finding every word solves the meadow', () => {
    let meadow = createMeadow(3);
    for (const word of meadow.words) {
      const span = locate(meadow.grid, meadow.size, word);
      expect(span).not.toBeNull();
      meadow = select(meadow, span![0], span![1]);
    }
    expect(isSolved(meadow)).toBe(true);
  });
});

function contains(grid: readonly string[], size: number, word: string): boolean {
  return locate(grid, size, word) !== null;
}

function locate(grid: readonly string[], size: number, word: string): [number, number] | null {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [0, -1],
    [1, -1],
  ];
  for (let i = 0; i < grid.length; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    for (const [dr, dc] of dirs) {
      let ok = true;
      for (let k = 0; k < word.length; k++) {
        const rr = r + dr * k;
        const cc = c + dc * k;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size || grid[rr * size + cc] !== word[k]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const end = (r + dr * (word.length - 1)) * size + (c + dc * (word.length - 1));
        return [i, end];
      }
    }
  }
  return null;
}
