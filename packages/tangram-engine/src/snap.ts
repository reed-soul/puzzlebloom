/**
 * Vertex snapping, which is the whole of this game's feel.
 *
 * A tangram figure is not built on a grid — the pieces' angles are 45° and 90°
 * and their edges are 1, √2, 2 — so "snap to the nearest grid line" would fight
 * every correct answer. What a piece actually wants is for its corners to meet
 * other corners, so that is what is measured: every vertex of the piece against
 * every vertex of everything already placed, including the outline of the
 * silhouette.
 *
 * One pair, the nearest, once. Not an iterative settle, not a per-axis choice:
 * a piece dropped near the right place clicks into it, and a piece dropped in
 * open space stays exactly where it was left.
 *
 * The result is a translation only. Snapping must never rotate or mirror a
 * piece, because the player did not ask for that and would not understand the
 * answer if it happened.
 */

import { distanceSquared, type Placement, transform, translate } from './geometry';
import type { Point } from './pieces';

export function snapPlacement(
  where: Placement,
  contexts: readonly (readonly Point[])[],
  tolerance: number,
): Placement {
  if (!(tolerance > 0)) return where;
  const vertices = transform(where);
  let best = tolerance * tolerance;
  let shiftX = 0;
  let shiftY = 0;
  for (const polygon of contexts) {
    for (const anchor of polygon) {
      for (const vertex of vertices) {
        const distance = distanceSquared(anchor, vertex);
        if (distance < best) {
          best = distance;
          shiftX = anchor.x - vertex.x;
          shiftY = anchor.y - vertex.y;
        }
      }
    }
  }
  return shiftX === 0 && shiftY === 0 ? where : translate(where, shiftX, shiftY);
}

/** Squared distance from the nearest corner of the piece to the nearest corner. */
function gapFrom(where: Placement, contexts: readonly (readonly Point[])[]): number {
  const vertices = transform(where);
  let best = Number.POSITIVE_INFINITY;
  for (const polygon of contexts) {
    for (const anchor of polygon) {
      for (const vertex of vertices) {
        const distance = distanceSquared(anchor, vertex);
        if (distance < best) best = distance;
      }
    }
  }
  return best;
}

const GAP_EPSILON = 1e-12;

/**
 * The snap as one arrow press feels it.
 *
 * A press that moves a piece *towards* a corner it could land on clicks it into
 * place. A press that moves it away — or sideways — does not, and must not. A
 * keyboard nudge is a tenth of a unit and the snap radius is about a tenth of a
 * piece, so a snap applied unconditionally would take a piece nudged off a
 * corner and put it straight back, and the keyboard would be unable to move
 * anything at all. Worse, a piece that had been pulled onto the *wrong* corner
 * would stay there: no press could ever leave it.
 *
 * The comparison is against the nearest corner on the board rather than against
 * one particular corner, because the useful question is only "is this press
 * closing a gap", and with seven pieces' worth of corners the gap that matters
 * is the smallest one available.
 *
 * `from` is where the piece was and `to` is where the press put it, so this is
 * a function of a move rather than of a position — which is exactly why it
 * cannot live inside `snapPlacement`.
 */
export function snapOnNudge(
  from: Placement,
  to: Placement,
  contexts: readonly (readonly Point[])[],
  tolerance: number,
): Placement {
  if (!(tolerance > 0)) return to;
  if (gapFrom(to, contexts) >= gapFrom(from, contexts) - GAP_EPSILON) return to;
  return snapPlacement(to, contexts, tolerance);
}
