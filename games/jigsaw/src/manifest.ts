import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const jigsawManifest: GameManifest = {
  id: 'jigsaw',
  title: 'Piece Garden',
  tagline: 'Tap two pieces to swap them into a picture.',
  blurb:
    'A little garden drawing, cut into four, nine or sixteen pieces and shuffled. Tap one piece, then another, and they swap. When every piece sits where it was painted, the picture is whole.',
  route: '/play/jigsaw',
  skills: ['Observation', 'Spatial reasoning'],
  ageRange: '4–6',
  difficulty: 'easy',
  typicalMinutes: '2–8 min',
  status: 'ready',
  tone: 'grass',
  art: 'pieces',
};
