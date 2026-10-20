/**
 * Public surface of the Sudoku engine.
 *
 * The internals are plain JavaScript ported from HeyPuter/everything (MIT, see
 * THIRD_PARTY_NOTICES.md). This barrel is the only file the apps import from,
 * and it is where the TypeScript contracts live: the engine's shapes are
 * asserted once here instead of being re-guessed in every component.
 */

export {
  SIZE,
  CELLS,
  ALL_DIGITS,
  PEERS,
  UNITS,
  ROW_UNITS,
  COL_UNITS,
  BOX_UNITS,
  rowOf,
  colOf,
  boxOf,
  indexOf,
  maskOf,
  hasDigit,
  countBits,
  digitOf,
  digitsOf,
  cellName,
  cloneBoard,
  findConflicts,
  isComplete,
} from './engine/grid.js';

export {
  TECHNIQUES,
  LADDER_IDS,
  createAnalysis,
  applyStep,
  nextStep,
  gradePuzzle,
} from './engine/techniques.js';

export { solve, countSolutions, hasUniqueSolution } from './engine/solver.js';

export {
  DIFFICULTIES,
  DIFFICULTY_IDS,
  isDifficulty,
  generate,
  generateDaily,
  localDateKey,
} from './engine/generator.js';

export { requestPuzzle, disposeWorker } from './game/puzzles.js';

export {
  MAX_HISTORY,
  createGame,
  isGiven,
  isSolved,
  conflicts,
  mistakes,
  remaining,
  setValue,
  toggleNote,
  clearCell,
  applyEliminations,
  undo,
  redo,
  canUndo,
  canRedo,
  recordMistake,
  isFlawless,
} from './game/state.js';

export { analysisFor, nextHint } from './game/hints.js';

export { createTimer, formatDuration } from './game/timer.js';

export { SAVE_VERSION, encode, decode, toText, fromText } from './game/serialize.js';

/* ------------------------------------------------------------------ */
/* Contracts                                                            */
/* ------------------------------------------------------------------ */

export type DifficultyId = 'easy' | 'medium' | 'hard' | 'expert';

/** A flat 81-cell board, reading order, 0 for empty. */
export type Board = Uint8Array;

export interface Grade {
  solved: boolean;
  tier: number;
  score: number;
  hardest: string | null;
  counts: Record<string, number>;
}

export interface CellDigit {
  cell: number;
  digit: number;
}

/** One logical deduction, as produced by the technique ladder. */
export interface HintStep {
  technique: string;
  label: string;
  tier: number;
  placements: CellDigit[];
  eliminations: CellDigit[];
  focus: number[];
  target: number | null;
  digit: number | null;
  /** A sentence a nine-year-old can follow. Written by the engine, not the UI. */
  explain: string;
}

export interface HintResult {
  kind: 'step' | 'mistake' | 'stuck' | 'solved';
  message: string;
  focus?: number[];
  cells?: number[];
  step?: HintStep;
}

export interface LoadedPuzzle {
  puzzle: Board;
  solution: Board;
  difficulty: DifficultyId;
  givens: number;
  seed: number | string;
  onTarget: boolean;
  grade: Grade;
  daily: string | null;
}

/**
 * The mutable game a player is working on. Mutated in place by the engine; the
 * React layer treats it as an immutable snapshot and re-renders on every
 * command, which is what keeps undo total without cloning history.
 */
export interface SudokuGame {
  puzzle: Board;
  solution: Board;
  values: Board;
  /** Pencil marks as 9-bit masks, one per cell. */
  notes: Uint16Array;
  /** Digits ruled out by hints, one mask per cell. Not part of undo. */
  eliminated: Uint16Array;
  difficulty: DifficultyId;
  seed: number | string | null;
  daily: string | null;
  history: unknown[];
  future: unknown[];
  hintsUsed: number;
  mistakesMade: number;
  elapsedMs: number;
  startedAt: number | null;
  solvedAt: number | null;
}

export interface Timer {
  elapsedMs: number;
  running: boolean;
  start(): void;
  pause(): void;
  reset(ms?: number): void;
  snapshot(): number;
}

export interface PuzzleRequest {
  difficulty: DifficultyId;
  seed?: number | string;
  daily?: string | null;
  timeoutMs?: number;
}
