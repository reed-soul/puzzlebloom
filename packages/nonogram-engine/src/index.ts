/**
 * Public surface of the Nonogram engine.
 *
 * The game imports from here and nowhere else, so the shapes below are the
 * contract: a picture, its clues, a mark, a deduction, a hint, a save. The
 * modules behind it are deliberately small and single-purpose, and this barrel
 * is where the story of how they fit together is told once.
 */

export {
  BLANK,
  blankMarks,
  CROSS,
  colOf,
  FILL,
  filledCount,
  indexOf,
  isMark,
  lineMarks,
  lineSettled,
  type Mark,
  pictureComplete,
  rowOf,
} from './board';
export { type Clue, clueLength, clueRuns, clueSpan, clueText, EMPTY_CLUE, lineToClue } from './clues';
export { createRandom, dailyPuzzle, localDateKey, seedFrom } from './daily';
export { type Hint, type HintKind, nextHint } from './hints';
export { type LineCell, type LineDeduction, solveLine, solveLineByExhaustion } from './lineSolve';
export {
  PICTURES,
  type Picture,
  pictureById,
  picturesOfSize,
  pictureWidth,
  SIZES,
  type Size,
  solutionOf,
} from './pictures';
export {
  clearProgress,
  decodeProgress,
  encodeProgress,
  PROGRESS_KEY,
  readProgress,
  type SavedProgress,
  type StorageLike,
  writeProgress,
} from './progress';
export {
  type Puzzle,
  puzzleByPictureId,
  puzzleForSize,
  puzzleFromPicture,
  puzzlesOfSize,
} from './puzzle';
export { isLogicallySolvable, type SolveResult, type SolveStep, solveByLogic } from './solve';
