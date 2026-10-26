/**
 * Four Flowers — Connect Four with gravity and a soft CPU.
 *
 * Provenance: classic rules (7×6, four in a line, gravity). Win scanning
 * and "drop into the lowest free cell" follow the same shape as
 * jotaen/connect4-ai (MIT). The CPU here is deliberately soft: it takes a
 * win, blocks a win, then prefers the middle, and otherwise picks among
 * legal columns. It is not the full minimax of that project on purpose —
 * a child should be able to beat it.
 */

export type Player = 1 | 2;
export type Cell = 0 | Player;

export const COLS = 7;
export const ROWS = 6;

export interface FourState {
  /** Column-major: board[col][row], row 0 is the ground. */
  readonly board: readonly (readonly Cell[])[];
  readonly turn: Player;
  readonly winner: Player | 'draw' | null;
}

export function createFour(): FourState {
  return {
    board: Array.from({ length: COLS }, () => Array<Cell>(ROWS).fill(0)),
    turn: 1,
    winner: null,
  };
}

export function freeRow(state: FourState, col: number): number {
  if (col < 0 || col >= COLS) return -1;
  return state.board[col].indexOf(0);
}

export function drop(state: FourState, col: number): FourState {
  if (state.winner) return state;
  const row = freeRow(state, col);
  if (row < 0) return state;
  const board = state.board.map((column, c) =>
    c === col ? column.map((cell, r) => (r === row ? state.turn : cell)) : column.slice(),
  );
  const winner = findWinner(board, col, row, state.turn) ?? (isFull(board) ? 'draw' : null);
  return { board, turn: state.turn === 1 ? 2 : 1, winner };
}

function isFull(board: FourState['board']): boolean {
  return board.every((column) => column.every((cell) => cell !== 0));
}

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

function findWinner(board: FourState['board'], col: number, row: number, player: Player): Player | null {
  for (const [dc, dr] of DIRS) {
    let count = 1;
    for (const sign of [1, -1]) {
      for (let step = 1; step < 4; step++) {
        const c = col + dc * sign * step;
        const r = row + dr * sign * step;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS || board[c][r] !== player) break;
        count += 1;
      }
    }
    if (count >= 4) return player;
  }
  return null;
}

function legalColumns(state: FourState): number[] {
  return Array.from({ length: COLS }, (_, c) => c).filter((c) => freeRow(state, c) >= 0);
}

function wouldWin(state: FourState, col: number, player: Player): boolean {
  const probe: FourState = { ...state, turn: player, winner: null };
  return drop(probe, col).winner === player;
}

/**
 * A neighbour who takes an open win, blocks yours, then leans toward the
 * middle. `rand` is the only source of softness: one time in four it skips
 * the clever column and drops somewhere legal instead.
 */
export function softMove(state: FourState, rand: () => number = Math.random): number {
  const options = legalColumns(state);
  if (options.length === 0) return 0;
  const me = state.turn;
  const you: Player = me === 1 ? 2 : 1;
  const win = options.find((c) => wouldWin(state, c, me));
  if (win !== undefined) return win;
  const block = options.find((c) => wouldWin(state, c, you));
  if (block !== undefined) return block;
  if (rand() < 0.25) return options[Math.floor(rand() * options.length)];
  const ranked = [...options].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
  return ranked[0];
}
