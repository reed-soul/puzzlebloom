import { describe, expect, it } from 'vitest';
import {
  boardFrom,
  dailyDeal,
  decodeProgress,
  encodeProgress,
  localDateKey,
  type SavedProgress,
} from '../src/index';

describe('localDateKey', () => {
  it('writes the local date, not the UTC one', () => {
    // An evening in a timezone behind UTC: the UTC day would be the next one, and
    // the daily board would change at midnight somewhere else.
    expect(localDateKey(new Date(2026, 0, 9, 23, 30))).toBe('2026-01-09');
    expect(localDateKey(new Date(2026, 10, 1, 0, 15))).toBe('2026-11-01');
  });
});

describe('dailyDeal', () => {
  it('is the same board twice on the same day', () => {
    const first = dailyDeal('2026-03-04');
    const second = dailyDeal('2026-03-04');
    expect(first).toEqual(second);
  });

  it('moves through several sizes over a fortnight', () => {
    const sizes = new Set<string>();
    for (let day = 1; day <= 14; day += 1) {
      sizes.add(dailyDeal(`2026-03-${`${day}`.padStart(2, '0')}`).level);
    }
    // Three sizes, fourteen draws: fewer than two would mean the hash is stuck.
    expect(sizes.size).toBeGreaterThanOrEqual(2);
  });

  it('keeps the size and the pair count in step', () => {
    for (let day = 1; day <= 28; day += 1) {
      const deal = dailyDeal(`2026-04-${`${day}`.padStart(2, '0')}`);
      const expected = { small: 6, medium: 8, large: 9 }[deal.level];
      expect(deal.pairs).toBe(expected);
    }
  });

  it('defaults to today', () => {
    expect(dailyDeal()).toEqual(dailyDeal(localDateKey()));
  });
});

describe('progress', () => {
  const saved: SavedProgress = {
    level: 'small',
    seed: 424242,
    faces: ['kept', 'kept', 'up', 'down', 'down', 'up', 'down', 'down', 'down', 'down', 'down', 'down'],
    log: [
      { a: 0, b: 1, matched: true },
      { a: 2, b: 5, matched: false },
    ],
    elapsedMs: 41_500,
    hintsUsed: 2,
    daily: '2026-03-04',
    finished: false,
  };

  it('round-trips a board', () => {
    expect(decodeProgress(encodeProgress(saved))).toEqual(saved);
  });

  it('rebuilds the same board from the same save', () => {
    const board = boardFrom(saved);
    expect(board).not.toBeNull();
    if (!board) return;
    expect(board.pairs).toBe(6);
    expect(board.kept).toBe(1);
    expect(board.turns).toBe(2);
    // The two cards still in hand: index 2 from the missed turn, index 5 which
    // was turned but never paired.
    expect(board.open).toEqual([2, 5]);
  });

  it('treats anything it cannot read as a save that was never made', () => {
    expect(decodeProgress('not json')).toBeNull();
    expect(decodeProgress('')).toBeNull();
    expect(decodeProgress(null)).toBeNull();
    expect(decodeProgress(42)).toBeNull();
    expect(decodeProgress({ ...saved, level: 'enormous' })).toBeNull();
    expect(decodeProgress({ ...saved, seed: -1 })).toBeNull();
    expect(decodeProgress({ ...saved, faces: ['down'] })).toBeNull();
    expect(decodeProgress({ ...saved, faces: [...saved.faces.slice(1), 'sideways'] })).toBeNull();
    expect(decodeProgress({ ...saved, log: [{ a: 0, b: 0, matched: true }] })).toBeNull();
    expect(decodeProgress({ ...saved, log: [{ a: 0, b: 99, matched: true }] })).toBeNull();
    expect(decodeProgress({ ...saved, elapsedMs: 'ages' })).toBeNull();
  });

  it('refuses a board with more than two cards in hand', () => {
    const faces = [...saved.faces];
    faces[3] = 'up';
    faces[4] = 'up';
    expect(decodeProgress(JSON.stringify({ ...saved, faces }))).toBeNull();
  });
});
