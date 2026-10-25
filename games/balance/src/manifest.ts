/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */
import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const balanceManifest: GameManifest = {
  id: 'balance',
  title: 'Number Balance',
  tagline: 'Make both sides hold the same.',
  blurb:
    'A two-pan balance with no friction in its pivot, so it never sits level when the sides are unequal. Read the numeral, count the frogs onto the other pan, and find out that six can be two and four — that the equals sign means "the same on both sides", not "the answer comes after this".',
  route: '/play/balance',
  skills: ['Counting', 'Equality', 'Number bonds'],
  ageRange: '4 and up',
  typicalMinutes: '3–8 min',
  status: 'ready',
  tone: 'water',
  art: 'balance',
};
