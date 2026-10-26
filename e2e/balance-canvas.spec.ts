import { chromium, expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * The HTML-in-Canvas enhancement for Number Balance, and the seam around it.
 *
 * ADR-009: the DOM beam is the complete game; the canvas beam is a progressive
 * enhancement behind a feature probe. This file exercises both paths in the
 * same browser build — the canvas path launches its own Chromium with the
 * API's flag, the DOM path runs on the unflagged default — so neither half can
 * rot. When the API ships stable, the flag dependency below drops away.
 *
 * The canvas assertions read real evidence: the mounted canvas element
 * carrying `content="drawable"`, the drawable pans as real DOM, and a played
 * round that wins through the canvas layer. Nothing imports the engine or the
 * probe; the page is asked what it can do.
 */

const FLAG_ARGS = ['--enable-blink-features=CanvasDrawElement'];

test('canvas beam: mounts when the API is on, and a round plays through it', async (// biome-ignore lint/correctness/noEmptyPattern: no fixtures are wanted here, only the TestInfo that carries the suite's origin.
{}, testInfo) => {
  // The suite's shared server serves the built site; this browser is our own,
  // which also means it inherits no origin from the config — so the one the
  // suite was pointed at has to be handed over explicitly. A port typed here
  // is how this test passed locally and failed against the deployed site.
  const browser = await chromium.launch({ args: FLAG_ARGS });
  const page = await browser.newPage({ baseURL: testInfo.project.use.baseURL });
  const problems = trackProblems(page);
  await page.goto('/play/balance/');

  const canvas = page.locator('.pb-bal-canvas__canvas');
  await expect(canvas).toHaveCount(1);
  // The opt-in attribute the API requires, exactly as documented.
  await expect(canvas).toHaveAttribute('content', 'drawable');
  // The drawable pans exist as real DOM — the same subtrees the
  // accessibility tree sees at the drawn geometry.
  await expect(page.locator('.pb-bal-canvas__stage .pb-bal__pan').first()).toBeAttached();
  // And the CSS beam is not double-painted.
  await expect(page.locator('.pb-bal__beam')).toHaveCount(0);

  // The game plays through the canvas layer: read the numeral from the DOM,
  // count the frogs out, weigh, and win.
  const tile = await page.locator('.pb-bal__tile--given').first().textContent();
  const target = Number(tile);
  for (let i = 0; i < target; i++) {
    await page.getByRole('button', { name: '+ Frog' }).click();
  }
  await page.getByRole('button', { name: 'Weigh' }).click();
  await expect(page.locator('.pb-bal__win')).toBeVisible();
  expect(problems).toEqual([]);

  await browser.close();
});

test('DOM beam: the CSS beam stays when the API is off — the game is complete either way', async ({
  page,
}) => {
  const problems = trackProblems(page);
  await page.goto('/play/balance/');

  await expect(page.locator('.pb-bal__beam')).toHaveCount(1);
  await expect(page.locator('.pb-bal-canvas__canvas')).toHaveCount(0);

  // And it still plays.
  const tile = await page.locator('.pb-bal__tile--given').first().textContent();
  const target = Number(tile);
  for (let i = 0; i < target; i++) {
    await page.getByRole('button', { name: '+ Frog' }).click();
  }
  await page.getByRole('button', { name: 'Weigh' }).click();
  await expect(page.locator('.pb-bal__win')).toBeVisible();
  expect(problems).toEqual([]);
});
