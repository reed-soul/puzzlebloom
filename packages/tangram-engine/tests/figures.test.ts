import { describe, expect, it } from 'vitest';
import {
  checkFigure,
  FIGURES,
  figureAfter,
  figureById,
  PIECE_IDS,
  pieceDef,
  TUTORIAL_FIGURE_ID,
} from '../src/index';

describe('the library', () => {
  it('has at least six figures to play', () => {
    expect(FIGURES.length).toBeGreaterThanOrEqual(6);
  });

  it('has a unique id and a name for each', () => {
    const ids = FIGURES.map((figure) => figure.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const figure of FIGURES) {
      expect(figure.name.length).toBeGreaterThan(0);
      expect(figure.name.trim()).toBe(figure.name);
      expect(figure.name.endsWith('.')).toBe(false);
    }
  });

  it('uses exactly the seven pieces, once each, in every figure', () => {
    // Without this, a figure missing a piece would still pass a coverage test
    // that only looked at "is the silhouette covered": it would be covered, by
    // six pieces, and the seven-piece promise of the game would be a lie.
    for (const figure of FIGURES) {
      expect({ id: figure.id, count: figure.pieces.length }).toEqual({ id: figure.id, count: 7 });
      const ids = figure.pieces.map((piece) => piece.id).sort();
      expect(ids).toEqual([...PIECE_IDS].sort());
    }
  });

  it('writes every placement as a whole number of eighth-turns', () => {
    for (const figure of FIGURES) {
      for (const piece of figure.pieces) {
        expect(Number.isInteger(piece.rotation)).toBe(true);
        expect(piece.rotation).toBeGreaterThanOrEqual(0);
        expect(piece.rotation).toBeLessThanOrEqual(7);
        expect(Number.isFinite(piece.cx)).toBe(true);
        expect(Number.isFinite(piece.cy)).toBe(true);
        expect(pieceDef(piece.id)).toBeTruthy();
      }
    }
  });

  it('is a legal answer, every one of them', () => {
    const failures = FIGURES.map((figure) => {
      const check = checkFigure(figure, figure.pieces);
      return { id: figure.id, complete: check.complete, bare: check.bare, spill: check.spill };
    }).filter((row) => !row.complete);
    expect(failures).toEqual([]);
  });

  it('starts with the box, because it is the only silhouette you do not have to guess', () => {
    expect(FIGURES[0].id).toBe('box');
    expect(TUTORIAL_FIGURE_ID).toBe('box');
  });

  it('looks figures up by id, and shrugs at anything else', () => {
    expect(figureById('bench')?.id).toBe('bench');
    expect(figureById('nonsense')).toBeNull();
    expect(figureById(null)).toBeNull();
  });

  it('hands out the next figure, wrapping at the end', () => {
    const last = FIGURES[FIGURES.length - 1];
    expect(figureAfter(last.id).id).toBe(FIGURES[0].id);
    expect(figureAfter(null).id).toBe(FIGURES[0].id);
    expect(figureAfter(FIGURES[0].id).id).toBe(FIGURES[1].id);
  });
});
