/**
 * Lily Pads — Reversi / Othello on an 8×8 pond.
 *
 * Provenance: classic Reversi. felipeap92/othello-game (MIT) is the overnight
 * reference; we lift the flip-along-rays rule and drop the multiplayer server.
 * The CPU is a greedy max-flips neighbour with a little softness.
 */

export type Stone = 0 | 1 | 2;

export interface ReversiState {
  readonly board: readonly Stone[];
  readonly turn: 1 | 2;
  readonly winner: 0 | 1 | 2 | 'draw';
}

export const SIZE = 8;
const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export function createReversi(): ReversiState {
  const board = Array<Stone>(SIZE * SIZE).fill(0);
  board[27] = 2;
  board[28] = 1;
  board[35] = 1;
  board[36] = 2;
  return { board, turn: 1, winner: 0 };
}

function at(r: number, c: number): number {
  return r * SIZE + c;
}

function on(r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < SIZE && c < SIZE;
}

function flipsFor(board: readonly Stone[], index: number, player: 1 | 2): number[] {
  if (board[index] !== 0) return [];
  const other: 1 | 2 = player === 1 ? 2 : 1;
  const r0 = Math.floor(index / SIZE);
  const c0 = index % SIZE;
  const captured: number[] = [];
  for (const [dr, dc] of DIRS) {
    const ray: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (on(r, c) && board[at(r, c)] === other) {
      ray.push(at(r, c));
      r += dr;
      c += dc;
    }
    if (ray.length > 0 && on(r, c) && board[at(r, c)] === player) captured.push(...ray);
  }
  return captured;
}

export function legalMoves(state: ReversiState, player: 1 | 2 = state.turn): number[] {
  return state.board.map((_, i) => i).filter((i) => flipsFor(state.board, i, player).length > 0);
}

export function place(state: ReversiState, index: number): ReversiState {
  if (state.winner !== 0) return state;
  const captured = flipsFor(state.board, index, state.turn);
  if (captured.length === 0) return state;
  const board = state.board.slice() as Stone[];
  board[index] = state.turn;
  for (const i of captured) board[i] = state.turn;
  const nextTurn: 1 | 2 = state.turn === 1 ? 2 : 1;
  const nextHas = legalMoves({ board, turn: nextTurn, winner: 0 }, nextTurn).length > 0;
  const curHas = legalMoves({ board, turn: state.turn, winner: 0 }, state.turn).length > 0;
  if (!nextHas && !curHas) {
    const ones = board.filter((s) => s === 1).length;
    const twos = board.filter((s) => s === 2).length;
    const winner = ones === twos ? 'draw' : ones > twos ? 1 : 2;
    return { board, turn: nextTurn, winner };
  }
  return { board, turn: nextHas ? nextTurn : state.turn, winner: 0 };
}

export function counts(state: ReversiState): { sun: number; moon: number } {
  return {
    sun: state.board.filter((s) => s === 1).length,
    moon: state.board.filter((s) => s === 2).length,
  };
}

/** Greedy max-flips, with one-in-four random legal pads. */
export function softMove(state: ReversiState, rand: () => number = Math.random): number {
  const moves = legalMoves(state);
  if (moves.length === 0) return -1;
  if (rand() < 0.25) return moves[Math.floor(rand() * moves.length)];
  let best = moves[0];
  let bestN = -1;
  for (const m of moves) {
    const n = flipsFor(state.board, m, state.turn).length;
    if (n > bestN) {
      bestN = n;
      best = m;
    }
  }
  return best;
}
