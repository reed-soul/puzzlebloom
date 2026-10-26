import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const pegManifest: GameManifest = {
  id: 'peg',
  title: 'Peg Pond',
  tagline: 'Hop a seed over a seed, onto an empty pad.',
  blurb:
    'The English board, grown as lily pads. Hop a seed over its neighbour onto an empty pad; the hopped seed leaves the pond. Undo is always allowed. One seed left is a solved pond.',
  route: '/play/peg',
  skills: ['Planning', 'Looking ahead'],
  ageRange: '7 and up',
  typicalMinutes: '5–15 min',
  status: 'ready',
  tone: 'water',
  art: 'pegs',
};
