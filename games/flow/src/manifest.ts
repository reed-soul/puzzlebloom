import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const flowManifest: GameManifest = {
  id: 'flow',
  title: 'Flow Paths',
  tagline: 'Join matching colours. Paths must not cross.',
  blurb:
    'Each colour has two ends. Draw a path from one to the other, filling the garden without crossing. Drag with a finger; lift to stop. Four little puzzles, grown as colour paths.',
  route: '/play/flow',
  skills: ['Planning', 'Spatial reasoning'],
  ageRange: '6 and up',
  typicalMinutes: '3–10 min',
  status: 'ready',
  tone: 'water',
  art: 'flow',
};
