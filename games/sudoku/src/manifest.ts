/**
 * How the garden describes a game to the rest of the site.
 *
 * Every game in `games/` exports one of these. The home page, the sitemap and
 * the "what's growing next" list are all generated from this shape, so adding
 * a game is a package plus one object — no page to hand-wire.
 */

export type GameStatus = 'ready' | 'sprouting';

export interface GameManifest {
  /** Stable id. Doubles as the route segment and the local-storage namespace. */
  id: string;
  title: string;
  /** One line for the card. Verb-led, no exclamation marks. */
  tagline: string;
  /** Two or three sentences for the game's own header and the parents page. */
  blurb: string;
  route: string;
  /** What a grown-up would call the skill being practised. */
  skills: string[];
  ageRange: string;
  typicalMinutes: string;
  status: GameStatus;
  /** Accent hue used by the card's artwork block. */
  tone: 'grass' | 'sun' | 'water' | 'clay';
  /**
   * What the card draws above the title. Optional, and the home page falls back
   * to the plain dot grid, so a game in the growing list needs no artwork of its
   * own — and the home page never has to import a game package to find out.
   */
  art?: 'creatures' | 'squares' | 'tangram' | 'pairs';
}

export const sudokuManifest: GameManifest = {
  id: 'sudoku',
  title: 'Sudoku',
  tagline: 'Nine little creatures, one place each.',
  blurb:
    'A classic 9×9 grid with two ways to read it: numerals, or nine hand-drawn creatures for players still learning their digits. Hints explain the logic in a sentence instead of filling the cell for you.',
  route: '/play/sudoku',
  skills: ['Logic', 'Patience', 'Working memory'],
  ageRange: '6 and up',
  typicalMinutes: '8–20 min',
  status: 'ready',
  tone: 'grass',
  art: 'creatures',
};
