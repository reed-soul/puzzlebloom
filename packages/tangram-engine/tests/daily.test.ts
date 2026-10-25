import { describe, expect, it } from 'vitest';
import { createRandom, dailyFigure, FIGURES, localDateKey, seedFrom, TUTORIAL_FIGURE_ID } from '../src/index';

describe('seedFrom', () => {
  it('is the same number for the same text', () => {
    expect(seedFrom('2026-03-04')).toBe(seedFrom('2026-03-04'));
    expect(seedFrom('2026-03-04')).not.toBe(seedFrom('2026-03-05'));
  });
});

describe('createRandom', () => {
  it('repeats from the same seed and stays inside [0, 1)', () => {
    const a = createRandom(12345);
    const b = createRandom(12345);
    for (let index = 0; index < 20; index += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('localDateKey', () => {
  it('writes the local date, not the UTC one', () => {
    // A date in the evening of a timezone behind UTC: the UTC day would be the
    // next one, and the puzzle would change in the middle of the evening.
    expect(localDateKey(new Date(2026, 0, 9, 23, 30))).toBe('2026-01-09');
    expect(localDateKey(new Date(2026, 10, 1, 0, 15))).toBe('2026-11-01');
  });
});

describe('dailyFigure', () => {
  it('gives the same figure twice on the same day', () => {
    expect(dailyFigure('2026-03-04').id).toBe(dailyFigure('2026-03-04').id);
  });

  it('moves through several figures over a fortnight', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 14; day += 1) {
      seen.add(dailyFigure(`2026-03-${`${day}`.padStart(2, '0')}`).id);
    }
    // Five figures in the daily pool, fourteen draws: anything less than three
    // distinct figures would mean the hash is clumping badly.
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('keeps the tutorial box out of the rotation', () => {
    for (let day = 1; day <= 28; day += 1) {
      const figure = dailyFigure(`2026-04-${`${day}`.padStart(2, '0')}`);
      expect(figure.id).not.toBe(TUTORIAL_FIGURE_ID);
      expect(FIGURES).toContain(figure);
    }
  });

  it('defaults to today', () => {
    expect(dailyFigure().id).toBe(dailyFigure(localDateKey()).id);
  });
});
