/**
 * The ± passenger board, as rules rather than as cloth.
 *
 * The physical game: a winding road of squares, two dice. Die A says how far
 * the car moves; die B says how many frogs are involved. Land on a + square and
 * that many frogs board; land on a − square and that many get off. Most frogs
 * at the end wins.
 *
 * Two things are changed from the toy, both because the research said so:
 *
 * 1. The two dice are decorrelated on purpose and stay decorrelated. Movement
 *    is decided by die A, the operation's operand by die B, so the child cannot
 *    shortcut "count the pips" into doing the arithmetic — they must hold two
 *    numbers separately and apply the sign of the square to the second one.
 *    Most roll-and-move maths games fail exactly here: the number you move is
 *    the number you compute, so the arithmetic never has to be represented.
 *
 * 2. The session is a fixed number of turns, not a race. "Most frogs wins"
 *    hands the game to whoever rolls better, and the child who loses never got
 *    to compute anything. Here every child gets all eight turns; the running
 *    total is a *state that persists* and changes by ±, which is the skill —
 *    the same structure as the bus problem in a first-grade textbook: some get
 *    on, some get off, how many are riding now.
 */

export type Sign = '+' | '-';

export interface Square {
  /** 1-based position on the road. */
  index: number;
  sign: Sign;
}

/** One turn's record, kept so the recap can show the arithmetic as sentences. */
export interface TurnLog {
  turn: number;
  steps: number;
  frogs: number;
  from: number;
  to: number;
  sign: Sign;
  /** Passengers before the operation landed. */
  before: number;
  /** Passengers after. Never below zero: frogs that are not aboard cannot leave. */
  after: number;
}

export interface BoardState {
  squares: Square[];
  /** Car position, 1-based index into squares. */
  position: number;
  frogsAboard: number;
  turn: number;
  totalTurns: number;
  log: TurnLog[];
  finished: boolean;
}

export const TOTAL_SQUARES = 24;
export const TOTAL_TURNS = 8;

/**
 * Builds a road where the signs alternate in runs of one to three squares, so
 * counting "how many + in a row" is never a shortcut for reading the square you
 * landed on. Seedable, so a board is reproducible.
 */
export function buildBoard(seed: number, length = TOTAL_SQUARES): Square[] {
  const rand = mulberry32(seed);
  const squares: Square[] = [];
  let sign: Sign = '+';
  let run = 1 + Math.floor(rand() * 3);
  for (let i = 1; i <= length; i++) {
    squares.push({ index: i, sign });
    run -= 1;
    if (run === 0) {
      sign = sign === '+' ? '-' : '+';
      run = 1 + Math.floor(rand() * 3);
    }
  }
  return squares;
}

export function createBoard(seed: number, totalTurns = TOTAL_TURNS): BoardState {
  return {
    squares: buildBoard(seed),
    position: 1,
    frogsAboard: 0,
    turn: 1,
    totalTurns,
    log: [],
    finished: false,
  };
}

/**
 * Plays one full turn: move `steps` squares (wrapping around the road, because
 * a dead end would end the counting early), then apply the landing square's
 * sign to `frogs`.
 *
 * The subtraction floors at zero and says so in the log — a child who is asked
 * to take three frogs off a car holding one learns more from seeing the clamp
 * than from a wrong negative total.
 */
export function playTurn(state: BoardState, steps: number, frogs: number): BoardState {
  if (state.finished) return state;
  const safeSteps = Math.max(1, Math.min(steps, 12));
  const safeFrogs = Math.max(1, Math.min(frogs, 5));
  const from = state.position;
  const to = ((from - 1 + safeSteps) % state.squares.length) + 1;
  const square = state.squares[to - 1];
  const before = state.frogsAboard;
  const after = square.sign === '+' ? before + safeFrogs : Math.max(0, before - safeFrogs);

  const entry: TurnLog = {
    turn: state.turn,
    steps: safeSteps,
    frogs: safeFrogs,
    from,
    to,
    sign: square.sign,
    before,
    after,
  };

  const turn = state.turn + 1;
  return {
    ...state,
    position: to,
    frogsAboard: after,
    turn,
    log: [...state.log, entry],
    finished: turn > state.totalTurns,
  };
}

/**
 * Two dice, decorrelated by construction. Die A (1–6) moves the car; die B
 * (1–3 at first, 1–5 later — see levels) is the operand the square's sign
 * applies to. Neither is a function of the other.
 */
export function rollDice(rand: () => number = Math.random): { steps: number; frogs: number } {
  return {
    steps: 1 + Math.floor(rand() * 6),
    frogs: 1 + Math.floor(rand() * 3),
  };
}

/** The sentence the recap reads for one turn. */
export function turnSentence(entry: TurnLog): string {
  if (entry.sign === '+') {
    return `Turn ${entry.turn}: move ${entry.steps}, ${entry.frogs} frog${entry.frogs === 1 ? '' : 's'} on — ${entry.before} + ${entry.frogs} = ${entry.after}.`;
  }
  const took = entry.before - entry.after;
  if (took < entry.frogs) {
    return `Turn ${entry.turn}: move ${entry.steps}, ${entry.frogs} off but only ${entry.before} aboard — ${entry.before} − ${took} = ${entry.after}.`;
  }
  return `Turn ${entry.turn}: move ${entry.steps}, ${entry.frogs} frog${entry.frogs === 1 ? '' : 's'} off — ${entry.before} − ${entry.frogs} = ${entry.after}.`;
}

/** Deterministic PRNG shared with the balance engine's philosophy: a seed is a board. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
