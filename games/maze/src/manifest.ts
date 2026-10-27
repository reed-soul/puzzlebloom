import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const mazeManifest: GameManifest = {
  id: 'maze',
  title: 'Maze Path',
  tagline: 'Find the gate. The hedges never chase you.',
  blurb:
    'A little garden of hedges, grown fresh each time. Walk from the open corner to the glowing gate. A hint names the next step if you ask; nothing here is trying to catch you.',
  route: '/play/maze',
  skills: ['Exploration', 'Direction'],
  ageRange: '4–6',
  difficulty: 'easy',
  typicalMinutes: '2–6 min',
  status: 'ready',
  tone: 'grass',
  art: 'maze',
};
