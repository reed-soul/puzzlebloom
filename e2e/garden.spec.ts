import { expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

test.describe('the garden', () => {
  test('opens with a headline, one loud action and no errors', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Puzzles that explain themselves');
    // Exactly one primary action per screen is a design rule, not a detail.
    await expect(page.locator('.pb-btn--loud')).toHaveCount(1);
    await expect(page.locator('.pb-btn--loud')).toContainText('Play Sudoku');

    // The shelf: one shipped game, three growing.
    await expect(page.getByRole('heading', { name: 'In the garden' })).toBeVisible();
    await expect(page.locator('.pb-card')).toHaveCount(4);

    expect(problems).toEqual([]);
  });

  test('every route renders and none of them log anything', async ({ page }) => {
    const problems = trackProblems(page);

    for (const [path, heading] of [
      ['/', 'Puzzles that explain themselves'],
      ['/themes', 'Make it yours'],
      ['/parents', 'What this is, and what it refuses to be'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    }

    expect(problems).toEqual([]);
  });

  test('navigation swaps pages without a full reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      (window as unknown as { __stayed: boolean }).__stayed = true;
    });

    // Two navs carry the same links (header and footer), so the test names the
    // one a visitor reaches first instead of taking whichever comes back. The
    // name is a regex because the header swaps "For parents" for "Parents"
    // below the mobile breakpoint, and both are correct.
    const main = page.getByRole('navigation', { name: 'Main' });

    await main.getByRole('link', { name: /themes/i }).click();
    await expect(page).toHaveURL(/\/themes$/);
    // If the router had fallen back to a page load, this marker would be gone.
    expect(await page.evaluate(() => (window as unknown as { __stayed?: boolean }).__stayed)).toBe(true);

    await main.getByRole('link', { name: /parents/i }).click();
    await expect(page).toHaveURL(/\/parents$/);
  });

  test('an unknown route is answered, not crashed', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/no-such-page');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /garden/i }).first()).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('the fonts are ours', () => {
  test('no request leaves the origin', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/', { waitUntil: 'networkidle' });

    // The origin is read from the page rather than hard-coded, so the same test
    // runs against localhost and against the deployed site.
    const origin = new URL(page.url()).origin;
    const offsite = requests.filter((url) => new URL(url).origin !== origin);

    // This is the whole point of self-hosting: a site for children should not
    // talk to anyone else, and it is cheaper to prove it than to promise it.
    expect(offsite).toEqual([]);
    await expect(page.locator('link[href*="fonts.googleapis"]')).toHaveCount(0);
  });
});
