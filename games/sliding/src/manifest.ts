import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const slidingManifest: GameManifest = {
  id: 'sliding',
  title: 'Sliding Garden',
  tagline: 'Slide the creatures until the picture sits still.',
  blurb:
    'A classic sliding puzzle with the garden’s creatures on the tiles. Tap a neighbour of the empty square and it slides in. Three-by-three or four-by-four, always a scramble you can undo, never a timer.',
  route: '/play/sliding',
  skills: ['Planning', 'Spatial reasoning'],
  ageRange: '5 and up',
  typicalMinutes: '3–8 min',
  status: 'ready',
  tone: 'grass',
  art: 'sliding',
};
