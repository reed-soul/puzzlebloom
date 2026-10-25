/**
 * Snapping, and the one behaviour the keyboard depends on.
 *
 * The last test is a scripted player, allowed only arrow presses, finishing
 * every figure. It is the check that the whole board is reachable from the
 * keyboard — but it is not the check that guards the interesting rule, and it is
 * worth saying so plainly. Scripted solving never lands a piece on the wrong
 * corner, so it walks straight past the trap in "lets a piece leave a corner it
 * is sitting on": an unconditional snap, which pins a piece to whichever corner
 * it last touched, because every press that would have carried it away is inside
 * the radius and snaps it back. Mutation says as much — remove the closes-the-gap
 * condition from `snapOnNudge` and that one test fails while the solver stays
 * green. So the pair is the point: the corner test names the rule, the solver
 * proves the rule is enough to finish all six figures.
 */

import { describe, expect, it } from 'vitest';
import {
  checkFigure,
  FIGURES,
  type Figure,
  inTray,
  layoutFor,
  mirrored,
  PIECE_IDS,
  type Placement,
  snapOnNudge,
  snapPlacement,
  translate,
  turned,
  verticesOf,
} from '../src/index';

/**
 * Fourteen pixels at the size the board is actually drawn at. A 320px phone
 * leaves 296px of board across a 5.4-unit band, so one figure unit is about
 * 55 pixels and the snap radius is about a quarter of a unit.
 */
const SNAP_PX = 14;

const toleranceOn = (figure: Figure): number => SNAP_PX / (296 / layoutFor(figure).bandWidth);

describe('snapPlacement', () => {
  it('translates a piece onto the nearest corner and never turns it', () => {
    const figure = FIGURES[0];
    const layout = layoutFor(figure);
    const target = figure.pieces[0];
    const corners = figure.pieces.flatMap(verticesOf);
    const nearby = translate(layout.home[target.id], 0.08, -0.06);
    const snapped = snapPlacement(nearby, [corners], 4);
    expect(snapped.rotation).toBe(nearby.rotation);
    expect(snapped.flipped).toBe(nearby.flipped);
    expect(snapped.cx).not.toBe(nearby.cx);
  });

  it('leaves a piece alone when there is nothing within reach', () => {
    const figure = FIGURES[0];
    const corners = [figure.pieces.flatMap(verticesOf)];
    const lonely = translate(figure.pieces[0], 40, 40);
    expect(snapPlacement(lonely, corners, 0.25)).toBe(lonely);
  });

  it('does nothing at all with a tolerance of zero', () => {
    const figure = FIGURES[0];
    const corners = [figure.pieces.flatMap(verticesOf)];
    expect(snapPlacement(figure.pieces[0], corners, 0)).toBe(figure.pieces[0]);
  });
});

describe('snapOnNudge', () => {
  it('clicks a piece into place when the press closed the gap', () => {
    const figure = FIGURES[0];
    const corners = [figure.pieces.flatMap(verticesOf)];
    const target = figure.pieces.find((piece) => piece.id === 'square') as Placement;
    const before = translate(target, 0.2, 0.2);
    const after = translate(target, 0.1, 0.1);
    const snapped = snapOnNudge(before, after, corners, 0.25);
    // Landed exactly on the corner, not merely nearer to it.
    expect(snapped.cx).toBeCloseTo(target.cx, 9);
    expect(snapped.cy).toBeCloseTo(target.cy, 9);
  });

  it('lets a piece leave a corner it is sitting on', () => {
    const figure = FIGURES[0];
    const corners = [figure.pieces.flatMap(verticesOf)];
    const onIt = figure.pieces.find((piece) => piece.id === 'square') as Placement;
    const away = translate(onIt, 0.1, 0);
    // The trap this guards against: a plain nudge is inside the snap radius, so
    // an unconditional snap would put the piece straight back.
    expect(snapOnNudge(onIt, away, corners, 0.25)).toBe(away);
    expect(away.cx).toBeCloseTo(onIt.cx + 0.1, 9);
  });

  it('seats a piece that is walked towards a corner, press by press', () => {
    const figure = FIGURES[0];
    const corners = [figure.pieces.flatMap(verticesOf)];
    const square = figure.pieces.find((piece) => piece.id === 'square') as Placement;
    // Six tenths away, then a tenth back at a time. Every press closes the gap,
    // so the one that arrives inside the radius has to seat the piece exactly —
    // the same journey a keyboard player makes. The loop stops pressing the
    // moment it is home, which is what a player does too: one more press after
    // landing would carry it back off the corner.
    let where = translate(square, 0.6, 0);
    for (let press = 0; press < 8 && where.cx > square.cx + 1e-9; press += 1) {
      where = snapOnNudge(where, translate(where, -0.1, 0), corners, 0.25);
    }
    expect(where.cx).toBeCloseTo(square.cx, 9);
    expect(where.cy).toBeCloseTo(square.cy, 9);
  });
});

/**
 * A scripted player: turn the piece to match, then walk its centroid towards the
 * hole one press at a time, applying the same rule the game applies. It knows
 * the answer, which a real player does not — the claim being tested is that a
 * sequence of presses *exists*, not that finding it is easy.
 */
function keyboardSolve(figure: Figure) {
  const layout = layoutFor(figure);
  const tolerance = toleranceOn(figure);
  let placements: Placement[] = PIECE_IDS.map((id) => layout.home[id]);
  const cornersFor = (id: string) => {
    const others = placements.filter((piece) => piece.id !== id && !inTray(piece, layout)).map(verticesOf);
    return [figure.pieces.flatMap(verticesOf), ...others];
  };

  let presses = 0;
  for (const target of figure.pieces) {
    let where = placements.find((piece) => piece.id === target.id) as Placement;
    while (where.rotation !== target.rotation) {
      where = turned(where, 1);
      presses += 1;
    }
    if (where.flipped !== target.flipped) {
      where = mirrored(where);
      presses += 1;
    }

    for (let press = 0; press < 400; press += 1) {
      const dx = target.cx - where.cx;
      const dy = target.cy - where.cy;
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) break;
      const stepX = Math.abs(dx) < 0.05 ? 0 : Math.sign(dx) * Math.min(0.5, Math.abs(dx));
      const stepY = Math.abs(dy) < 0.05 ? 0 : Math.sign(dy) * Math.min(0.5, Math.abs(dy));
      const moved = translate(where, stepX, stepY);
      where = inTray(moved, layout) ? moved : snapOnNudge(where, moved, cornersFor(target.id), tolerance);
      presses += 1;
    }
    placements = placements.map((piece) => (piece.id === target.id ? where : piece));
  }
  return { check: checkFigure(figure, placements), presses };
}

describe('the keyboard', () => {
  it('can finish every figure, exactly, in a few dozen presses', () => {
    for (const figure of FIGURES) {
      const { check, presses } = keyboardSolve(figure);
      // Exact, not merely within tolerance: the snap is supposed to land a piece
      // on the corner, and a solve that needed the tolerance to pass would mean
      // the pieces were never quite meeting.
      expect(check.complete, figure.id).toBe(true);
      expect(check.bare, figure.id).toBe(0);
      expect(check.spill, figure.id).toBe(0);
      expect(check.double, figure.id).toBe(0);
      expect(presses, figure.id).toBeLessThan(200);
    }
  });
});
