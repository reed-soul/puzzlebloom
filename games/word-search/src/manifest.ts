import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const wordSearchManifest: GameManifest = {
  id: 'word-search',
  title: 'Word Meadow',
  tagline: 'Find the garden words hiding in the grass.',
  blurb:
    'A small grid of letters, and a list of gentle nature words. Tap the first letter, then the last. Across, down or diagonal — when the word is in the list, it stays lit.',
  route: '/play/word-search',
  skills: ['Reading', 'Scanning'],
  ageRange: '6–9',
  difficulty: 'medium',
  typicalMinutes: '4–10 min',
  status: 'ready',
  tone: 'grass',
  art: 'words',
};
