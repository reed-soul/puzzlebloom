import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const lightsOutManifest: GameManifest = {
  id: 'lights-out',
  title: 'Firefly Lights',
  tagline: 'Tap a firefly; its neighbours glow with it.',
  blurb:
    'A bed of fireflies. Tap one and it and its four neighbours swap light for dark. The aim is a quiet garden — every fly dark. Every puzzle can be put out; there is no trick deal.',
  route: '/play/lights-out',
  skills: ['Logic', 'Patterns'],
  ageRange: '6 and up',
  typicalMinutes: '3–10 min',
  status: 'ready',
  tone: 'sun',
  art: 'fireflies',
};
