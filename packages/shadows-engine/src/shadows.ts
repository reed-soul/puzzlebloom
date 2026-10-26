/**
 * Stone shadows, as rules rather than as geometry.
 *
 * The game is one object seen three ways: a plot of stacked stones, and the
 * three shadows that plot throws — from the front, from the side, from above.
 * A level shows the three shadows and withholds the plot; the player stacks
 * stones until the shadows agree. Nothing here knows what a stone looks like,
 * what a camera is, or that a canvas exists.
 *
 * Why the *shadows* and not the figure: a silhouette is a lossy picture of a
 * solid, so one set of shadows is a family of answers rather than a single
 * one. That is the honest way round. The game never asks "did you build the
 * figure I built"; it asks "do your shadows match the ones on the wall", and
 * every arrangement that matches is accepted, the way tangram accepts every
 * arrangement that covers its silhouette. A puzzle whose answer key is a
 * secret shape would have to lie to a player who found a *different* valid
 * answer.
 *
 * The projections are bit masks, one bit per (row, column) of a small grid,
 * because the comparison that matters is exact equality and an integer can be
 * compared in a single instruction while an array of booleans cannot.
 */

/** The plot is square, and four is as much as a child can hold in their head. */
export const SIZE = 4;

/** Stack limit. Above this the plots stop reading as objects and start reading as walls. */
export const MAX_HEIGHT = 4;

export const CELLS = SIZE * SIZE;

/**
 * A plot: the height of each of its sixteen columns.
 *
 * `index = rank * SIZE + file`, rank 0 nearest the viewer and file 0 on the
 * left. Every module in this package reads heights through `heightAt` so the
 * layout is written down once — index arithmetic is where a game like this
 * quietly goes wrong, and a wrong-but-consistent plot looks exactly like a
 * right one until the shadows disagree.
 */
export type Heights = readonly number[];

/** One 4×4 grid of bits per viewing direction. */
export interface Shadows {
  /** Bits at (level, file): what is blocked looking from the front. */
  front: number;
  /** Bits at (level, rank): what is blocked looking from the side. */
  side: number;
  /** Bits at (rank, file): what the plot covers looking from above. */
  top: number;
}

export type Panel = keyof Shadows;

/** How many cells a mask has, and in which direction it misses. */
export interface Diff {
  /** Set in the mask, absent from the target. */
  extra: number;
  /** Set in the target, absent from the mask. */
  missing: number;
}

/**
 * A single true statement about the difference between a plot and a target.
 *
 * The engine describes; the screen phrases. Keeping the prose out of here is
 * what lets `complaints` be tested for completeness instead of for wording.
 */
export type Complaint =
  /** A stone stands where the plan has no shadow at all. */
  | { kind: 'loose-stone'; rank: number; file: number }
  /** The plan covers this cell but nothing stands on it. */
  | { kind: 'gap'; rank: number; file: number }
  /** A whole line is taller than the plan wants it. */
  | { kind: 'too-tall'; panel: 'front' | 'side'; line: number; by: number }
  /** A whole line is shorter than the plan wants it. */
  | { kind: 'too-short'; panel: 'front' | 'side'; line: number; by: number };

const bit = (row: number, column: number): number => 1 << (row * SIZE + column);

const popcount = (mask: number): number => {
  let count = 0;
  for (let rest = mask; rest !== 0; rest &= rest - 1) count += 1;
  return count;
};

/** The bit at (row, column) of a mask — `row` is a height for front and side. */
export const maskBit = (mask: number, row: number, column: number): boolean =>
  (mask & bit(row, column)) !== 0;

/**
 * A mask as rows of cells, row 0 first.
 *
 * For `front` and `side` row 0 is the ground, so anything drawing them as a
 * wall has to flip the list — that flip belongs on the screen, not here, where
 * it would make the masks disagree with their own bit indices.
 */
export const maskRows = (mask: number): boolean[][] =>
  Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, column) => maskBit(mask, row, column)),
  );

/** The height of column `column` in a silhouette: a solid column's bit count. */
export const columnHeight = (mask: number, column: number): number => popcount(mask & columnMask(column));

const columnMask = (column: number): number => {
  let mask = 0;
  for (let row = 0; row < SIZE; row += 1) mask |= bit(row, column);
  return mask;
};

/** The height of the column at rank/file. Out-of-range reads as empty ground. */
export const heightAt = (heights: Heights, rank: number, file: number): number =>
  heights[rank * SIZE + file] ?? 0;

/** An empty plot. Every level starts here. */
export const emptyPlot = (): Heights => Array.from({ length: CELLS }, () => 0);

/**
 * A plot written as words — four rows of four digits, nearest row first.
 *
 * Levels are the only place heights are written by hand, so they are written
 * in the shape you would draw them, and anything that is not a digit 0–4 in a
 * four-by-four frame throws rather than quietly becoming a shorter plot.
 */
export function plot(...rows: string[]): Heights {
  if (rows.length !== SIZE) {
    throw new Error(`A plot needs ${SIZE} rows, got ${rows.length}`);
  }
  const heights: number[] = [];
  for (const row of rows) {
    if (row.length !== SIZE) {
      throw new Error(`Row "${row}" needs ${SIZE} cells, got ${row.length}`);
    }
    for (const cell of row) {
      if (!/^[0-9]$/.test(cell) || Number(cell) > MAX_HEIGHT) {
        throw new Error(`Row "${row}" has "${cell}"; heights run 0–${MAX_HEIGHT}`);
      }
      heights.push(Number(cell));
    }
  }
  return heights;
}

/**
 * Add one stone to a column.
 *
 * A full column hands back the very same array: the plot did not change, so
 * nothing above this should think it did. That one identity comparison is why
 * tapping a full column costs no repaint.
 */
export function raise(heights: Heights, cell: number): Heights {
  const height = heights[cell] ?? 0;
  if (height >= MAX_HEIGHT) return heights;
  const next = [...heights];
  next[cell] = height + 1;
  return next;
}

/** Take the top stone off a column. An empty column is left exactly as it was. */
export function lower(heights: Heights, cell: number): Heights {
  const height = heights[cell] ?? 0;
  if (height <= 0) return heights;
  const next = [...heights];
  next[cell] = height - 1;
  return next;
}

export const stoneCount = (heights: Heights): number => heights.reduce((total, height) => total + height, 0);

/** How tall the tallest stone in each file is — the front shadow, as numbers. */
export const frontLevels = (heights: Heights): number[] =>
  Array.from({ length: SIZE }, (_, file) => {
    let tallest = 0;
    for (let rank = 0; rank < SIZE; rank += 1) {
      tallest = Math.max(tallest, heightAt(heights, rank, file));
    }
    return tallest;
  });

/** How tall the tallest stone in each rank is — the side shadow, as numbers. */
export const sideLevels = (heights: Heights): number[] =>
  Array.from({ length: SIZE }, (_, rank) => {
    let tallest = 0;
    for (let file = 0; file < SIZE; file += 1) {
      tallest = Math.max(tallest, heightAt(heights, rank, file));
    }
    return tallest;
  });

/**
 * The three shadows this plot throws.
 *
 * A stone at level *l* blocks the front view of its file at every level below
 * *l*, not only at *l* — a silhouette is what you cannot see past, and stone
 * stacking is what makes the result a solid column instead of a scatter. The
 * loop is over stones, not over the finished mask, so the mask cannot disagree
 * with the plot.
 */
export function shadows(heights: Heights): Shadows {
  let front = 0;
  let side = 0;
  let top = 0;
  for (let rank = 0; rank < SIZE; rank += 1) {
    for (let file = 0; file < SIZE; file += 1) {
      const height = heightAt(heights, rank, file);
      if (height <= 0) continue;
      top |= bit(rank, file);
      for (let level = 0; level < height; level += 1) {
        front |= bit(level, file);
        side |= bit(level, rank);
      }
    }
  }
  return { front, side, top };
}

/** The one question the game asks. */
export function matches(heights: Heights, target: Shadows): boolean {
  const cast = shadows(heights);
  return cast.front === target.front && cast.side === target.side && cast.top === target.top;
}

export const diff = (mask: number, target: number): Diff => ({
  extra: popcount(mask & ~target),
  missing: popcount(target & ~mask),
});

export interface Report {
  solved: boolean;
  front: Diff;
  side: Diff;
  top: Diff;
}

/** Where the plot stands against the plan, panel by panel. */
export function report(heights: Heights, target: Shadows): Report {
  const cast = shadows(heights);
  const front = diff(cast.front, target.front);
  const side = diff(cast.side, target.side);
  const top = diff(cast.top, target.top);
  // Asked of the masks directly rather than of the four counts: "no cell is
  // wrong" and "the masks are equal" are the same statement, and only one of
  // them stays true if a future panel is added to the game.
  const solved = cast.front === target.front && cast.side === target.side && cast.top === target.top;
  return { solved, front, side, top };
}

/**
 * Everything true about the difference, in the order a person can act on it.
 *
 * Footprint first: a stone with no shadow under it makes the height complaints
 * downstream of it misleading, so it has to go before the heights are worth
 * reading. Then too-tall before too-short, because too-tall is a fact about a
 * specific stone while too-short is a fact about a line that could be fixed in
 * four places.
 *
 * The list is complete — empty exactly when the plot matches — which is the
 * only reason a hint built from its first entry can never shrug at a player
 * who is genuinely stuck. `tests/shadows.test.ts` holds that invariant against
 * random plots rather than the five it ships.
 */
export function complaints(heights: Heights, target: Shadows): Complaint[] {
  const found: Complaint[] = [];

  for (let rank = 0; rank < SIZE; rank += 1) {
    for (let file = 0; file < SIZE; file += 1) {
      const standing = heightAt(heights, rank, file) > 0;
      const wanted = maskBit(target.top, rank, file);
      if (standing && !wanted) found.push({ kind: 'loose-stone', rank, file });
      if (!standing && wanted) found.push({ kind: 'gap', rank, file });
    }
  }

  for (const [panel, levels] of [
    ['front', frontLevels(heights)],
    ['side', sideLevels(heights)],
  ] as const) {
    for (let line = 0; line < SIZE; line += 1) {
      const wanted = columnHeight(target[panel], line);
      const have = levels[line];
      if (have > wanted) found.push({ kind: 'too-tall', panel, line, by: have - wanted });
      if (have < wanted) found.push({ kind: 'too-short', panel, line, by: wanted - have });
    }
  }

  return found;
}
