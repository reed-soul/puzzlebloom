import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const reversiManifest: GameManifest = {
  id: 'reversi',
  title: 'Lily Pads',
  tagline: 'Flip a line of pads to your colour.',
  blurb:
    'Reversi on a pond of lily pads. Place a sun stone so it traps sky stones in a straight line; they flip. A neighbour plays the sky stones and is a little greedy, never mean.',
  route: '/play/reversi',
  skills: ['Looking ahead', 'Counting'],
  ageRange: '7 and up',
  typicalMinutes: '5–12 min',
  status: 'ready',
  tone: 'water',
  art: 'lilies',
};
