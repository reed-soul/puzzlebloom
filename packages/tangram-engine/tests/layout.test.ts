import { describe, expect, it } from 'vitest';
import {
  boundsOf,
  FIGURES,
  inTray,
  layoutFor,
  PIECE_IDS,
  type TangramLayout,
  transform,
  translate,
} from '../src/index';

const numbersIn = (layout: TangramLayout): number[] => layout.viewBox.split(' ').map((part) => Number(part));

describe('layoutFor', () => {
  it('gives every figure a viewBox that names four real numbers', () => {
    for (const figure of FIGURES) {
      const layout = layoutFor(figure);
      const numbers = numbersIn(layout);
      expect(numbers).toHaveLength(4);
      for (const value of numbers) expect(Number.isFinite(value)).toBe(true);
      expect(numbers[2]).toBeGreaterThan(0);
      expect(numbers[3]).toBeGreaterThan(0);
    }
  });

  it('puts all seven pieces in the tray to start with', () => {
    for (const figure of FIGURES) {
      const layout = layoutFor(figure);
      for (const id of PIECE_IDS) {
        expect(inTray(layout.home[id], layout)).toBe(true);
      }
    }
  });

  it('keeps the tray pieces inside the drawn area', () => {
    for (const figure of FIGURES) {
      const layout = layoutFor(figure);
      const [minX, minY, width, height] = numbersIn(layout);
      const pieces = PIECE_IDS.map((id) => transform(layout.home[id]));
      const bounds = boundsOf(pieces);
      // A piece drawn outside the viewBox is a piece that cannot be picked up.
      expect(bounds.minX).toBeGreaterThanOrEqual(minX - 1e-6);
      expect(bounds.maxX).toBeLessThanOrEqual(minX + width + 1e-6);
      expect(bounds.minY).toBeGreaterThanOrEqual(minY - 1e-6);
      expect(bounds.maxY).toBeLessThanOrEqual(minY + height + 1e-6);
    }
  });

  it('does not overlap the silhouette with the tray', () => {
    for (const figure of FIGURES) {
      const layout = layoutFor(figure);
      expect(layout.tray.minY).toBeGreaterThan(layout.silhouette.maxY);
    }
  });

  it('stops calling a piece "in the tray" once it is lifted into the figure', () => {
    const layout = layoutFor(FIGURES[0]);
    const lifted = translate(layout.home['large-1'], 0, -(layout.tray.minY - layout.silhouette.minY) - 1);
    expect(inTray(lifted, layout)).toBe(false);
  });

  it('gives the pieces room to be picked up on a narrow board', () => {
    // The band never shrinks below what seven pieces need in three rows, or the
    // viewBox would scale the tray down to an untouchable size.
    for (const figure of FIGURES) {
      const layout = layoutFor(figure);
      expect(layout.bandWidth).toBeGreaterThanOrEqual(5.4);
    }
  });
});
