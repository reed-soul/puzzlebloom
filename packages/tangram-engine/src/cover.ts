/**
 * The judge.
 *
 * Tangram figures are not unique. The same cat can be built with the two large
 * triangles swapped, with the parallelogram mirrored, with two symmetric
 * pieces trading places — and every one of those is a correct answer. Comparing
 * the player's placements against the author's would mark most of them wrong,
 * which is the single easiest way to ruin this game.
 *
 * So the question is not "did you put the pieces where I did". It is "do these
 * seven pieces cover the silhouette exactly once":
 *
 *     bare   a sample the silhouette wants and no piece covers
 *     spill  a sample covered by a piece that the silhouette does not want
 *     double a sample covered twice
 *
 * and because the seven pieces always sum to the silhouette's area, "no bare
 * and no spill" already implies "no double" — the overlap has to go somewhere.
 * `double` is still counted separately, not for the verdict but because it is
 * the only way a hint can say "these two are lying on top of each other"
 * instead of the useless "something is wrong".
 *
 * The measurement is a raster: the silhouette's bounding box, grown by half a
 * unit, sampled at cell centres. A step of 0.02 units is roughly a hundredth of
 * a piece's width at the smallest figure, which is fine enough that a piece
 * nudged by a tenth is unmistakable and coarse enough that the whole check is
 * a few tens of milliseconds. It runs when a piece is dropped, never on a
 * pointer move — thirty checks a second would be visible as lag on a phone.
 *
 * The tolerance is 0.4% of the silhouette, and it is not leniency. Positions
 * come from a vertex snap on floating-point coordinates, so a correct answer
 * should be exact; the slack exists so that a piece which *looks* perfectly
 * placed can never be called wrong by a rounding error.
 */

import type { Figure } from './figures';
import { figureBounds } from './figures';
import { type Bounds, boundsOf, insidePolygon, onOutline, type Placement, transform } from './geometry';
import { PIECE_IDS, type PieceId } from './pieces';

export const RASTER_STEP = 0.02;
export const MISMATCH_TOLERANCE = 0.004;

/** Half a unit of margin, so a piece hanging over the edge is measurable. */
const MARGIN = 0.5;

export interface Grid {
  readonly x0: number;
  readonly y0: number;
  readonly step: number;
  readonly cols: number;
  readonly rows: number;
}

export interface Coverage {
  readonly grid: Grid;
  readonly counts: Uint8Array;
  readonly target: Uint8Array;
  readonly targetSamples: number;
  readonly bare: number;
  readonly spill: number;
  readonly double: number;
  /** `(bare + spill) / targetSamples` — the number the verdict compares. */
  readonly mismatch: number;
}

export interface Check extends Coverage {
  readonly complete: boolean;
  readonly unplaced: readonly PieceId[];
}

export function gridFor(bounds: Bounds, step: number = RASTER_STEP): Grid {
  // The two origins are deliberately unequal. A symmetric origin puts the grid's
  // sample points exactly on every 45° edge of a figure whose own coordinates
  // are symmetric, and a few hundred samples landing on seams is a few tenths
  // of a percent of the area — enough to make the tolerance do work it should
  // not have to. Nudging one axis by a fraction of a step costs nothing and
  // makes seams the rare exception instead of the rule.
  const x0 = bounds.minX - MARGIN + step * 0.155;
  const y0 = bounds.minY - MARGIN + step * 0.365;
  return {
    x0,
    y0,
    step,
    cols: Math.max(1, Math.ceil((bounds.width + 2 * MARGIN) / step)),
    rows: Math.max(1, Math.ceil((bounds.height + 2 * MARGIN) / step)),
  };
}

export function sampleAt(grid: Grid, index: number): { x: number; y: number } {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return {
    x: grid.x0 + (col + 0.5) * grid.step,
    y: grid.y0 + (row + 0.5) * grid.step,
  };
}

function countsFor(grid: Grid, placements: readonly Placement[]): { counts: Uint8Array; seam: Uint8Array } {
  const counts = new Uint8Array(grid.cols * grid.rows);
  // Samples that sit exactly on an edge belong to no piece and to no figure,
  // and are recorded here so both masks can ignore them. Without this, every
  // correct answer would report a phantom overlap of a hundred-odd samples
  // along the seams where two pieces meet.
  const seam = new Uint8Array(grid.cols * grid.rows);
  for (const where of placements) {
    const polygon = transform(where);
    const box = boundsOf([polygon]);
    // Only the cells this piece could possibly touch. Without the range limit a
    // drop would test seven pieces against every sample in the figure's box.
    const fromCol = Math.max(0, Math.floor((box.minX - grid.x0) / grid.step));
    const toCol = Math.min(grid.cols - 1, Math.ceil((box.maxX - grid.x0) / grid.step));
    const fromRow = Math.max(0, Math.floor((box.minY - grid.y0) / grid.step));
    const toRow = Math.min(grid.rows - 1, Math.ceil((box.maxY - grid.y0) / grid.step));
    for (let row = fromRow; row <= toRow; row += 1) {
      const y = grid.y0 + (row + 0.5) * grid.step;
      for (let col = fromCol; col <= toCol; col += 1) {
        const x = grid.x0 + (col + 0.5) * grid.step;
        const point = { x, y };
        const index = row * grid.cols + col;
        if (onOutline(point, polygon)) {
          seam[index] = 1;
          continue;
        }
        if (insidePolygon(point, polygon) && counts[index] < 255) counts[index] += 1;
      }
    }
  }
  return { counts, seam };
}

interface Mask {
  readonly grid: Grid;
  readonly target: Uint8Array;
  readonly targetSamples: number;
}

/**
 * The silhouette, as a mask.
 *
 * Built from the author's placements, which is the point: there is no second
 * description of the shape to fall out of step with the first. Cached per
 * figure because a figure's silhouette never changes and a player will measure
 * it thirty times.
 */
const masks = new Map<string, Mask>();

export function silhouetteMask(figure: Figure): Mask {
  const cached = masks.get(figure.id);
  if (cached) return cached;
  const grid = gridFor(figureBounds(figure));
  const { counts, seam } = countsFor(grid, figure.pieces);
  const target = new Uint8Array(counts.length);
  let targetSamples = 0;
  for (let index = 0; index < counts.length; index += 1) {
    if (counts[index] > 0 && seam[index] === 0) {
      target[index] = 1;
      targetSamples += 1;
    }
  }
  const mask: Mask = { grid, target, targetSamples };
  masks.set(figure.id, mask);
  return mask;
}

export function measure(figure: Figure, placements: readonly Placement[]): Coverage {
  const mask = silhouetteMask(figure);
  const { counts, seam } = countsFor(mask.grid, placements);
  let bare = 0;
  let spill = 0;
  let double = 0;
  for (let index = 0; index < counts.length; index += 1) {
    if (seam[index] !== 0) continue;
    const wanted = mask.target[index];
    const covered = counts[index];
    if (wanted && covered === 0) bare += 1;
    if (!wanted && covered > 0) spill += 1;
    if (covered >= 2) double += 1;
  }
  const mismatch = mask.targetSamples === 0 ? 1 : (bare + spill) / mask.targetSamples;
  return {
    grid: mask.grid,
    counts,
    target: mask.target,
    targetSamples: mask.targetSamples,
    bare,
    spill,
    double,
    mismatch,
  };
}

export function checkFigure(figure: Figure, placements: readonly Placement[]): Check {
  const given = new Set(placements.map((where) => where.id));
  const unplaced = PIECE_IDS.filter((id) => !given.has(id));
  const coverage = measure(figure, placements);
  const complete = unplaced.length === 0 && coverage.mismatch <= MISMATCH_TOLERANCE;
  return { ...coverage, complete, unplaced };
}

/** How much of each piece lands outside the silhouette, worst first. */
export function spillByPiece(
  figure: Figure,
  placements: readonly Placement[],
): Array<{ id: PieceId; spill: number }> {
  const mask = silhouetteMask(figure);
  return placements
    .map((where) => {
      const { counts, seam } = countsFor(mask.grid, [where]);
      let spill = 0;
      for (let index = 0; index < counts.length; index += 1) {
        if (seam[index] !== 0) continue;
        if (counts[index] > 0 && mask.target[index] === 0) spill += 1;
      }
      return { id: where.id, spill };
    })
    .sort((a, b) => b.spill - a.spill);
}

/**
 * Two pieces on the same sample. Returned as the pair, because "the square and
 * a large triangle are lying on top of each other" is a sentence a child can
 * act on and "two pieces overlap" is not.
 */
export function overlapPair(figure: Figure, placements: readonly Placement[]): [PieceId, PieceId] | null {
  const coverage = measure(figure, placements);
  // The scan below is the expensive shape of this question, so it is only worth
  // starting when the cheap answer already says there is something to find.
  if (coverage.double === 0) return null;
  const polygons = placements.map((where) => ({ id: where.id, polygon: transform(where) }));
  for (let index = 0; index < coverage.counts.length; index += 1) {
    if (coverage.counts[index] < 2) continue;
    const point = sampleAt(coverage.grid, index);
    let first: PieceId | null = null;
    let second: PieceId | null = null;
    for (const entry of polygons) {
      if (!insidePolygon(point, entry.polygon)) continue;
      if (first === null) first = entry.id;
      else if (second === null && entry.id !== first) second = entry.id;
      if (first !== null && second !== null) return [first, second];
    }
  }
  return null;
}

export type BareRegion =
  | 'top left corner'
  | 'top edge'
  | 'top right corner'
  | 'left edge'
  | 'middle'
  | 'right edge'
  | 'bottom left corner'
  | 'bottom edge'
  | 'bottom right corner';

/**
 * Where the shape is emptiest, in words a player can look at.
 *
 * A bare patch is almost always a gap the player is staring past, so naming the
 * third of the bounding box it sits in is the whole hint. `smallTriangles` is
 * the area converted into the only unit a player has in their hands.
 */
export function bareSpot(
  figure: Figure,
  placements: readonly Placement[],
): { region: BareRegion; smallTriangles: number } {
  const coverage = measure(figure, placements);
  const bounds = figureBounds(figure);
  const regions = new Array<number>(9).fill(0);
  let total = 0;
  for (let index = 0; index < coverage.target.length; index += 1) {
    if (!coverage.target[index] || coverage.counts[index] > 0) continue;
    const point = sampleAt(coverage.grid, index);
    const col = Math.min(2, Math.max(0, Math.floor(((point.x - bounds.minX) / (bounds.width || 1)) * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(((point.y - bounds.minY) / (bounds.height || 1)) * 3)));
    regions[row * 3 + col] += 1;
    total += 1;
  }
  let worst = 4;
  for (let index = 0; index < 9; index += 1) {
    if (regions[index] > regions[worst]) worst = index;
  }
  const area = total * coverage.grid.step * coverage.grid.step;
  // Rounded to the nearest half because "0.63 of a small triangle" is a number
  // nobody has ever wanted; the piece in their hand is the unit.
  const smallTriangles = Math.max(0.5, Math.round((area / 0.5) * 2) / 2);
  return { region: REGION_NAMES[worst], smallTriangles };
}

const REGION_NAMES: readonly BareRegion[] = [
  'top left corner',
  'top edge',
  'top right corner',
  'left edge',
  'middle',
  'right edge',
  'bottom left corner',
  'bottom edge',
  'bottom right corner',
];
