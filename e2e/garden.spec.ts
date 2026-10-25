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

    await expect(page.getByRole('heading', { name: 'In the garden' })).toBeVisible();
    // Seven shipped games and nothing left in the ground. Six cards, and every
    // one of them is a card you can press.
    await expect(page.locator('.pb-card')).toHaveCount(7);

    // A ready card is a real link with a real href. A card that looks pressable
    // and goes nowhere is the failure this replaces the old counting assertion
    // with — the shelf used to have one playable game and three promises.
    const ready = page.locator('.pb-card--ready');
    await expect(ready).toHaveCount(7);
    const hrefs = await ready.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    // Trailing slashes, because that is the form the canonical tag names and an
    // internal link without one would bounce every crawler through a redirect.
    // The order is the register's order (`GAMES`), which is also the order the
    // shelf is read in: sudoku first, because it is the one the hero offers.
    expect(hrefs).toEqual([
      '/play/sudoku/',
      '/play/nonogram/',
      '/play/tangram/',
      '/play/memory-garden/',
      '/play/balance/',
      '/play/frog-road/',
      '/play/bloom/',
    ]);
    const tags = await ready.evaluateAll((nodes) => nodes.map((node) => node.tagName));
    expect(tags).toEqual(['A', 'A', 'A', 'A', 'A', 'A', 'A']);

    // Nothing is growing, so there is no growing card at all — and no residue of
    // the disabled-card treatment the shelf used to need. This is the assertion
    // that catches a `SPROUTING` list emptied of its entries but not of its
    // markup: a dead card left behind, or an `aria-disabled` on a real link.
    await expect(page.locator('.pb-card--soon')).toHaveCount(0);
    await expect(page.locator('.pb-cards [aria-disabled]')).toHaveCount(0);
    await expect(page.locator('.pb-cards > *')).toHaveCount(7);

    // The sentence above the shelf counts the register instead of repeating a
    // number: the numbers are words up to five and digits past it, so a sixth
    // game reads "6 games finished" — honest about being a count. The wording
    // is taken from the built page: the shelf says the garden is full rather
    // than promising more, because there is nothing in the ground to promise.
    await expect(page.locator('.pb-section__head').first()).toContainText(
      '7 games finished and nothing else growing yet. The garden is full for now.',
    );

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
    const response = await page.goto('/no-such-page');

    // The host has to answer 404, not 200-with-the-shell: a soft 404 is the
    // single most common way a small site fills an index with duplicates.
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /garden/i }).first()).toBeVisible();

    // Chromium logs the navigation's own 404 as a console error. That one line
    // is the expected status arriving, not a broken asset — every other entry
    // would still fail the test.
    expect(problems.filter((problem) => !/status of 404/.test(problem))).toEqual([]);
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

test.describe('what is stored on this device can actually be cleared', () => {
  /**
   * The button says "Clear everything on this device", and it used to be a lie
   * by one character: the theme studio namespaced its keys `pb:` while the
   * games namespace theirs `pb.`, and the handler filtered for one prefix — so
   * a parent could press it, watch the page reload, and find every puzzle
   * save still there.
   *
   * Both spellings are planted here, from the keys the packages really use, and
   * an unrelated key is planted beside them: a fix that clears storage wholesale
   * would pass a "the saves are gone" assertion and quietly break everything
   * else on the origin.
   */
  const OWN_KEYS = ['pb:sudoku:save:v1', 'pb:sudoku:stats:v1', 'pb:themes:v1'];
  const GAME_KEYS = ['pb.nonogram.progress.v1', 'pb.tangram.progress.v1'];
  const FOREIGN_KEY = 'someone-elses-app:notes';

  test('clears both spellings and nothing else', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/parents');

    await page.evaluate(
      ([own, game, foreign]) => {
        for (const key of [...own, ...game]) localStorage.setItem(key, 'planted');
        localStorage.setItem(foreign, 'keep me');
      },
      [OWN_KEYS, GAME_KEYS, FOREIGN_KEY] as const,
    );

    await page.getByRole('button', { name: 'Clear everything on this device' }).click();
    // The handler reloads the page rather than re-rendering, so the assertion
    // has to survive the navigation.
    await page.waitForLoadState('load');

    await expect
      .poll(() => page.evaluate(() => Object.keys(localStorage).sort()), {
        message: 'the saves should be gone',
      })
      .toEqual([FOREIGN_KEY]);

    expect(problems).toEqual([]);
  });
});
