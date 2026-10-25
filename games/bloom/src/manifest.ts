/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */
import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const bloomManifest: GameManifest = {
  id: 'bloom',
  title: 'Bloom Drop',
  tagline: 'Drop them, meet them, grow them.',
  blurb:
    'Seeds fall into a jar. Two of a kind that touch become one of the next kind, all the way from seed to moonflower. No timer, no losing until the jar is truly full — just the next drop, and the garden it grows into.',
  route: '/play/bloom',
  skills: ['Aiming', 'Planning ahead', 'Patience'],
  ageRange: '4 and up',
  typicalMinutes: '5–15 min',
  status: 'ready',
  tone: 'sun',
  art: 'blooms',
};
