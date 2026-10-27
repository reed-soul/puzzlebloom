/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */
import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const shadowsManifest: GameManifest = {
  id: 'shadows',
  title: 'Stone Shadows',
  tagline: 'Three shadows, one plot of stones.',
  blurb:
    'A plot of four by four, and three lanterns that throw its shadow onto three walls. The shadows are shown; the stones are not. Stack them until every wall agrees — and notice that the front cannot tell how deep a stone sits, while the side cannot tell which file it is in.',
  route: '/play/shadows',
  skills: ['Spatial reasoning', 'Projection', 'Planning'],
  ageRange: '7–10',
  difficulty: 'hard',
  typicalMinutes: '5–12 min',
  status: 'ready',
  tone: 'clay',
  art: 'shadows',
};
