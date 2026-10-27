/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */

import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const tangramManifest: GameManifest = {
  id: 'tangram',
  title: 'Tangram',
  tagline: 'Seven shapes, one silhouette, no timer.',
  blurb:
    'The classic seven pieces, dragged into the outline of a box, a sail, a bird. The game never compares your answer to anyone else’s — it asks whether the pieces cover the shape exactly once, so any arrangement that works is the right answer.',
  route: '/play/tangram',
  skills: ['Geometry', 'Spatial reasoning'],
  ageRange: '6–9',
  difficulty: 'medium',
  typicalMinutes: '6–20 min',
  status: 'ready',
  tone: 'clay',
  art: 'tangram',
};
