import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const simonManifest: GameManifest = {
  id: 'simon',
  title: 'Echo Bloom',
  tagline: 'Watch the petals, then tap them back.',
  blurb:
    'Four blooms light in a growing order. Watch, then tap the same sequence. A miss simply replays the same bloom — there is no lost streak, and you can hush the chimes if you like.',
  route: '/play/simon',
  skills: ['Memory', 'Sequence'],
  ageRange: '4 and up',
  typicalMinutes: '2–5 min',
  status: 'ready',
  tone: 'sun',
  art: 'echo',
};
