import { expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

test.describe('the garden', () => {
  test('opens on three live doors, then the rest of the garden', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Eight games. No ads. Play now.');

    // The first screen is a shelf, not a brochure: three pressable things, in
    // the order a person should meet them. Bloom Drop is first because it is
    // the one that answers within a second.
    const doors = page.locator('.pb-start');
    await expect(doors).toHaveCount(3);
    const doorHrefs = await doors.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    expect(doorHrefs).toEqual(['/play/bloom/', '/play/memory-garden/', '/play/balance/']);
    expect(await doors.evaluateAll((nodes) => nodes.map((node) => node.tagName))).toEqual(['A', 'A', 'A']);
    await expect(doors.first()).toContainText('Start here');
    await expect(doors.first()).toContainText('Play now');

    // The other five keep their doors, at a quieter weight. Sudoku is no longer
    // the hero offer, but its card — and its board — is still pressable.
    const others = page.locator('.pb-mini-card');
    await expect(others).toHaveCount(5);
    const otherHrefs = await others.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    // The register's order, minus the three that already have a door above.
    expect(otherHrefs).toEqual([
      '/play/sudoku/',
      '/play/nonogram/',
      '/play/tangram/',
      '/play/frog-road/',
      '/play/shadows/',
    ]);

    // Every game is a real link at one weight or the other, and nothing dead is
    // left on the shelf. Both lists are counted rather than a single typed
    // total, so a ninth game added to `GAMES` has to show up in one of them.
    expect(doorHrefs.length + otherHrefs.length).toBe(8);
    await expect(page.locator('.pb-door')).toHaveCount(8);
    await expect(page.locator('[aria-disabled]')).toHaveCount(0);
    await expect(page.locator('.pb-others')).toContainText('8 games, all playable');

    expect(problems).toEqual([]);
  });

  test('a phone shows all three doors without scrolling', async ({ page }) => {
    const problems = trackProblems(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const doors = page.locator('.pb-start');
    await expect(doors).toHaveCount(3);

    // Every one of the three is fully inside the first 844 pixels. This is the
    // assertion the old page failed loudly: at 390px it showed a drawing and no
    // button at all, and the first playable thing was two screens down.
    for (let index = 0; index < 3; index += 1) {
      const box = await doors.nth(index).boundingBox();
      expect(box, `door ${index} should have a box`).not.toBeNull();
      expect(box!.y, `door ${index} should start on screen`).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, `door ${index} should end on screen`).toBeLessThanOrEqual(844);
    }

    await expect(doors.first()).toContainText('Bloom Drop');
    expect(problems).toEqual([]);
  });

  test('the first door really opens the game', async ({ page }) => {
    await page.goto('/');
    await page.locator('.pb-start').first().click();

    await expect(page).toHaveURL(/\/play\/bloom\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bloom Drop');
  });

  test('every route renders and none of them log anything', async ({ page }) => {
    const problems = trackProblems(page);

    for (const [path, heading] of [
      ['/', 'Eight games. No ads. Play now.'],
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
