import { describe, expect, it } from 'vitest';
import { createRandom, dailyPuzzle, localDateKey, seedFrom } from '../src/daily';
import { picturesOfSize } from '../src/pictures';

describe('localDateKey', () => {
  it('writes the local date, zero-padded', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('does not shift the day for a late-evening local time', () => {
    // A UTC conversion here would give a different puzzle to a family in
    // Auckland and a family in London on the same calendar day.
    expect(localDateKey(new Date(2026, 5, 10, 23, 45))).toBe('2026-06-10');
  });
});

describe('seedFrom', () => {
  it('is stable for the same text', () => {
    expect(seedFrom('2026-10-25')).toBe(seedFrom('2026-10-25'));
  });

  it('separates neighbouring dates', () => {
    expect(seedFrom('2026-10-25')).not.toBe(seedFrom('2026-10-26'));
  });

  it('stays inside 32 bits', () => {
    for (const text of ['', 'a', '2026-10-25', 'pb.nonogram/2026-10-25/10']) {
      const seed = seedFrom(text);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(2 ** 32);
    }
  });
});

describe('createRandom', () => {
  it('repeats for the same seed', () => {
    const first = createRandom(1234);
    const second = createRandom(1234);
    for (let draw = 0; draw < 8; draw++) expect(first()).toBe(second());
  });

  it('gives numbers in [0, 1)', () => {
    const random = createRandom(99);
    for (let draw = 0; draw < 200; draw++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('does not get stuck', () => {
    const random = createRandom(7);
    const draws = new Set(Array.from({ length: 20 }, () => random()));
    expect(draws.size).toBeGreaterThan(15);
  });
});

describe('dailyPuzzle', () => {
  it('gives the same picture to everyone on the same date', () => {
    const first = dailyPuzzle('2026-10-25', 10);
    const second = dailyPuzzle('2026-10-25', 10);
    expect(first.pictureId).toBe(second.pictureId);
    expect(first.rowClues).toEqual(second.rowClues);
  });

  it('respects the requested size', () => {
    expect(dailyPuzzle('2026-10-25', 5).rows).toBe(5);
    expect(dailyPuzzle('2026-10-25', 10).rows).toBe(10);
  });

  it('uses every picture of a size over a couple of weeks', () => {
    const ids = new Set<string>();
    for (let day = 1; day <= 28; day++) {
      ids.add(dailyPuzzle(`2026-11-${`${day}`.padStart(2, '0')}`, 10).pictureId);
    }
    expect(ids.size).toBe(picturesOfSize(10).length);
  });
});
