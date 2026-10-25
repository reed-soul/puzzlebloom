/**
 * The figure library.
 *
 * A figure is nothing but seven placements. The silhouette the player sees is
 * drawn from those same seven placements, and the win condition is tested
 * against a mask derived from them — so "what the picture looks like" and
 * "what it means to have solved it" cannot disagree, in the same way the
 * nonogram's clues are derived from its picture rather than authored beside it.
 *
 * Three things about authoring, because the next person to add a figure
 * deserves the warning:
 *
 * 1. A figure's legality is not a matter of opinion. `figures.test.ts` asserts,
 *    for every figure in this file, that the seven pieces cover the silhouette
 *    exactly once. If a coordinate is wrong by a hundredth, that test says so
 *    and says by how much.
 * 2. Pieces are written here as absolute polygons (`fromPolygon`), not as
 *    centroids to be computed in someone's head. Hand-deriving a centroid for a
 *    piece rotated by 45° is an arithmetic trap; writing the vertices is how the
 *    tiling is actually reasoned about, and `fromPolygon` recovers the rotation
 *    and the centroid exactly, once, so the saved format stays the small object
 *    it is meant to be.
 * 3. Two figures that differ only in where the two large triangles sit are the
 *    same puzzle wearing a different outline, and a player notices long before
 *    a test does. `cores.test.ts` compares the five small pieces' corners,
 *    normalised so that sliding a figure across the board does not count as a
 *    difference, and refuses a library that is one puzzle repeated. When adding
 *    a figure, check that its core is genuinely new — the large triangles are
 *    the easy half, and they are the half that carries no difficulty.
 */

import { type Bounds, boundsOf, type Placement, transform } from './geometry';
import { centroidOf, PIECE_IDS, type PieceId, type Point, pieceDef } from './pieces';

export interface Figure {
  readonly id: string;
  /** Sentence-case, because the win panel reads `{name} appeared`. */
  readonly name: string;
  readonly pieces: readonly Placement[];
}

const TOLERANCE = 1e-9;

function sameShape(a: readonly Point[], b: readonly Point[]): boolean {
  if (a.length !== b.length) return false;
  const claimed = new Array<boolean>(b.length).fill(false);
  for (const point of a) {
    let found = -1;
    for (let index = 0; index < b.length; index += 1) {
      if (claimed[index]) continue;
      if (Math.abs(point.x - b[index].x) <= TOLERANCE && Math.abs(point.y - b[index].y) <= TOLERANCE) {
        found = index;
        break;
      }
    }
    if (found === -1) return false;
    claimed[found] = true;
  }
  return true;
}

/**
 * Turn an absolute polygon into the placement that produces it.
 *
 * The match is on the vertex *set*, not on the edges. Every piece is convex, so
 * a set of its corners names exactly one region — and a mirrored parallelogram
 * has the same corners as its upright twin, which means an edge-order test
 * would reject the very placement that draws the right shape.
 *
 * Candidates are tried in a fixed order — unmirrored before mirrored, and
 * rotation 0 before 7 — so a symmetric piece (the square looks the same after
 * a quarter turn) always resolves to the same answer on every machine. That
 * matters more than it sounds: a progress save written with rotation 2 and read
 * back as rotation 0 would still draw the same square, but a test that compares
 * placements would fail on a coin-flip.
 */
export function fromPolygon(id: PieceId, polygon: readonly Point[]): Placement {
  const def = pieceDef(id);
  if (polygon.length !== def.vertices.length) {
    throw new Error(`The ${id} piece has ${def.vertices.length} corners, not ${polygon.length}.`);
  }
  const centre = centroidOf(polygon);
  for (const flipped of [false, true]) {
    for (let rotation = 0; rotation < 8; rotation += 1) {
      const candidate: Placement = { id, cx: centre.x, cy: centre.y, rotation, flipped };
      if (sameShape(transform(candidate), polygon)) return candidate;
    }
  }
  throw new Error(`That polygon is not the ${id} piece.`);
}

export interface FigureInput {
  readonly id: string;
  readonly name: string;
  readonly pieces: readonly Placement[];
}

/**
 * Validate once, at module load. A figure with two large triangles and no
 * square would otherwise be a puzzle that cannot be solved, and it would fail
 * as a mystery in the browser rather than as an error in a test.
 */
export function defineFigure(input: FigureInput): Figure {
  const seen = new Set<PieceId>();
  for (const piece of input.pieces) {
    if (seen.has(piece.id)) throw new Error(`Figure ${input.id} uses ${piece.id} twice.`);
    seen.add(piece.id);
  }
  const missing = PIECE_IDS.filter((id) => !seen.has(id));
  if (missing.length > 0) throw new Error(`Figure ${input.id} is missing ${missing.join(', ')}.`);
  return { id: input.id, name: input.name, pieces: input.pieces };
}

export function figureBounds(figure: Figure): Bounds {
  return boundsOf(figure.pieces.map(transform));
}

export const FIGURES: readonly Figure[] = [
  /**
   * The box. The one silhouette a player does not have to guess: it is the
   * shape the pieces arrived in, so solving it is a lesson in the set itself —
   * two of these are half of that, those two make a square.
   */
  defineFigure({
    id: 'box',
    name: 'The box they came in',
    pieces: [
      fromPolygon('large-1', [
        { x: 0, y: 0 },
        { x: 2 * Math.SQRT2, y: 0 },
        { x: Math.SQRT2, y: Math.SQRT2 },
      ]),
      fromPolygon('large-2', [
        { x: 2 * Math.SQRT2, y: 0 },
        { x: 2 * Math.SQRT2, y: 2 * Math.SQRT2 },
        { x: Math.SQRT2, y: Math.SQRT2 },
      ]),
      fromPolygon('small-1', [
        { x: 0, y: 0 },
        { x: Math.SQRT2 / 2, y: Math.SQRT2 / 2 },
        { x: 0, y: Math.SQRT2 },
      ]),
      fromPolygon('square', [
        { x: Math.SQRT2 / 2, y: Math.SQRT2 / 2 },
        { x: Math.SQRT2, y: Math.SQRT2 },
        { x: Math.SQRT2 / 2, y: (3 * Math.SQRT2) / 2 },
        { x: 0, y: Math.SQRT2 },
      ]),
      fromPolygon('small-2', [
        { x: Math.SQRT2, y: Math.SQRT2 },
        { x: (3 * Math.SQRT2) / 2, y: (3 * Math.SQRT2) / 2 },
        { x: Math.SQRT2 / 2, y: (3 * Math.SQRT2) / 2 },
      ]),
      fromPolygon('parallelogram', [
        { x: (3 * Math.SQRT2) / 2, y: (3 * Math.SQRT2) / 2 },
        { x: 2 * Math.SQRT2, y: 2 * Math.SQRT2 },
        { x: Math.SQRT2, y: 2 * Math.SQRT2 },
        { x: Math.SQRT2 / 2, y: (3 * Math.SQRT2) / 2 },
      ]),
      fromPolygon('medium', [
        { x: 0, y: Math.SQRT2 },
        { x: 0, y: 2 * Math.SQRT2 },
        { x: Math.SQRT2, y: 2 * Math.SQRT2 },
      ]),
    ],
  }),

  /**
   * Two 2×2 squares side by side: the easiest figure, and the one that shows
   * how the five small pieces make a square on their own. It is also the
   * arrangement that taught this file a lesson — five of the six figures used
   * to share it, so five puzzles were the same puzzle.
   */
  defineFigure({
    id: 'bench',
    name: 'The bench',
    pieces: [
      fromPolygon('large-1', [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 2 },
      ]),
      fromPolygon('large-2', [
        { x: 0, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 0 },
      ]),
      fromPolygon('medium', [
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 3, y: 1 },
      ]),
      fromPolygon('small-1', [
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]),
      fromPolygon('square', [
        { x: 2, y: 1 },
        { x: 3, y: 1 },
        { x: 3, y: 2 },
        { x: 2, y: 2 },
      ]),
      fromPolygon('small-2', [
        { x: 4, y: 1 },
        { x: 4, y: 2 },
        { x: 3, y: 2 },
      ]),
      fromPolygon('parallelogram', [
        { x: 3, y: 1 },
        { x: 4, y: 0 },
        { x: 4, y: 1 },
        { x: 3, y: 2 },
      ]),
    ],
  }),

  /**
   * A right-angled sail, nine parts of a square board in its own corner. The
   * two large triangles run along the top edge and the five small pieces fill
   * the wedge beneath them — which is the point of this figure: the five-piece
   * core is a diagonal band here, wider at the bottom than the top, and no
   * amount of moving the large triangles will make it into a square.
   */
  defineFigure({
    id: 'sail',
    name: 'The sail',
    pieces: [
      fromPolygon('large-1', [
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 2, y: 2 },
      ]),
      fromPolygon('large-2', [
        { x: 2, y: 0 },
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ]),
      fromPolygon('medium', [
        { x: 2, y: 2 },
        { x: 1, y: 1 },
        { x: 1, y: 3 },
      ]),
      fromPolygon('square', [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 0, y: 2 },
      ]),
      fromPolygon('parallelogram', [
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 0, y: 4 },
        { x: 0, y: 3 },
      ]),
      fromPolygon('small-1', [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 3 },
      ]),
      fromPolygon('small-2', [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 0, y: 0 },
      ]),
    ],
  }),

  /**
   * One stair tread: a bar four units wide standing on a foot two units square.
   * The largest pieces are not on top here — the foot is both large triangles,
   * and the bar is the five small pieces lined up, which is the arrangement the
   * set keeps finding new ways to hide.
   */
  defineFigure({
    id: 'step',
    name: 'The step',
    pieces: [
      fromPolygon('large-1', [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 3 },
      ]),
      fromPolygon('large-2', [
        { x: 2, y: 3 },
        { x: 2, y: 1 },
        { x: 0, y: 3 },
      ]),
      fromPolygon('medium', [
        { x: 2, y: 0 },
        { x: 3, y: 1 },
        { x: 1, y: 1 },
      ]),
      fromPolygon('square', [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
      fromPolygon('parallelogram', [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 1 },
        { x: 3, y: 1 },
      ]),
      fromPolygon('small-1', [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ]),
      fromPolygon('small-2', [
        { x: 4, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 1 },
      ]),
    ],
  }),

  /**
   * A square with a point on one side, centred on the body so it reads as an
   * arrow rather than as a leaning roof. The two large triangles meet along a
   * vertical seam to make the point, which is the only way to get an apex out
   * of both of them without an overhang — and the body behind it is a genuinely
   * unhelpful arrangement of the other five: the medium triangle stands on its
   * hypotenuse, the parallelogram leans the other way, and the square is off in
   * the corner rather than in the middle.
   */
  defineFigure({
    id: 'arrow',
    name: 'The arrow',
    pieces: [
      fromPolygon('large-1', [
        { x: 2, y: 1 },
        { x: 4, y: 1 },
        { x: 2, y: 3 },
      ]),
      fromPolygon('large-2', [
        { x: 2, y: 1 },
        { x: 2, y: -1 },
        { x: 4, y: 1 },
      ]),
      fromPolygon('medium', [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 0 },
      ]),
      fromPolygon('square', [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
      fromPolygon('parallelogram', [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ]),
      fromPolygon('small-1', [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
      ]),
      fromPolygon('small-2', [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 1 },
      ]),
    ],
  }),

  /**
   * A body with a wing on each end, on opposite corners — a bird seen from
   * underneath, which is how a bird is usually drawn when it is a silhouette.
   * The two large triangles are the body and the right wing; the five small
   * pieces make the left wing and the tail, so the left half of this figure is
   * the part that has to be worked out.
   */
  defineFigure({
    id: 'bird',
    name: 'The bird',
    pieces: [
      fromPolygon('large-1', [
        { x: 2, y: 0 },
        { x: 4, y: 0 },
        { x: 2, y: 2 },
      ]),
      fromPolygon('large-2', [
        { x: 2, y: 0 },
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ]),
      fromPolygon('medium', [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ]),
      fromPolygon('square', [
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: -1, y: 2 },
      ]),
      fromPolygon('parallelogram', [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ]),
      fromPolygon('small-1', [
        { x: -1, y: 2 },
        { x: -1, y: 1 },
        { x: -2, y: 2 },
      ]),
      fromPolygon('small-2', [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 0, y: 1 },
      ]),
    ],
  }),
];

const BY_ID = new Map(FIGURES.map((figure) => [figure.id, figure]));

export function figureById(id: unknown): Figure | null {
  if (typeof id !== 'string') return null;
  return BY_ID.get(id) ?? null;
}

export function figureIndex(id: string): number {
  return FIGURES.findIndex((figure) => figure.id === id);
}

/**
 * The figure a first-time player is dealt. The box, because it is the only
 * silhouette whose answer is already in their hands.
 */
export const TUTORIAL_FIGURE_ID = FIGURES[0].id;

/** Where the next figure in the list is, wrapping at the end. */
export function figureAfter(id: string | null): Figure {
  const at = id === null ? -1 : figureIndex(id);
  return FIGURES[(at + 1) % FIGURES.length];
}
