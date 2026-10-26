import { expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * The twelve new garden doors, smoked rather than solved.
 *
 * Each engine has its own unit tests. What only the browser can prove is that
 * the route unpacks a real `.pb-play` board, that the heading a crawler needs
 * is present, and that opening the door logs nothing.
 */

const NEW_GAMES = [
  { path: '/play/sliding/', heading: 'Sliding Garden for kids', board: 'Sliding puzzle, 3 by 3' },
  { path: '/play/maze/', heading: 'Maze Path for kids', board: 'Garden maze, 8 by 8' },
  { path: '/play/simon/', heading: 'Echo Bloom for kids', board: 'Four blooms' },
  { path: '/play/connect-four/', heading: 'Four Flowers for kids', board: 'Four flowers bed, seven columns' },
  { path: '/play/word-search/', heading: 'Word Meadow for kids', board: 'Letter meadow, 8 by 8' },
  { path: '/play/lights-out/', heading: 'Firefly Lights for kids', board: 'Fireflies, 5 by 5' },
  { path: '/play/peg/', heading: 'Peg Pond for kids', board: 'Lily pad pond, English board' },
  { path: '/play/flow/', heading: 'Flow Paths for kids', board: 'Colour paths, 5 by 5' },
  { path: '/play/tic-tac/', heading: 'Tri-marks for kids', board: 'Tri-marks, three by three' },
  { path: '/play/bloom-guess/', heading: 'Bloom Guess for kids', board: 'Letters' },
  { path: '/play/reversi/', heading: 'Lily Pads for kids', board: 'Lily pad pond, eight by eight' },
  { path: '/play/jigsaw/', heading: 'Piece Garden for kids', board: 'Picture pieces, 3 by 3' },
] as const;

for (const game of NEW_GAMES) {
  test(`${game.path} opens a playable board`, async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto(game.path);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(game.heading);
    await expect(page.locator('.pb-play')).toBeVisible();
    await expect(page.getByRole('grid').or(page.getByRole('group', { name: game.board }))).toBeVisible();

    expect(problems).toEqual([]);
  });
}
