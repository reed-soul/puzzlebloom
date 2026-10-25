/**
 * What to say when a player asks for help.
 *
 * A hint here can never be "move it 1.5 to the left", for the same reason the
 * nonogram's hints never name a cell: the point is to look at the shape and
 * notice something, and a coordinate does the noticing for you. So every
 * sentence names a fact about the board — this piece is still in the tray, that
 * one is over the edge, these two are on top of each other, roughly this much
 * of the outline is bare and roughly where — and leaves the decision alone.
 *
 * The order is the order of usefulness. A piece in the tray outranks everything
 * (nothing else can be right while a piece is missing), a finished figure
 * outranks the nagging, and an overlap outranks a gap because overlapping is
 * the mistake that made the gap.
 */

import { bareSpot, checkFigure, overlapPair, spillByPiece } from './cover';
import type { Figure } from './figures';
import type { Placement } from './geometry';
import { PIECE_IDS, type PieceId, pieceDef, shapeLabel } from './pieces';

export type HintKind = 'complete' | 'unplaced' | 'spill' | 'bare' | 'double';

export interface Hint {
  readonly kind: HintKind;
  readonly message: string;
  /** The piece the sentence is about, when it is about one. */
  readonly piece?: PieceId;
}

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] as const;

/**
 * "one small triangle's worth", "one and a half small triangles' worth". The
 * unit is the piece in the player's hand, because that is the only ruler they
 * have; a percentage of an area would be true and useless.
 */
function amountText(triangles: number): string {
  const whole = Math.floor(triangles);
  const half = triangles - whole >= 0.25;
  if (whole === 0 && half) return "half a small triangle's worth";
  const word = COUNT_WORDS[Math.min(whole, COUNT_WORDS.length - 1)] ?? String(whole);
  if (!half) return `${word} small triangle${whole === 1 ? "'s" : "s'"} worth`;
  return `${word} and a half small triangles' worth`;
}

/** "a large triangle" when there are two of them, "the square" when there is one. */
function referred(id: PieceId): string {
  const label = shapeLabel(pieceDef(id).shape);
  const twins = PIECE_IDS.filter((other) => pieceDef(other).shape === pieceDef(id).shape).length;
  return `${twins > 1 ? 'a' : 'the'} ${label}`;
}

export function nextHint(figure: Figure, placements: readonly Placement[]): Hint {
  const coverage = checkFigure(figure, placements);

  if (coverage.unplaced.length > 0) {
    // The order in `PIECE_IDS` is biggest first, so the sentence points at the
    // piece whose absence matters most.
    const piece = coverage.unplaced[0];
    return {
      kind: 'unplaced',
      piece,
      message: `The ${shapeLabel(pieceDef(piece).shape)} is still in the tray.`,
    };
  }

  if (coverage.complete) {
    return { kind: 'complete', message: 'Every piece is home.' };
  }

  if (coverage.double > 0) {
    const pair = overlapPair(figure, placements);
    if (pair) {
      const [first, second] = pair;
      return {
        kind: 'double',
        piece: first,
        message: `${capitalise(referred(first))} and ${referred(second)} are lying on top of each other.`,
      };
    }
  }

  if (coverage.spill > 0) {
    const worst = spillByPiece(figure, placements)[0];
    if (worst && worst.spill > 0) {
      return {
        kind: 'spill',
        piece: worst.id,
        message: `The ${shapeLabel(pieceDef(worst.id).shape)} is hanging over the edge of the shape.`,
      };
    }
  }

  const spot = bareSpot(figure, placements);
  return {
    kind: 'bare',
    message: `About ${amountText(spot.smallTriangles)} of the shape is still bare ${spot.region}.`,
  };
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
