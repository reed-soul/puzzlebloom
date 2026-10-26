/**
 * The register of the garden.
 *
 * Adding a game: build the package in `games/`, export a manifest, add it to
 * `GAMES`, and add its route in `App.tsx`. Nothing on the home page needs to be
 * touched — the cards and the shelf are generated from this list.
 */

// The manifests are imported from their own entry points on purpose: pulling
// them through the package index would drag the whole game into the garden
// bundle.
import { balanceManifest } from '@puzzlebloom/game-balance/manifest';
import { bloomManifest } from '@puzzlebloom/game-bloom/manifest';
import { bloomGuessManifest } from '@puzzlebloom/game-bloom-guess/manifest';
import { connectFourManifest } from '@puzzlebloom/game-connect-four/manifest';
import { flowManifest } from '@puzzlebloom/game-flow/manifest';
import { frogRoadManifest } from '@puzzlebloom/game-frog-road/manifest';
import { jigsawManifest } from '@puzzlebloom/game-jigsaw/manifest';
import { lightsOutManifest } from '@puzzlebloom/game-lights-out/manifest';
import { mazeManifest } from '@puzzlebloom/game-maze/manifest';
import { memoryGardenManifest } from '@puzzlebloom/game-memory-garden/manifest';
import { nonogramManifest } from '@puzzlebloom/game-nonogram/manifest';
import { pegManifest } from '@puzzlebloom/game-peg/manifest';
import { reversiManifest } from '@puzzlebloom/game-reversi/manifest';
import { shadowsManifest } from '@puzzlebloom/game-shadows/manifest';
import { simonManifest } from '@puzzlebloom/game-simon/manifest';
import { slidingManifest } from '@puzzlebloom/game-sliding/manifest';
import { type GameManifest, sudokuManifest } from '@puzzlebloom/game-sudoku/manifest';
import { tangramManifest } from '@puzzlebloom/game-tangram/manifest';
import { ticTacManifest } from '@puzzlebloom/game-tic-tac/manifest';
import { wordSearchManifest } from '@puzzlebloom/game-word-search/manifest';

export type { GameManifest };

export const GAMES: GameManifest[] = [
  sudokuManifest,
  nonogramManifest,
  tangramManifest,
  memoryGardenManifest,
  balanceManifest,
  frogRoadManifest,
  bloomManifest,
  shadowsManifest,
  slidingManifest,
  mazeManifest,
  simonManifest,
  connectFourManifest,
  wordSearchManifest,
  lightsOutManifest,
  pegManifest,
  flowManifest,
  ticTacManifest,
  bloomGuessManifest,
  reversiManifest,
  jigsawManifest,
];

/**
 * Games that are announced but not playable.
 *
 * The home page renders these as dead cards on purpose: the shelf is a promise
 * about what is coming, and a link to an empty route would break that promise
 * the first time a child followed it.
 *
 * Empty for now, and the array stays rather than being deleted: the home page
 * reads it to decide whether to say "nothing else growing yet", and the next
 * game will need somewhere to sit before it is playable.
 */
export const SPROUTING: GameManifest[] = [];
