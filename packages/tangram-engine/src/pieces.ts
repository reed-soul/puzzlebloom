/**
 * The seven pieces, and the arithmetic the rest of the engine is built on.
 *
 * The unit is fixed here and never restated: the leg of a small triangle is 1.
 * Every other length in the game is then either an integer or a multiple of √2
 * — the large triangle's legs are 2, the medium's are √2, the square's side is
 * 1, the parallelogram's sides are 1 and √2. That is not a coincidence, it is
 * the reason the pieces tile anything at all, and it is why a figure can be
 * written as a dozen coordinates and still be checked to the last millimetre.
 *
 * Each polygon is stored with its right angle (or its first corner) at the
 * origin. That is only the canonical form: a `Placement` carries the centroid,
 * so nothing about the origin survives into the game, and no piece is ever
 * rotated about a corner the player cannot see.
 */

export const SQRT2 = Math.SQRT2;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type PieceId = 'large-1' | 'large-2' | 'medium' | 'small-1' | 'small-2' | 'square' | 'parallelogram';

/** The five shapes behind seven pieces. Hints and labels speak in these. */
export type PieceShape = 'large' | 'medium' | 'small' | 'square' | 'parallelogram';

export interface PieceDef {
  readonly id: PieceId;
  readonly shape: PieceShape;
  /**
   * The canonical polygon. Winding is positive for every piece — clockwise on
   * a screen, counter-clockwise in maths orientation — which is what lets
   * `fromPolygon` tell a mirrored match from a real one instead of accepting
   * the first vertex set that happens to line up.
   */
  readonly vertices: readonly Point[];
  readonly area: number;
}

const LARGE: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 2 },
];

const MEDIUM: readonly Point[] = [
  { x: 0, y: 0 },
  { x: SQRT2, y: 0 },
  { x: 0, y: SQRT2 },
];

const SMALL: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];

const UNIT_SQUARE: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/**
 * Sides 1 and √2 enclosing 45°, which is the only angle the pieces have left
 * to offer once triangles and the square are accounted for.
 */
const PARALLELOGRAM: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 1 },
];

/**
 * Order matters: it is the order the tray is filled and the order a hint walks
 * when it needs "a piece" rather than "this piece". Biggest first, because the
 * big pieces are the ones that decide where a figure goes.
 */
export const PIECES: readonly PieceDef[] = [
  { id: 'large-1', shape: 'large', vertices: LARGE, area: 2 },
  { id: 'large-2', shape: 'large', vertices: LARGE, area: 2 },
  { id: 'medium', shape: 'medium', vertices: MEDIUM, area: 1 },
  { id: 'square', shape: 'square', vertices: UNIT_SQUARE, area: 1 },
  { id: 'parallelogram', shape: 'parallelogram', vertices: PARALLELOGRAM, area: 1 },
  { id: 'small-1', shape: 'small', vertices: SMALL, area: 0.5 },
  { id: 'small-2', shape: 'small', vertices: SMALL, area: 0.5 },
];

export const PIECE_IDS: readonly PieceId[] = PIECES.map((piece) => piece.id);

const BY_ID = new Map<PieceId, PieceDef>(PIECES.map((piece) => [piece.id, piece]));

export function pieceDef(id: PieceId): PieceDef {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown piece: ${id}`);
  return found;
}

export function isPieceId(value: unknown): value is PieceId {
  return typeof value === 'string' && BY_ID.has(value as PieceId);
}

/** Signed area: positive for the winding every canonical piece uses. */
export function areaOf(polygon: readonly Point[]): number {
  let total = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const here = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    total += here.x * next.y - next.x * here.y;
  }
  return total / 2;
}

/**
 * Area-weighted centroid, which for a triangle is also the vertex average but
 * for the square and the parallelogram is not — and it is the square and the
 * parallelogram that a naive average would quietly drag off centre.
 */
export function centroidOf(polygon: readonly Point[]): Point {
  let twiceArea = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const here = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const cross = here.x * next.y - next.x * here.y;
    twiceArea += cross;
    x += (here.x + next.x) * cross;
    y += (here.y + next.y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-12) {
    // Degenerate input (a line, or repeated points). There is no centroid to
    // find; the mean is a better answer than NaN, and no figure here is built
    // from degenerate polygons.
    const sum = polygon.reduce<Point>((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
      x: 0,
      y: 0,
    });
    return { x: sum.x / polygon.length, y: sum.y / polygon.length };
  }
  const factor = 3 * twiceArea;
  return { x: x / factor, y: y / factor };
}

const SHAPE_LABEL: Record<PieceShape, string> = {
  large: 'large triangle',
  medium: 'medium triangle',
  small: 'small triangle',
  square: 'square',
  parallelogram: 'parallelogram',
};

/** Lower case, because a hint reads as a sentence, not as a caption. */
export function shapeLabel(shape: PieceShape): string {
  return SHAPE_LABEL[shape];
}

export function pieceLabel(id: PieceId): string {
  return shapeLabel(pieceDef(id).shape);
}

/** Sentence-initial form, for `aria-label` and the tray legend. */
export function pieceTitle(id: PieceId): string {
  const label = pieceLabel(id);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
