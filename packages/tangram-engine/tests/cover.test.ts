import { describe, expect, it } from 'vitest';
import {
  checkFigure,
  FIGURES,
  type Figure,
  figureById,
  fromPolygon,
  type PieceId,
  RASTER_STEP,
  silhouetteMask,
  transform,
  translate,
  turned,
} from '../src/index';

const box = figureById('box') as Figure;

const without = (figure: Figure, id: PieceId) => figure.pieces.filter((piece) => piece.id !== id);

const pieceOf = (figure: Figure, id: PieceId) => {
  const found = figure.pieces.find((piece) => piece.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

describe('the shape and the answer are the same data', () => {
  it('gives the silhouette the area the seven pieces have', () => {
    for (const figure of FIGURES) {
      const mask = silhouetteMask(figure);
      const sampled = mask.targetSamples * RASTER_STEP * RASTER_STEP;
      // The seven pieces sum to 8 by construction; the raster has to agree
      // within a percent, or the mask and the pieces are describing different
      // shapes and every verdict after this is worthless.
      expect(sampled).toBeGreaterThan(8 * 0.99);
      expect(sampled).toBeLessThan(8 * 1.01);
      const pieces = figure.pieces.reduce((total, piece) => {
        const polygon = transform(piece);
        let sum = 0;
        for (let index = 0; index < polygon.length; index += 1) {
          const a = polygon[index];
          const b = polygon[(index + 1) % polygon.length];
          sum += a.x * b.y - b.x * a.y;
        }
        return total + Math.abs(sum / 2);
      }, 0);
      expect(pieces).toBeCloseTo(8, 9);
    }
  });
});

describe('the author placements are a legal answer', () => {
  it('says complete for every figure', () => {
    for (const figure of FIGURES) {
      const check = checkFigure(figure, figure.pieces);
      expect({ id: figure.id, bare: check.bare, spill: check.spill, double: check.double }).toEqual({
        id: figure.id,
        bare: 0,
        spill: 0,
        double: 0,
      });
      expect(check.complete).toBe(true);
      expect(check.unplaced).toEqual([]);
    }
  });
});

describe('a piece in the wrong place is not an answer', () => {
  it('notices a piece moved a little, and says which way it is wrong', () => {
    const moved = box.pieces.map((piece) => (piece.id === 'large-1' ? translate(piece, 0.15, 0) : piece));
    const check = checkFigure(box, moved);
    expect(check.complete).toBe(false);
    // Both symptoms at once: the vacated strip is bare and the overhang spills.
    expect(check.bare).toBeGreaterThan(0);
    expect(check.spill).toBeGreaterThan(0);
    // A fifteenth of a unit is small, and it is not nothing.
    expect(check.mismatch).toBeGreaterThan(0.005);
  });

  it('notices a piece turned by one step', () => {
    const rotated = box.pieces.map((piece) => (piece.id === 'medium' ? turned(piece, 1) : piece));
    const check = checkFigure(box, rotated);
    expect(check.complete).toBe(false);
  });

  it('notices a piece left in the tray, and names it', () => {
    const check = checkFigure(box, without(box, 'medium'));
    expect(check.complete).toBe(false);
    expect(check.unplaced).toEqual(['medium']);
  });

  it('notices a piece sitting on top of another', () => {
    const stacked = box.pieces.map((piece) =>
      piece.id === 'medium'
        ? { ...piece, cx: pieceOf(box, 'large-1').cx, cy: pieceOf(box, 'large-1').cy }
        : piece,
    );
    const check = checkFigure(box, stacked);
    expect(check.complete).toBe(false);
    expect(check.double).toBeGreaterThan(0);
  });
});

describe('a different answer is still an answer', () => {
  /**
   * The whole point of judging coverage rather than comparing placements. A
   * parallelogram has point symmetry about its centre, so half a turn draws the
   * same parallelogram — a genuinely different placement that covers the same
   * ground, and the one thing a "did you match the author" checker would fail.
   */
  it('accepts the parallelogram turned half way round', () => {
    const other = box.pieces.map((piece) => (piece.id === 'parallelogram' ? turned(piece, 4) : piece));
    const before = pieceOf(box, 'parallelogram');
    const after = pieceOf({ ...box, pieces: other }, 'parallelogram');
    expect(after.rotation).not.toBe(before.rotation);
    expect(checkFigure(box, other).complete).toBe(true);
  });

  it('accepts the square turned a quarter', () => {
    const other = box.pieces.map((piece) => (piece.id === 'square' ? turned(piece, 2) : piece));
    expect(checkFigure(box, other).complete).toBe(true);
  });

  it('accepts the two large triangles with their names swapped', () => {
    // The pieces are identical, so swapping which is called which is a
    // different placement list describing the same board.
    const swapped = box.pieces.map((piece) => {
      if (piece.id === 'large-1') return { ...pieceOf(box, 'large-2'), id: 'large-1' as PieceId };
      if (piece.id === 'large-2') return { ...pieceOf(box, 'large-1'), id: 'large-2' as PieceId };
      return piece;
    });
    expect(checkFigure(box, swapped).complete).toBe(true);
  });
});

describe('fromPolygon', () => {
  it('recovers the placement that draws the polygon it was given', () => {
    for (const figure of FIGURES) {
      for (const piece of figure.pieces) {
        const polygon = transform(piece);
        const recovered = fromPolygon(piece.id, polygon);
        const redrawn = transform(recovered);
        redrawn.forEach((point, index) => {
          expect(point.x).toBeCloseTo(polygon[index].x, 9);
          expect(point.y).toBeCloseTo(polygon[index].y, 9);
        });
        expect(Number.isInteger(recovered.rotation)).toBe(true);
      }
    }
  });

  it('refuses a polygon of the wrong shape', () => {
    expect(() =>
      fromPolygon('square', [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
      ]),
    ).toThrow(/not the square piece/);
  });
});
