import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const ticTacManifest: GameManifest = {
  id: 'tic-tac',
  title: 'Tri-marks',
  tagline: 'Three creatures in a line, against a kind neighbour.',
  blurb:
    'Tic-tac-toe with the garden’s creatures. You are the sun creature; a neighbour plays the sky one. They play well, but not perfectly, so a careful three-in-a-line still wins.',
  route: '/play/tic-tac',
  skills: ['Logic', 'Turns'],
  ageRange: '4 and up',
  typicalMinutes: '1–4 min',
  status: 'ready',
  tone: 'clay',
  art: 'marks',
};
