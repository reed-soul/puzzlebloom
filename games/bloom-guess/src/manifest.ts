import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const bloomGuessManifest: GameManifest = {
  id: 'bloom-guess',
  title: 'Bloom Guess',
  tagline: 'Guess the garden word. Petals, never a gallows.',
  blurb:
    'A nature word, hidden letter by letter. Tap a letter; a hit fills the word, a miss sheds a petal. Six petals, a kind dictionary, and nothing here is hung or shamed.',
  route: '/play/bloom-guess',
  skills: ['Letters', 'Vocabulary'],
  ageRange: '6–9',
  difficulty: 'medium',
  typicalMinutes: '2–6 min',
  status: 'ready',
  tone: 'sun',
  art: 'guess',
};
