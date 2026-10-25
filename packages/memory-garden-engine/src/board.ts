/**
 * The state machine, which is the whole game.
 *
 * One rule here is not obvious and is the reason this file has a header at all:
 * **a pair that misses does not turn back over by itself.** Those two cards stay
 * face up until the player turns the next card, and only then are they covered.
 *
 * The alternative — a timer that flips a wrong pair back after a second — is
 * what most memory games do, and it is wrong twice for this audience. It
 * punishes a slow reader: a four-year-old who is still working out what they are
 * looking at loses the picture before they have finished looking at it. And it
 * silently changes the question, from "did I remember where the snail was" to
 * "was I quick enough to prove it". There is no clock in this game, so there is
 * nothing for a timeout to be fair about.
 *
 * Everything is immutable. `turn` returns a new board and never edits the one it
 * was given, which is what lets React decide what to re-render and what lets a
 * test state a board as a literal instead of building one by playing.
 */

import type { Creature } from './creatures';

/**
 * `down` is unseen, `up` is turned over and still in play, `kept` is half of a
 * pair that has been matched. There is no fourth state: a card never becomes
 * "wrong", because a card cannot be wrong.
 */
export type CardFace = 'down' | 'up' | 'kept';

/** One finished turn, in the order the two cards were turned. */
export interface TurnLog {
  readonly a: number;
  readonly b: number;
  readonly matched: boolean;
}

export interface Board {
  readonly pairs: number;
  /** One creature per card, two cards per creature. Index is the card's number. */
  readonly creatures: readonly Creature[];
  readonly faces: readonly CardFace[];
  /** Cards face up and not yet kept: none, one, or the two that just missed. */
  readonly open: readonly number[];
  /** Turns taken. One turn is two cards turned, whether or not they matched. */
  readonly turns: number;
  /** Pairs finished. */
  readonly kept: number;
  readonly log: readonly TurnLog[];
}

export type TurnEvent = 'ignored' | 'first' | 'second-match' | 'second-miss' | 'won';

export interface TurnResult {
  readonly board: Board;
  readonly event: TurnEvent;
}

/**
 * Turn one card over.
 *
 * The four cases, in the order they are decided:
 *
 * - The card is not face down (already up, already kept, or not on the board):
 *   nothing happens, and the same board object comes back so a caller that
 *   compares identity can skip a render.
 * - Nothing is face up: this card is the first of a turn.
 * - One card is face up: this is the second. Same creature keeps both; a
 *   different creature leaves both face up. Either way it is a turn, and the
 *   pair goes into the log.
 * - Two cards are face up, which means the previous turn missed. They are
 *   covered first, then this card is turned — one press, so the player never has
 *   to "clear" a miss before starting again.
 */
export function turn(board: Board, index: number): TurnResult {
  if (!Number.isInteger(index) || index < 0 || index >= board.faces.length) {
    return { board, event: 'ignored' };
  }
  if (board.faces[index] !== 'down') {
    return { board, event: 'ignored' };
  }

  if (board.open.length >= 2) {
    const faces = board.faces.slice();
    for (const open of board.open) {
      if (faces[open] === 'up') faces[open] = 'down';
    }
    faces[index] = 'up';
    return { board: { ...board, faces, open: [index] }, event: 'first' };
  }

  if (board.open.length === 0) {
    const faces = board.faces.slice();
    faces[index] = 'up';
    return { board: { ...board, faces, open: [index] }, event: 'first' };
  }

  const first = board.open[0];
  const matched = board.creatures[first] === board.creatures[index];
  const faces = board.faces.slice();
  faces[index] = 'up';
  const log: TurnLog[] = [...board.log, { a: first, b: index, matched }];
  const turns = board.turns + 1;

  if (!matched) {
    // Both stay `up`. Nothing else happens here, deliberately — see the header.
    return {
      board: { ...board, faces, open: [first, index], turns, log },
      event: 'second-miss',
    };
  }

  faces[first] = 'kept';
  faces[index] = 'kept';
  const kept = board.kept + 1;
  return {
    board: { ...board, faces, open: [], turns, kept, log },
    // `won` replaces `second-match` rather than joining it: a caller that reacts
    // to both would celebrate twice for the last pair.
    event: kept === board.pairs ? 'won' : 'second-match',
  };
}

export function isComplete(board: Board): boolean {
  return board.pairs > 0 && board.kept === board.pairs;
}
