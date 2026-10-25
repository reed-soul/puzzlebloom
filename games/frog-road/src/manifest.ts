/**
 * How this game describes itself to the garden.
 *
 * The contract lives in the sudoku package because sudoku needed it first, so
 * this file borrows it as a *type*. `import type` is erased before any bundler
 * runs, which means the dev-dependency below is the whole of the relationship
 * and no sudoku code can reach this chunk.
 */
import type { GameManifest } from '@puzzlebloom/game-sudoku/manifest';

export const frogRoadManifest: GameManifest = {
  id: 'frog-road',
  title: 'Frog Road',
  tagline: 'Some get on, some get off.',
  blurb:
    'A little car drives a road of plus and minus squares. One die says how far it goes; a different die says how many frogs are involved. Land on plus and they climb aboard; land on minus and they hop out. Eight turns, and the running total is the whole game — the same arithmetic as a bus stop, held in the head across turns.',
  route: '/play/frog-road',
  skills: ['Additive change', 'Running totals', 'Counting on'],
  ageRange: '5 and up',
  typicalMinutes: '4–8 min',
  status: 'ready',
  tone: 'grass',
  art: 'road',
};
