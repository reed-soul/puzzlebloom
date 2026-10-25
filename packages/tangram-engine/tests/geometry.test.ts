import { describe, expect, it } from 'vitest';
import {
  areaOf,
  boundsOf,
  centroidOf,
  insidePolygon,
  mirrored,
  onOutline,
  type Placement,
  type Point,
  polygonPoints,
  TURN,
  transform,
  turned,
} from '../src/index';

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** A concave shape: an L. Ray casting has to survive the reflex corner. */
const ell: Point[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 2, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 0, y: 2 },
];

const where: Placement = { id: 'large-1', cx: 1.3, cy: -0.7, rotation: 0, flipped: false };

describe('transform', () => {
  it('turns a piece back onto itself after eight steps', () => {
    const first = transform(where);
    let moved = where;
    for (let step = 0; step < 8; step += 1) moved = turned(moved, 1);
    expect(moved.rotation).toBe(where.rotation);
    const now = transform(moved);
    now.forEach((point, index) => {
      expect(point.x).toBeCloseTo(first[index].x, 9);
      expect(point.y).toBeCloseTo(first[index].y, 9);
    });
  });

  it('does not come back after four steps', () => {
    const first = transform(where);
    const half = transform(turned(where, 4));
    expect(Math.abs(half[0].x - first[0].x)).toBeGreaterThan(0.1);
  });

  it('undoes a mirror when it is applied twice', () => {
    const twice = mirrored(mirrored(where));
    expect(twice.flipped).toBe(where.flipped);
    const a = transform(twice);
    const b = transform(where);
    a.forEach((point, index) => {
      expect(point.x).toBeCloseTo(b[index].x, 9);
      expect(point.y).toBeCloseTo(b[index].y, 9);
    });
  });

  it('keeps the area and keeps the centroid where it was put', () => {
    for (const rotation of [0, 1, 2, 3, 5, 7]) {
      for (const flipped of [false, true]) {
        const vertices = transform({ ...where, rotation, flipped });
        expect(Math.abs(areaOf(vertices))).toBeCloseTo(2, 9);
        const centre = centroidOf(vertices);
        expect(centre.x).toBeCloseTo(where.cx, 9);
        expect(centre.y).toBeCloseTo(where.cy, 9);
      }
    }
  });

  it('turns by forty-five degrees a step', () => {
    const before = transform(where);
    const after = transform(turned(where, 1));
    const centre = { x: where.cx, y: where.cy };
    const radius = Math.hypot(before[0].x - centre.x, before[0].y - centre.y);
    const angle = Math.atan2(before[0].y - centre.y, before[0].x - centre.x) + TURN;
    expect(after[0].x).toBeCloseTo(centre.x + Math.cos(angle) * radius, 9);
    expect(after[0].y).toBeCloseTo(centre.y + Math.sin(angle) * radius, 9);
  });

  it('rounds a rotation into 0–7 instead of trusting the caller', () => {
    expect(transform({ ...where, rotation: 9 })[0].x).toBeCloseTo(
      transform({ ...where, rotation: 1 })[0].x,
      9,
    );
    expect(transform({ ...where, rotation: -1 })[0].x).toBeCloseTo(
      transform({ ...where, rotation: 7 })[0].x,
      9,
    );
  });

  it('writes points the way SVG wants them', () => {
    expect(polygonPoints({ id: 'small-1', cx: 0, cy: 0, rotation: 0, flipped: false })).toMatch(
      /^-?[\d.]+,-?[\d.]+ -?[\d.]+,-?[\d.]+ -?[\d.]+,-?[\d.]+$/,
    );
  });
});

describe('insidePolygon', () => {
  it('is right about a convex shape', () => {
    expect(insidePolygon({ x: 0.5, y: 0.5 }, square)).toBe(true);
    expect(insidePolygon({ x: 1.5, y: 0.5 }, square)).toBe(false);
    expect(insidePolygon({ x: -0.01, y: 0.5 }, square)).toBe(false);
  });

  it('is right about a concave shape', () => {
    expect(insidePolygon({ x: 0.5, y: 0.5 }, ell)).toBe(true);
    expect(insidePolygon({ x: 0.5, y: 1.5 }, ell)).toBe(true);
    // In the notch, which a convex test would wrongly call inside.
    expect(insidePolygon({ x: 1.5, y: 1.5 }, ell)).toBe(false);
    expect(insidePolygon({ x: 1.5, y: 0.5 }, ell)).toBe(true);
  });

  it('gives a shared seam to at most one of the two pieces', () => {
    // The convention the rasteriser leans on. A sample sitting exactly on an
    // edge shared by two pieces must be inside at most one of them, or every
    // correct figure would report a phantom overlap. Which side claims it does
    // not matter, only that one side does.
    const left = [
      { x: -1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 1 },
    ];
    for (const y of [0.25, 0.5, 0.75]) {
      const seam = { x: 0, y };
      expect(onOutline(seam, left)).toBe(true);
      expect(onOutline(seam, square)).toBe(true);
      expect(insidePolygon(seam, left) && insidePolygon(seam, square)).toBe(false);
    }
    expect(onOutline({ x: 0.5, y: 0.5 }, square)).toBe(false);
    expect(onOutline({ x: 0.5, y: 1 }, square)).toBe(true);
  });
});

describe('boundsOf', () => {
  it('measures several polygons together', () => {
    const bounds = boundsOf([square, ell]);
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(2);
    expect(bounds.maxY).toBe(2);
    expect(bounds.width).toBe(2);
    expect(bounds.centreY).toBe(1);
  });
});
