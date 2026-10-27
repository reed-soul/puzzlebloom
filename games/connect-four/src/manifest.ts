import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const connectFourManifest: GameManifest = {
  id: 'connect-four',
  title: 'Four Flowers',
  tagline: 'Drop a flower. Four in a line wins.',
  blurb:
    'A quiet Connect Four against a neighbour who is trying, but not trying too hard. Sun flowers are yours; sky flowers are theirs. Four in a row — across, down or diagonal — and the bed is yours.',
  route: '/play/connect-four',
  skills: ['Planning', 'Patterns'],
  ageRange: '5–8',
  difficulty: 'medium',
  typicalMinutes: '4–10 min',
  status: 'ready',
  tone: 'sun',
  art: 'flowers',
};
