import { describe, expect, it } from 'vitest';
import { checkFigure, FIGURES, type Figure, type PieceId, type Point, transform } from '../src/index';

/**
 * The five pieces that are not large triangles.
 *
 * They are the whole difficulty of the game: the large triangles are two
 * halves of a big triangle and go wherever the outline has a big triangle's
 * shape in it, while the other five have to find a way to meet each other.
 * If those five settle into the same arrangement figure after figure, then
 * the library is one puzzle with six outlines, and no existing test can see
 * it — `figures.test.ts` only asks whether each figure can be built, which is
 * true of the same puzzle repeated.
 *
 * So this file asks a different question: are these six pictures six puzzles?
 */
const SMALL_FIVE: readonly PieceId[] = ['medium', 'square', 'parallelogram', 'small-1', 'small-2'];

/**
 * The five small pieces' corners, slid so that their own bounding box starts at
 * the origin, then sorted into a string.
 *
 * Sliding is the point. A figure sits where the author drew it, and two
 * identical arrangements drawn at different offsets are the same arrangement;
 * normalising against the core's own bounding box — not the figure's — makes
 * the signature blind to that translation and to nothing else. Rotation and
 * mirroring are *not* normalised, deliberately: a core turned on its side is a
 * different picture on the board, and the test is a floor on variety, not an
 * exact classification.
 *
 * The multiset rather than the set, because two pieces meeting at a point put
 * the same corner in the list twice, and that is information.
 */
function coreSignature(figure: Figure): string {
  const core = figure.pieces.filter((piece) => SMALL_FIVE.includes(piece.id)).map(transform);
  const corners = core.flat();
  const minX = Math.min(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const round = (value: number) => (Math.round(value * 1000) / 1000 + 0).toFixed(3);
  return corners
    .map((corner) => `${round(corner.x - minX)},${round(corner.y - minY)}`)
    .sort()
    .join(' ');
}

/** A short, stable picture of the core, for the failure message. */
function describeCore(figure: Figure): string {
  const core = figure.pieces.filter((piece) => SMALL_FIVE.includes(piece.id)).map(transform);
  const corners: Point[] = core.flat();
  const minX = Math.min(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const cols = 24;
  const rows = 12;
  const width = Math.max(...corners.map((corner) => corner.x)) - minX || 1;
  const height = Math.max(...corners.map((corner) => corner.y)) - minY || 1;
  const picture: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    let line = '';
    for (let col = 0; col < cols; col += 1) {
      const x = minX + ((col + 0.5) / cols) * width;
      const y = minY + ((row + 0.5) / rows) * height;
      line += covers(core, { x, y }) ? '#' : '.';
    }
    picture.push(line);
  }
  return picture.join('\n');
}

function covers(polygons: readonly Point[][], point: Point): boolean {
  let inside = false;
  for (const polygon of polygons) {
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
      const a = polygon[index];
      const b = polygon[previous];
      const straddles = a.y > point.y !== b.y > point.y;
      if (!straddles) continue;
      const crossing = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < crossing) inside = !inside;
    }
  }
  return inside;
}

describe('the cores', () => {
  it('uses three or more genuinely different five-piece layouts', () => {
    const signatures = FIGURES.map((figure) => ({ id: figure.id, signature: coreSignature(figure) }));
    const distinct = new Set(signatures.map((row) => row.signature));

    // The message is the useful part when this fails: it prints what every
    // figure's core actually is, so the next author can see at a glance which
    // two pictures are secretly the same puzzle.
    const report = signatures
      .map(
        (row, index) =>
          `${row.id} (figure ${index + 1} of ${FIGURES.length})\n  signature: ${row.signature}\n${describeCore(
            FIGURES[index],
          )}`,
      )
      .join('\n\n');
    const counts = new Map<string, number>();
    for (const row of signatures) counts.set(row.signature, (counts.get(row.signature) ?? 0) + 1);
    const clash = [...counts]
      .filter(([, count]) => count > 1)
      .map(([signature]) =>
        signatures
          .filter((row) => row.signature === signature)
          .map((row) => row.id)
          .join(' = '),
      )
      .join('\n');

    expect(
      distinct.size,
      `distinct cores: ${distinct.size}\nshared:\n${clash}\n\n${report}`,
    ).toBeGreaterThanOrEqual(3);
  });

  it('makes every figure a six-ways-different puzzle, not just three', () => {
    // Weaker than the check above and stronger in intent: the library promises
    // six pictures, so no two of them should share a core at all.
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const figure of FIGURES) {
      const signature = coreSignature(figure);
      const previous = seen.get(signature);
      if (previous === undefined) {
        seen.set(signature, figure.id);
      } else {
        clashes.push(`${previous} and ${figure.id}`);
      }
    }
    expect(clashes, clashes.join('\n')).toEqual([]);
  });

  it('builds every figure exactly, with nothing doubled and nothing bare', () => {
    // `figures.test.ts` asks only whether the coverage verdict passes, and the
    // verdict tolerates a fifth of a percent. A figure whose pieces overlapped
    // and left a matching hole would still be "complete". These three counts
    // rule that out, and they are checked here because this is the file that
    // adds figures.
    for (const figure of FIGURES) {
      const check = checkFigure(figure, figure.pieces);
      expect({ id: figure.id, complete: check.complete }).toEqual({ id: figure.id, complete: true });
      expect({ id: figure.id, bare: check.bare }).toEqual({ id: figure.id, bare: 0 });
      expect({ id: figure.id, spill: check.spill }).toEqual({ id: figure.id, spill: 0 });
      expect({ id: figure.id, double: check.double }).toEqual({ id: figure.id, double: 0 });
    }
  });
});
