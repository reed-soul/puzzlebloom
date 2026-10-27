/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */

import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const memoryGardenManifest: GameManifest = {
  id: 'memory-garden',
  title: 'Memory Garden',
  tagline: 'Turn over two, keep the pair that matches.',
  blurb:
    'The garden’s own creatures, two of each, face down in a grid. Turn two cards at a time; a matching pair is kept, and a pair that misses stays face up until you turn the next card, so nothing disappears before you have finished looking at it. Six, eight or nine pairs, and a short account of the round at the end.',
  route: '/play/memory-garden',
  skills: ['Memory', 'Attention'],
  ageRange: '4–6',
  difficulty: 'easy',
  typicalMinutes: '2–6 min',
  status: 'ready',
  tone: 'sun',
  art: 'pairs',
};
