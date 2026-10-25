/**
 * Where a piece actually is, as opposed to what shape it is.
 *
 * A `Placement` is deliberately small: a piece, a centroid, a rotation in
 * eighths of a turn, and whether it has been mirrored. Two of those four
 * choices are worth defending.
 *
 * Rotation is an integer 0–7, not radians. Forty-five degrees is the only step
 * the pieces can usefully turn by — every angle in the set is a multiple of it
 * — so making it a step rather than a float turns "is this piece turned right"
 * into a question with an answer, and keeps undo, save files and hints from
 * drifting apart by a ten-thousandth of a radian.
 *
 * The anchor is the centroid. Rotating a large triangle about any other point
 * reads, on screen, as the piece being flung out of the place the player put
 * it; rotating about the centroid is the only choice that keeps a rotation
 * looking like a rotation.
 *
 * Everything here is a pure function over numbers. No DOM, no React, no
 * assumptions about which way is up beyond the usual screen convention (y
 * grows downwards), so the same maths drives the board, the tests and the
 * hint writer.
 */

import { centroidOf, type PieceId, type Point, pieceDef } from './pieces';

export interface Placement {
  readonly id: PieceId;
  /** Centroid, in figure units. */
  readonly cx: number;
  readonly cy: number;
  /** Eighths of a turn: 0–7. */
  readonly rotation: number;
  /** Mirrored across the piece's local y axis, before rotation. */
  readonly flipped: boolean;
}

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
  readonly centreX: number;
  readonly centreY: number;
}

export const TURN = Math.PI / 4;

/** Rotation is a step, so it survives a round trip through JSON and storage. */
export function normaliseRotation(rotation: number): number {
  if (!Number.isFinite(rotation)) return 0;
  const step = Math.round(rotation) % 8;
  return step < 0 ? step + 8 : step;
}

export function placement(id: PieceId, cx: number, cy: number, rotation = 0, flipped = false): Placement {
  return { id, cx, cy, rotation: normaliseRotation(rotation), flipped };
}

const localCentroid = new Map<PieceId, Point>();

function centroidOfPiece(id: PieceId): Point {
  const cached = localCentroid.get(id);
  if (cached) return cached;
  const found = centroidOf(pieceDef(id).vertices);
  localCentroid.set(id, found);
  return found;
}

/**
 * The piece's vertices in figure coordinates.
 *
 * Flip first, then rotate, then translate — in that order, because a mirror
 * after a rotation would mirror the rotation as well and the two would stop
 * being independent controls.
 */
export function transform(where: Placement): Point[] {
  const def = pieceDef(where.id);
  const centre = centroidOfPiece(where.id);
  const angle = normaliseRotation(where.rotation) * TURN;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return def.vertices.map((vertex) => {
    const dx = where.flipped ? -(vertex.x - centre.x) : vertex.x - centre.x;
    const dy = vertex.y - centre.y;
    return {
      x: where.cx + dx * cos - dy * sin,
      y: where.cy + dx * sin + dy * cos,
    };
  });
}

/** The same vertices, named the way a drawing needs them. */
export const pathOf = transform;

export function verticesOf(where: Placement): Point[] {
  return transform(where);
}

/** `"x1,y1 x2,y2 …"` — the `points` attribute of an SVG `polygon`. */
export function polygonPoints(where: Placement): string {
  return transform(where)
    .map((vertex) => `${round(vertex.x)},${round(vertex.y)}`)
    .join(' ');
}

export function pointsToString(polygon: readonly Point[]): string {
  return polygon.map((vertex) => `${round(vertex.x)},${round(vertex.y)}`).join(' ');
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Ray casting, strict about the boundary.
 *
 * A point lying exactly on an edge is reported as *outside*, and that is a
 * deliberate half-open convention rather than an oversight. Two pieces that
 * share an edge both have that edge, so a lattice of sample points laid over a
 * figure will put a few hundred of them exactly on the seams. If the boundary
 * counted as inside, those samples would be counted twice and every correct
 * answer would report a phantom overlap; if it counted as outside for one piece
 * and inside for the other, the seam would show up as a hairline gap. Reporting
 * it as outside for both makes it a sample the check simply ignores — see
 * `onOutline`, which is how `cover.ts` skips those samples in both the player's
 * mask and the silhouette's.
 */
export function insidePolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    const straddles = a.y > point.y !== b.y > point.y;
    if (straddles) {
      const crossing = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < crossing) inside = !inside;
    }
  }
  return inside;
}

/** True when the point lies on one of the polygon's edges. */
export function onOutline(point: Point, polygon: readonly Point[]): boolean {
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    if (onSegment(point, a, b)) return true;
  }
  return false;
}

function onSegment(point: Point, a: Point, b: Point): boolean {
  const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  const dot = (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
  if (dot < 0) return false;
  const lengthSquared = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= lengthSquared;
}

export function boundsOf(polygons: readonly (readonly Point[])[]): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const polygon of polygons) {
    for (const point of polygon) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centreX: 0, centreY: 0 };
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centreX: (minX + maxX) / 2,
    centreY: (minY + maxY) / 2,
  };
}

export function boundsOfPlacements(placements: readonly Placement[]): Bounds {
  return boundsOf(placements.map(transform));
}

export function translate(where: Placement, dx: number, dy: number): Placement {
  return { ...where, cx: where.cx + dx, cy: where.cy + dy };
}

export function movedTo(where: Placement, cx: number, cy: number): Placement {
  return { ...where, cx, cy };
}

export function turned(where: Placement, steps = 1): Placement {
  return { ...where, rotation: normaliseRotation(where.rotation + steps) };
}

export function mirrored(where: Placement): Placement {
  return { ...where, flipped: !where.flipped };
}

/** Squared distance, which is all a nearest-vertex search ever needs. */
export function distanceSquared(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}
