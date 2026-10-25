/**
 * What the garden is allowed to remind you of.
 *
 * The one honest constraint of this game: **a hint may only mention a card the
 * player has already turned over themselves.** A memory game that says "the
 * snail is at position seven" when you have never looked at position seven is
 * not helping you remember; it is playing a different game with your hands.
 *
 * `seen` is therefore part of the contract, and it is the caller's to keep —
 * because "seen" is a fact about this round's play, not about the board. The
 * engine also offers `seenIn`, which derives the same set from the board's log
 * and its face-up cards, so a resumed round remembers what it has shown without
 * storing a second list that could disagree with the first.
 *
 * Where the card is matters too, and that is why `columns` is a parameter. The
 * row a card appears in is a fact about the rendered grid; the grid's column
 * count is set by the layout, and a hint that assumed its own count would name
 * the wrong row on a phone. So the caller — which is the thing that chose the
 * column count — passes it in.
 */

import type { Board } from './board';
import { type Creature, creatureName } from './creatures';

export interface Hint {
  /** The card being pointed at. Always face down, always one the player has seen. */
  readonly index: number;
  readonly creature: Creature;
  readonly message: string;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'] as const;

/** Boards never run past six rows or six columns, so the word list is the whole list. */
function ordinal(value: number): string {
  return ORDINALS[value - 1] ?? `${value}th`;
}

/**
 * Every card this round has shown the player: the ones already turned back over
 * (they are in the log) plus the ones still face up.
 */
export function seenIn(board: Board): Set<number> {
  const seen = new Set<number>(board.open);
  for (const entry of board.log) {
    seen.add(entry.a);
    seen.add(entry.b);
  }
  return seen;
}

/**
 * The card to remind the player about, or nothing at all.
 *
 * It picks the earliest such card in reading order rather than the most recent,
 * because a stable answer is easier to check and easier to act on: asking twice
 * without turning anything says the same thing twice.
 *
 * `null` is a real answer, not a failure. It means the player has not turned
 * over a single card that is face down now, and the caller says so plainly
 * rather than inventing something to fill the space.
 *
 * The sentence names the row and never the column, and that is a decision rather
 * than an omission. All four games refuse to do the last step for the player:
 * sudoku explains the technique instead of filling the cell, nonogram describes
 * the counting instead of marking the square, tangram says what is wrong instead
 * of moving the piece. A column would be this game's version of filling the
 * cell — with half the row already known, one more number is the answer, and the
 * player would be left with nothing but a press. A row is still executable:
 * either card of a pair is correct, so "the bear in the second row" turns a
 * search of eighteen cards into a search of three or six, and the remembering is
 * still the player's.
 *
 * Anyone who wants to add the column should settle a prior question: is this
 * game's hint still on the same line as the other three, or has it quietly
 * become a solver? `tests/hints.test.ts` pins the row wording and the
 * seen-only rule; it does not argue for them.
 */
export function nextHint(board: Board, seen: ReadonlySet<number>, columns: number): Hint | null {
  const step = Number.isInteger(columns) && columns > 0 ? columns : 3;
  for (let index = 0; index < board.faces.length; index += 1) {
    if (board.faces[index] !== 'down') continue;
    if (!seen.has(index)) continue;
    const creature = board.creatures[index];
    const row = ordinal(Math.floor(index / step) + 1);
    return {
      index,
      creature,
      message: `You turned ${creatureName(creature)} over in the ${row} row. It is still face down.`,
    };
  }
  return null;
}
