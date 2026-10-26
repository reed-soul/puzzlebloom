import { describe, expect, it } from 'vitest';
import {
  CELLS,
  columnHeight,
  complaints,
  emptyPlot,
  frontLevels,
  type Heights,
  heightAt,
  LEVELS,
  lower,
  MAX_HEIGHT,
  maskBit,
  maskRows,
  matches,
  plot,
  raise,
  report,
  SIZE,
  shadows,
  sideLevels,
  stoneCount,
} from '../src';
import { CARD_PLOT, CARD_STONES } from '../src/card';

/**
 * The engine is the part of this game that must never lie.
 *
 * A child who is told "file three is too tall" and finds it is not has learned
 * to distrust the game, and no amount of nice artwork buys that back. These
 * tests hold two promises: the shadows are what the plot actually casts, and
 * the complaints are empty exactly when the shadows agree.
 */

/** A guessable PRNG, so a failure is reproducible from the seed in the name. */
const randomHeights = (seed: number): number[] => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return Array.from({ length: CELLS }, () => Math.floor(next() * (MAX_HEIGHT + 1)));
};

/** A mask as picture: `#` where it is set, `.` where it is not. */
const draw = (mask: number): string[] =>
  maskRows(mask).map((row) => row.map((cell) => (cell ? '#' : '.')).join(''));

describe('plot', () => {
  it('reads four rows of four digits, nearest row first', () => {
    const heights = plot('0100', '1000', '0010', '0000');
    expect(heights).toHaveLength(CELLS);
    expect(heightAt(heights, 0, 1)).toBe(1);
    expect(heightAt(heights, 1, 0)).toBe(1);
    expect(heightAt(heights, 2, 2)).toBe(1);
    expect(heightAt(heights, 3, 0)).toBe(0);
  });

  it('refuses anything that is not a four-by-four frame of heights', () => {
    expect(() => plot('0000', '0000', '0000')).toThrow(/4 rows/);
    expect(() => plot('0000', '0000', '0000', '000')).toThrow(/needs 4 cells/);
    expect(() => plot('0000', '0000', '0000', '000x')).toThrow(/heights run 0–4/);
    expect(() => plot('0000', '0000', '0000', '0005')).toThrow(/heights run 0–4/);
  });

  it('starts every level from the same empty ground', () => {
    expect(stoneCount(emptyPlot())).toBe(0);
    expect(emptyPlot()).toHaveLength(CELLS);
  });
});

describe('the three shadows', () => {
  /* A plot with three different shapes in it, so no two panels can be right
     by accident: rank 1 holds heights 1 and 2 side by side, rank 2 holds a
     single stack three high at file 2. */
  const heights = plot('0000', '1200', '0030', '0000');

  it('front is the tallest stone in each file, seen as a solid column', () => {
    expect(frontLevels(heights)).toEqual([1, 2, 3, 0]);
    expect(draw(shadows(heights).front)).toEqual(['###.', '.##.', '..#.', '....']);
  });

  it('side is the tallest stone in each rank, seen from the right', () => {
    expect(sideLevels(heights)).toEqual([0, 2, 3, 0]);
    expect(draw(shadows(heights).side)).toEqual(['.##.', '.##.', '..#.', '....']);
  });

  it('top is the footprint, and nothing else', () => {
    expect(draw(shadows(heights).top)).toEqual(['....', '##..', '..#.', '....']);
  });

  it('front ignores which rank a stone stands in, side ignores which file', () => {
    // Same heights, mirrored front-to-back: the front shadow cannot tell.
    const mirrored = plot('0000', '0030', '1200', '0000');
    expect(shadows(mirrored).front).toBe(shadows(heights).front);
    expect(shadows(mirrored).side).not.toBe(shadows(heights).side);
    // Swapped left-to-right: the side shadow cannot tell.
    const flipped = plot('0000', '2100', '0300', '0000');
    expect(shadows(flipped).side).toBe(shadows(heights).side);
    expect(shadows(flipped).front).not.toBe(shadows(heights).front);
  });

  it('a taller stack fills the levels underneath it', () => {
    // A silhouette is what you cannot see past, so a stone four high hides
    // three cells behind it. A plot that only marked the top stone would look
    // plausible and be wrong on every level above one.
    const stack = plot('0000', '4000', '0000', '0000');
    expect(draw(shadows(stack).front)).toEqual(['#...', '#...', '#...', '#...']);
  });
});

describe('stacking', () => {
  it('adds one stone and stops at the top', () => {
    const base = plot('0000', '4000', '0000', '0000');
    expect(raise(plot('0000', '3000', '0000', '0000'), 4)).toEqual(base);
    expect(raise(base, 4)).toBe(base);
  });

  it('lifts one stone and stops at the ground', () => {
    const base = plot('0000', '1000', '0000', '0000');
    expect(lower(plot('0000', '2000', '0000', '0000'), 4)).toEqual(base);
    expect(lower(emptyPlot(), 4)).toEqual(emptyPlot());
  });

  it('hands back the identical array when nothing changed', () => {
    // The game skips work on an identity check, so a tap on a full column has
    // to be the same object rather than a copy that happens to be equal.
    const full = plot('0000', '4000', '0000', '0000');
    const empty = emptyPlot();
    expect(raise(full, 4)).toBe(full);
    expect(lower(empty, 4)).toBe(empty);
  });
});

describe('matching', () => {
  it('accepts the figure every level was drawn from', () => {
    for (const level of LEVELS) {
      expect(matches(level.source, level.target), level.id).toBe(true);
      expect(report(level.source, level.target).solved, level.id).toBe(true);
      expect(complaints(level.source, level.target), level.id).toEqual([]);
    }
  });

  it('rejects an empty plot for every level', () => {
    for (const level of LEVELS) expect(matches(emptyPlot(), level.target), level.id).toBe(false);
  });

  it('does not call a plot solved because one panel happens to agree', () => {
    // The negative half. Written as three constructed witnesses rather than as
    // "one stone fewer is rejected": a single-stone change is *sometimes* still
    // a valid answer (see the next test), so that assertion would be a lie
    // dressed as rigour.
    //
    // What is not negotiable is that the judge reads all three panels. Each
    // witness below is a plot the plan agrees with on exactly one panel, so a
    // judge that stopped at that panel would call it solved.
    const byRanks = (heights: Heights): number[] =>
      Array.from({ length: CELLS }, (_, cell) => {
        const rank = SIZE - 1 - Math.floor(cell / SIZE);
        return heights[rank * SIZE + (cell % SIZE)];
      });
    const byFiles = (heights: Heights): number[] =>
      Array.from({ length: CELLS }, (_, cell) => {
        const file = SIZE - 1 - (cell % SIZE);
        return heights[Math.floor(cell / SIZE) * SIZE + file];
      });
    const samePlot = (a: Heights, b: Heights): boolean => a.every((height, cell) => height === b[cell]);

    let frontWitnesses = 0;
    let sideWitnesses = 0;
    for (const level of LEVELS) {
      // Turning the figure round keeps every file's tallest stone, so the
      // front shadow cannot tell the two apart — and the other two can.
      const reversed = byRanks(level.source);
      if (!samePlot(reversed, level.source)) {
        expect(shadows(reversed).front, level.id).toBe(level.target.front);
        expect(matches(reversed, level.target), level.id).toBe(false);
        frontWitnesses += 1;
      }
      // Mirroring keeps every rank's tallest stone, so the side shadow agrees.
      const mirrored = byFiles(level.source);
      if (!samePlot(mirrored, level.source)) {
        expect(shadows(mirrored).side, level.id).toBe(level.target.side);
        expect(matches(mirrored, level.target), level.id).toBe(false);
        sideWitnesses += 1;
      }
    }

    // One stone added inside the footprint: the ground shadow cannot tell.
    const bench = LEVELS[1];
    const taller = raise(bench.source, SIZE);
    expect(shadows(taller).top).toBe(bench.target.top);
    expect(matches(taller, bench.target)).toBe(false);

    expect(frontWitnesses).toBeGreaterThan(0);
    expect(sideWitnesses).toBeGreaterThan(0);
  });

  it('accepts a second arrangement when the shadows cannot tell them apart', () => {
    // Not a bug. A silhouette is lossy, so "your shadows match mine" is a
    // weaker claim than "you built my figure", and the game makes the weaker
    // claim on purpose: the stronger one would have to call a valid answer
    // wrong. If someone ever tightens `matches` to compare against `source`,
    // this test is what will stop them.
    const level = LEVELS[3]; // a staircase
    const alternative = raise(level.source, 2 * SIZE + 1); // a second stone at rank 2, file 1
    expect(alternative).not.toEqual(level.source);
    expect(matches(alternative, level.target)).toBe(true);
  });

  it('counts what is missing and what is extra, per panel', () => {
    const level = LEVELS[0];
    const report_ = report(emptyPlot(), level.target);
    expect(report_.solved).toBe(false);
    expect(report_.top.missing).toBe(1);
    expect(report_.top.extra).toBe(0);
    expect(report_.front.missing).toBe(1);
    expect(report_.side.missing).toBe(1);
  });
});

describe('complaints', () => {
  it('names the loose stone before it names a height', () => {
    // A stone outside the footprint makes every height below it suspect, so
    // the order is not cosmetic: fix the footprint first or the next sentence
    // is about a line that is only tall because of the stray stone.
    const level = LEVELS[1]; // a bench across rank 1
    const stray = raise(emptyPlot(), 0); // a stone at rank 0, file 0
    const first = complaints(stray, level.target)[0];
    expect(first).toEqual({ kind: 'loose-stone', rank: 0, file: 0 });
  });

  it('says a file is too tall, and by how much', () => {
    const level = LEVELS[1]; // a bench: every file one stone high
    // The footprint is respected, so this complaint is about height alone:
    // file 0 is stacked twice where the plan wants one.
    const overbuilt = plot('0000', '2111', '0000', '0000');
    expect(report(overbuilt, level.target).top).toEqual({ extra: 0, missing: 0 });
    expect(complaints(overbuilt, level.target)[0]).toEqual({
      kind: 'too-tall',
      panel: 'front',
      line: 0,
      by: 1,
    });
  });

  it('is empty exactly when the shadows agree, for plots nobody designed', () => {
    // The invariant the hint depends on. Swept rather than spot-checked: a
    // completeness bug that only shows up for one arrangement in fifty is
    // exactly the bug a hand-picked example would miss.
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 400; seed += 1) {
        const heights = randomHeights(seed * 7919);
        const found = complaints(heights, level.target);
        expect(found.length === 0, `${level.id}/${seed}`).toBe(matches(heights, level.target));
      }
    }
  });

  it('never says something that is not true of the plot it was given', () => {
    // Re-derives every complaint from the plot instead of trusting the code
    // that produced it. Without this, `complaints` could agree with `matches`
    // on emptiness and still point at the wrong file.
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 200; seed += 1) {
        const heights = randomHeights(seed * 104729);
        for (const complaint of complaints(heights, level.target)) {
          if (complaint.kind === 'loose-stone' || complaint.kind === 'gap') {
            const standing = heightAt(heights, complaint.rank, complaint.file) > 0;
            const wanted = maskBit(level.target.top, complaint.rank, complaint.file);
            expect(standing, JSON.stringify(complaint)).toBe(complaint.kind === 'loose-stone');
            expect(standing).not.toBe(wanted);
            continue;
          }
          const have = (complaint.panel === 'front' ? frontLevels : sideLevels)(heights)[complaint.line];
          const wanted = columnHeight(level.target[complaint.panel], complaint.line);
          const expected =
            complaint.kind === 'too-tall'
              ? { kind: 'too-tall', panel: complaint.panel, line: complaint.line, by: have - wanted }
              : { kind: 'too-short', panel: complaint.panel, line: complaint.line, by: wanted - have };
          expect(complaint).toEqual(expected);
          expect(complaint.kind === 'too-tall' ? have > wanted : have < wanted).toBe(true);
        }
      }
    }
  });
});

describe('the card the home page draws', () => {
  it('draws exactly the stones the plot has, no more and no fewer', () => {
    // The card is committed artwork the moment someone hand-writes its
    // coordinates, and hand-written artwork outlives whatever it was copied
    // from. This one is a projection of a plot, so the only way it can go stale
    // is if the projection stops agreeing with the plot — which is what this
    // test refuses.
    expect(CARD_STONES).toHaveLength(stoneCount(CARD_PLOT));
    for (const stone of CARD_STONES) {
      expect(heightAt(CARD_PLOT, stone.rank, stone.file)).toBeGreaterThan(stone.level);
    }
    const seats = new Set(CARD_STONES.map((stone) => `${stone.rank}/${stone.file}/${stone.level}`));
    expect(seats.size).toBe(CARD_STONES.length);
  });

  it('is a plot the game could have asked for', () => {
    for (const height of CARD_PLOT) expect(height).toBeLessThanOrEqual(MAX_HEIGHT);
    expect(stoneCount(CARD_PLOT)).toBeGreaterThan(0);
  });
});

describe('the levels that ship', () => {
  it('are five, and each has stones in it', () => {
    expect(LEVELS).toHaveLength(5);
    for (const level of LEVELS) expect(stoneCount(level.source)).toBeGreaterThan(0);
  });

  it('are five different puzzles, not one puzzle five times', () => {
    // "Every level is solvable" and "these are not the same puzzle" are two
    // different assertions, and only the second one costs anything: a designer
    // who raises the stone count without changing the shadows ships five
    // copies of level one with the fun filed off.
    const seen = new Set(
      LEVELS.map((level) => `${level.target.front}/${level.target.side}/${level.target.top}`),
    );
    expect(seen.size).toBe(LEVELS.length);
  });

  it('grow in the number of stones to place', () => {
    const counts = LEVELS.map((level) => stoneCount(level.source));
    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts[0]).toBe(1);
  });

  it('never ask for more than the stack limit', () => {
    for (const level of LEVELS) {
      for (const height of level.source) expect(height).toBeLessThanOrEqual(MAX_HEIGHT);
      expect(level.source).toHaveLength(SIZE * SIZE);
    }
  });
});
