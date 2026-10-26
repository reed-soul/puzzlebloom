import { chromium, expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * Bloom Drop, played rather than inspected.
 *
 * The engine has its own tests: nothing escapes the jar, merges only combine
 * equals, ticks are deterministic. What only the browser can prove is the
 * seam — that drops appear, that aiming works by pointer and by keyboard,
 * that the score moves when a merge happens, and that the run ends with a
 * panel you can restart from. Both render paths are exercised: the DOM path
 * on the default browser, the HTML-in-Canvas path on a flagged Chromium.
 */

test.describe('bloom drop', () => {
  test('loads with a jar, a score and nothing in it', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/bloom/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.locator('.pb-bloom__stage')).toBeVisible();
    await expect(page.getByText('Score')).toBeVisible();
    await expect(page.locator('.pb-bloom__over')).toHaveCount(0);

    // Geometry, not just existence: this game shipped once with a stage that
    // rendered at 6×3px because an invalid CSS division collapsed the scale
    // expression, and every existence assertion passed. The jar must be
    // jar-shaped — wider than tall is wrong, and anything under 150px tall
    // cannot hold a moonflower. (Engine's jar is 340×440; the CSS caps at 1
    // so desktops show exactly that.)
    const box = await page.locator('.pb-bloom__stage').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(150);
    expect(box!.height).toBeGreaterThan(box!.width);
    expect(box!.width / box!.height).toBeGreaterThan(0.6); // 340/440 ≈ 0.77, with margin
    expect(problems).toEqual([]);
  });

  test('a pointer drop lands a bloom in the jar', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/bloom/');

    // The stage repaints every frame, which can defeat actionability checks;
    // the mouse is the honest pointer here anyway — move to aim, press to
    // aim, release to drop, which is the exact gesture a child makes.
    const box = await page.locator('.pb-bloom__stage').boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const y = box!.y + 40;
    await page.mouse.move(cx, y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1200);

    await expect(page.locator('.pb-bloom__over')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('an edge drop lands inside the painted jar, not on the flowers', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/bloom/');

    const box = await page.locator('.pb-bloom__stage').boundingBox();
    expect(box).not.toBeNull();
    // Aim as far left as the stage allows. The engine clamps to the painted
    // mouth; before this, the wall was the stage, so the creature settled on
    // the flowers beside the glass.
    await page.mouse.move(box!.x + 1, box!.y + 40);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(1200);

    const bloom = page.locator('.pb-bloom__dom-stage .pb-bloom__tier').first();
    await expect(bloom).toBeVisible();
    const b = await bloom.boundingBox();
    expect(b).not.toBeNull();
    const cx = (b!.x + b!.width / 2 - box!.x) / box!.width;
    // 104/340 = 0.306 is the left lip of the mouth; a bloom centred left of
    // that is outside the glass.
    expect(cx).toBeGreaterThan(0.3);
    expect(cx).toBeLessThan(0.7);
    const cy = (b!.y + b!.height / 2 - box!.y) / box!.height;
    expect(cy).toBeGreaterThan(0.5); // it fell in, rather than sticking in the air
    expect(problems).toEqual([]);
  });

  test('keyboard can aim and drop (arrows and space)', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/bloom/');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1200);

    await expect(page.locator('.pb-bloom__over')).toHaveCount(0);
    // The hint names the controls; a keyboard player needs to read it.
    await expect(page.getByText(/Move to aim/)).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('merging scores: two same-tier drops in one place grow the score', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/bloom/');

    const readScore = async () =>
      Number((await page.locator('.pb-bloom__score strong').textContent()) ?? '0');

    // Drop twice in the centre. The queue is random but the first two drops
    // may differ; keep dropping until either the score moves (a merge) or ten
    // drops pass — with five tiers and centre-stacking, ten is far beyond
    // what a merge needs.
    let merged = false;
    for (let i = 0; i < 10 && !merged; i++) {
      const before = await readScore();
      await page.keyboard.press('Space');
      await page.waitForTimeout(1100);
      const after = await readScore();
      merged = after > before;
    }
    expect(merged).toBe(true);
    expect(problems).toEqual([]);
  });

  // The canvas path needs Chromium launched with the API's flag; the mobile
  // project is WebKit, which cannot enable it — the DOM path above already
  // covers that engine, which is also its real-world path today.
  test('canvas path: flagged Chromium draws the jar through HTML-in-Canvas', async (// biome-ignore lint/correctness/noEmptyPattern: Playwright requires the first test argument to be a destructuring; this test wants no fixtures, only the TestInfo.
  {}, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'HTML-in-Canvas is Chromium-only behind its flag');
    const browser = await chromium.launch({ args: ['--enable-blink-features=CanvasDrawElement'] });
    // This test makes its own browser, so it inherits nothing from the config:
    // the origin has to be handed over by hand. Hard-coding one here is how it
    // spent months passing locally and failing against every other server,
    // including the deployed site the same suite is meant to smoke-test.
    const baseURL = testInfo.project.use.baseURL;
    const page = await browser.newPage({ baseURL });
    const problems = trackProblems(page);
    await page.goto('/play/bloom/');

    // The canvas layer mounts with its opt-in attribute; the DOM layer stands
    // down (hidden), and the game still plays through the canvas path.
    const canvas = page.locator('.pb-bloom__canvas');
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute('content', 'drawable');
    await expect(page.locator('.pb-bloom__dom-stage')).toBeHidden();

    await page.keyboard.press('Space');
    await page.waitForTimeout(1200);
    await expect(page.locator('.pb-bloom__over')).toHaveCount(0);
    expect(problems).toEqual([]);
    await browser.close();
  });
});
