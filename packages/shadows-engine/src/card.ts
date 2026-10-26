/**
 * The figure the home page draws on this game's card.
 *
 * The card cannot import the game — that would put three.js in the garden's
 * first paint — so the figure lives here, in the engine, and the home page
 * takes it as data. Deriving the stones from a plot rather than listing their
 * coordinates is the whole point: a hand-drawn card keeps drawing whatever it
 * was drawn from, long after the game has stopped shipping that shape.
 *
 * Zero imports beyond the rules themselves, so the card costs the garden a few
 * kilobytes and no renderer.
 */

import { type Heights, plot } from './shadows';

export interface CardStone {
  file: number;
  rank: number;
  level: number;
}

/** A small rise with one tower in it — a plot you could actually solve. */
export const CARD_PLOT: Heights = plot('0000', '1200', '0010', '0000');

/** Every stone in that plot, as the coordinates a card needs to draw it. */
export const CARD_STONES: readonly CardStone[] = CARD_PLOT.flatMap((height, cell) => {
  const file = cell % 4;
  const rank = Math.floor(cell / 4);
  return Array.from({ length: height }, (_, level) => ({ file, rank, level }));
});
