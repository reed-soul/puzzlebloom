/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */

import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const nonogramManifest: GameManifest = {
  id: 'nonogram',
  title: 'Nonogram',
  tagline: 'Count the squares, uncover the picture.',
  blurb:
    'Numbers beside every row and column say how many squares to fill, and how they group. Fill them and a drawing appears — two sizes, crosses for the squares you have ruled out, and hints that explain the counting rather than doing it.',
  route: '/play/nonogram',
  skills: ['Counting', 'Spatial reasoning'],
  ageRange: '7 and up',
  typicalMinutes: '5–15 min',
  status: 'ready',
  tone: 'water',
  art: 'squares',
};
