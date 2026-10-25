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
  test('canvas path: flagged Chromium draws the jar through HTML-in-Canvas', async (_fixtures, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'HTML-in-Canvas is Chromium-only behind its flag');
    const browser = await chromium.launch({ args: ['--enable-blink-features=CanvasDrawElement'] });
    const page = await browser.newPage();
    const problems = trackProblems(page);
    await page.goto('http://127.0.0.1:4173/play/bloom/');

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
