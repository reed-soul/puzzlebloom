/**
 * Tri-marks — tic-tac-toe with a soft minimax neighbour.
 *
 * Provenance: classic 3×3 rules. Win lines, open-space enumeration and the
 * minimax search follow awkaiser/react-tictactoe (MIT). Softness is ours:
 * one time in three the neighbour picks a random legal mark so a child can
 * win, instead of the undefeatable original.
 */

export type Mark = 0 | 1 | 2;

export interface TicState {
  readonly board: readonly Mark[];
  readonly turn: 1 | 2;
  readonly winner: 0 | 1 | 2 | 'draw';
}

const LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createTic(): TicState {
  return { board: Array<Mark>(9).fill(0), turn: 1, winner: 0 };
}

export function openSpaces(state: TicState): number[] {
  return state.board.map((m, i) => (m === 0 ? i : -1)).filter((i) => i >= 0);
}

export function winnerOf(board: readonly Mark[]): 0 | 1 | 2 | 'draw' {
  for (const [a, b, c] of LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) return board[a] as 1 | 2;
  }
  return board.every((m) => m !== 0) ? 'draw' : 0;
}

export function play(state: TicState, index: number): TicState {
  if (state.winner !== 0 || index < 0 || index > 8 || state.board[index] !== 0) return state;
  const board = state.board.slice() as Mark[];
  board[index] = state.turn;
  return { board, turn: state.turn === 1 ? 2 : 1, winner: winnerOf(board) };
}

function score(winner: TicState['winner'], depth: number, me: 1 | 2): number {
  if (winner === 0) return 0;
  if (winner === 'draw') return 0;
  return winner === me ? 10 - depth : depth - 10;
}

function minimax(state: TicState, me: 1 | 2, depth: number): { move: number; score: number } {
  if (state.winner !== 0) return { move: -1, score: score(state.winner, depth, me) };
  const spaces = openSpaces(state);
  let bestMove = spaces[0] ?? -1;
  let bestScore = state.turn === me ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  for (const move of spaces) {
    const child = minimax(play(state, move), me, depth + 1);
    if (state.turn === me) {
      if (child.score > bestScore) {
        bestScore = child.score;
        bestMove = move;
      }
    } else if (child.score < bestScore) {
      bestScore = child.score;
      bestMove = move;
    }
  }
  return { move: bestMove, score: bestScore };
}

/**
 * A neighbour who usually plays the minimax move, and sometimes a random
 * legal mark so the garden stays kind.
 */
export function softMove(state: TicState, rand: () => number = Math.random): number {
  const spaces = openSpaces(state);
  if (spaces.length === 0) return -1;
  const win = spaces.find((i) => play(state, i).winner === state.turn);
  if (win !== undefined) return win;
  const you: 1 | 2 = state.turn === 1 ? 2 : 1;
  const block = spaces.find((i) => {
    const flipped: TicState = { ...state, turn: you };
    return play(flipped, i).winner === you;
  });
  if (block !== undefined && rand() > 0.15) return block;
  if (rand() < 0.33) return spaces[Math.floor(rand() * spaces.length)];
  return minimax(state, state.turn, 0).move;
}
