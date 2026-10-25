import { describe, expect, it } from 'vitest';
import { type Figure, figureById, nextHint, type PieceId, spillByPiece, translate } from '../src/index';

const box = figureById('box') as Figure;

const moved = (figure: Figure, id: PieceId, dx: number, dy: number) =>
  figure.pieces.map((piece) => (piece.id === id ? translate(piece, dx, dy) : piece));

describe('nextHint', () => {
  it('says nothing is left to do when everything is home', () => {
    const hint = nextHint(box, box.pieces);
    expect(hint.kind).toBe('complete');
    expect(hint.message).toBe('Every piece is home.');
  });

  it('names the piece still in the tray', () => {
    const hint = nextHint(
      box,
      box.pieces.filter((piece) => piece.id !== 'medium'),
    );
    expect(hint.kind).toBe('unplaced');
    expect(hint.piece).toBe('medium');
    expect(hint.message).toBe('The medium triangle is still in the tray.');
  });

  it('names the piece hanging over the edge, and it is the worst offender', () => {
    // Pushed out of the left side of the box, where there is nothing else to
    // land on: the piece half leaves the shape without covering another piece,
    // so this is an overhang and not a stack.
    const placements = moved(box, 'medium', -1.1, 0);
    const hint = nextHint(box, placements);
    expect(hint.kind).toBe('spill');
    const worst = spillByPiece(box, placements)[0];
    expect(hint.piece).toBe(worst.id);
    expect(hint.piece).toBe('medium');
    expect(hint.message).toBe('The medium triangle is hanging over the edge of the shape.');
  });

  it('names two pieces lying on each other', () => {
    const large = box.pieces.find((piece) => piece.id === 'large-1');
    if (!large) throw new Error('no large-1');
    const placements = box.pieces.map((piece) =>
      piece.id === 'medium' ? { ...piece, cx: large.cx, cy: large.cy } : piece,
    );
    const hint = nextHint(box, placements);
    expect(hint.kind).toBe('double');
    expect(['medium', 'large-1']).toContain(hint.piece);
    expect(hint.message).toMatch(/are lying on top of each other\.$/);
  });

  it('counts the gap in the shape in small triangles, and says which edge it is on', () => {
    // Far enough away that the piece is outside the silhouette's neighbourhood
    // altogether, so this is a gap and not an overhang.
    const placements = moved(box, 'small-1', 40, 40);
    const hint = nextHint(box, placements);
    expect(hint.kind).toBe('bare');
    expect(hint.message).toMatch(/of the shape is still bare/);
    expect(hint.message).toMatch(/small triangle/);
    expect(hint.message.endsWith('.')).toBe(true);
  });
});

describe('the wording', () => {
  it('never gives a coordinate or a distance to move', () => {
    const cases = [
      nextHint(box, box.pieces),
      nextHint(
        box,
        box.pieces.filter((piece) => piece.id !== 'square'),
      ),
      nextHint(box, moved(box, 'large-2', 0, 1.4)),
      nextHint(box, moved(box, 'square', 40, 40)),
    ];
    for (const hint of cases) {
      // No digits anywhere: a hint that says "move 1.5 left" is the one thing
      // this game must never do.
      expect(hint.message).not.toMatch(/\d/);
      expect(hint.message).not.toMatch(/\b(left|right|up|down) by\b/);
      expect(hint.message.charAt(0)).toBe(hint.message.charAt(0).toUpperCase());
    }
  });
});
