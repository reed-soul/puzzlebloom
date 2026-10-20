/**
 * Public surface of the Sudoku engine.
 *
 * The internals are plain JavaScript ported from HeyPuter/everything (MIT, see
 * THIRD_PARTY_NOTICES.md). This barrel is the only file the apps import from,
 * and it is where the TypeScript contracts live: the engine's shapes are
 * asserted once here instead of being re-guessed in every component.
 */

export {
  DIFFICULTIES,
  DIFFICULTY_IDS,
  generate,
  generateDaily,
  isDifficulty,
  localDateKey,
} from './engine/generator.js';
export {
  ALL_DIGITS,
  BOX_UNITS,
  boxOf,
  CELLS,
  COL_UNITS,
  cellName,
  cloneBoard,
  colOf,
  countBits,
  digitOf,
  digitsOf,
  findConflicts,
  hasDigit,
  indexOf,
  isComplete,
  maskOf,
  PEERS,
  ROW_UNITS,
  rowOf,
  SIZE,
  UNITS,
} from './engine/grid.js';

export { countSolutions, hasUniqueSolution, solve } from './engine/solver.js';
export {
  applyStep,
  createAnalysis,
  gradePuzzle,
  LADDER_IDS,
  nextStep,
  TECHNIQUES,
} from './engine/techniques.js';
export { analysisFor, nextHint } from './game/hints.js';
export { disposeWorker, requestPuzzle } from './game/puzzles.js';
export { decode, encode, fromText, SAVE_VERSION, toText } from './game/serialize.js';
export {
  applyEliminations,
  canRedo,
  canUndo,
  clearCell,
  conflicts,
  createGame,
  isFlawless,
  isGiven,
  isSolved,
  MAX_HISTORY,
  mistakes,
  recordMistake,
  redo,
  remaining,
  setValue,
  toggleNote,
  undo,
} from './game/state.js';
export { createTimer, formatDuration } from './game/timer.js';

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
