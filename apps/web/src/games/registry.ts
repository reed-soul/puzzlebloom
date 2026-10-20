/**
 * The register of the garden.
 *
 * Adding a game: build the package in `games/`, export a manifest, add it to
 * `GAMES`, and add its route in `App.tsx`. Nothing on the home page needs to be
 * touched — the cards and the shelf are generated from this list.
 */

// The manifest is imported from its own entry point on purpose: pulling it
// through the package index would drag the whole game into the garden bundle.
import { type GameManifest, sudokuManifest } from '@puzzlebloom/game-sudoku/manifest';

export type { GameManifest };

export const GAMES: GameManifest[] = [sudokuManifest];

export const SPROUTING: GameManifest[] = [
  {
    id: 'nonogram',
    title: 'Nonogram',
    tagline: 'Count the squares, uncover the picture.',
    blurb:
      'Rows and columns of numbers that add up to a hidden drawing. The reward for correct logic is a picture appearing.',
    route: '/play/nonogram',
    skills: ['Counting', 'Spatial reasoning'],
    ageRange: '7 and up',
    typicalMinutes: '5–15 min',
    status: 'sprouting',
    tone: 'water',
  },
  {
    id: 'memory-garden',
    title: 'Memory Garden',
    tagline: 'Turn over two, keep the pair that matches.',
    blurb:
      'A memory game where the cards are the garden’s own creatures, in four sizes so the difficulty grows with the player.',
    route: '/play/memory-garden',
    skills: ['Memory', 'Attention'],
    ageRange: '4 and up',
    typicalMinutes: '3–8 min',
    status: 'sprouting',
    tone: 'sun',
  },
  {
    id: 'tangram',
    title: 'Tangram',
    tagline: 'Seven shapes, a hundred animals.',
    blurb:
      'Drag the classic seven pieces into the silhouette of a cat, a boat, a bird. No timer, no score, just the shape.',
    route: '/play/tangram',
    skills: ['Geometry', 'Visualisation'],
    ageRange: '6 and up',
    typicalMinutes: '6–20 min',
    status: 'sprouting',
    tone: 'clay',
  },
];
