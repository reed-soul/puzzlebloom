/**
 * What the game ships.
 *
 * Every level is written the way the figure looks from above, and its three
 * shadows are *derived* from it here rather than drawn by hand. That is the
 * same arrangement as the nonogram pictures and the tangram silhouettes: the
 * content is a determined figure, the clues are what the figure actually
 * casts, and the two cannot drift apart because nobody typed them twice.
 *
 * It also means a level can never be unsolvable. The figure that produced the
 * shadows is itself an answer, whether or not it is the only one.
 */

import { type Heights, plot, type Shadows, shadows } from './shadows';

export interface Level {
  id: string;
  /** Two or three words. The number is the shelf's, not the name's. */
  name: string;
  /**
   * The figure the shadows were taken from. Never shown — it is one answer
   * among several, and showing it would turn an open question into a copying
   * exercise.
   */
  source: Heights;
  /** All the player is given. */
  target: Shadows;
}

const level = (id: string, name: string, rows: string[]): Level => {
  const source = plot(...rows);
  return { id, name, source, target: shadows(source) };
};

export const LEVELS: readonly Level[] = [
  // One stone. The whole puzzle is "which square" — and every panel answers.
  level('one-stone', 'A single stone', ['0000', '0100', '0000', '0000']),
  // A row across the middle: the front view goes wide, the side view stays one
  // column deep. The first level where "the front sees every file at once" has
  // to be reconciled with "the side sees one rank".
  level('bench', 'A bench', ['0000', '1111', '0000', '0000']),
  // Two legs and a span. The footprint is a hollow rectangle, which is the
  // first level whose ground shadow rules stones out rather than in.
  level('gate', 'A gate', ['0000', '1010', '2020', '1010']),
  // Rising away from the viewer, so the front shadow is a staircase and the
  // side shadow is a different staircase. Two panels, one plot, no copying.
  level('staircase', 'A staircase', ['0000', '1000', '2100', '3210']),
  // A tower behind a low wall. File 3 is empty all the way through — a whole
  // column of the front shadow is blank while the rest of the plot is busy.
  level('tower', 'A tower', ['0040', '0010', '0120', '1110']),
];
