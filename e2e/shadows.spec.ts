import { expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * Stone Shadows, played rather than inspected.
 *
 * Two things can only be checked here: that the page a child loads is a working
 * game, and that the figure it draws in three dimensions did not quietly become
 * the game. Every assertion below is read out of the rendered DOM — nothing is
 * imported from `@puzzlebloom/shadows-engine`, so a change to the engine has to
 * arrive here as a changed *screen* before it can pass.
 *
 * The first level is solved by reading the three plans and intersecting them,
 * which is exactly what the game asks a player to do. If the plans and the
 * answer ever disagree, this test fails the way a child would: by doing the
 * obvious thing and being told it was wrong.
 */

const PLAN = '.pb-shd__plan';

/** Four to a side, which is why every index below is read as rows of four. */
const SIZE = 4;

/**
 * Opens the game and waits for it to actually be a game.
 *
 * The chunk carries three.js — around 140 kB gzipped — so the route paints a
 * one-line fallback first. Assertions that retry would wait for it by
 * themselves; the raw DOM reads below would not, and would find an empty page
 * and call it a missing plan.
 */
async function openPlot(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/play/shadows/');
  await page.locator('.pb-shd__cell').first().waitFor({ timeout: 20_000 });
}

/** Which cells of a plan are drawn filled, as indices into the 4×4 grid. */
async function filledCells(page: import('@playwright/test').Page, index: number): Promise<number[]> {
  const cells = page.locator(`${PLAN}`).nth(index).locator('.pb-shd__plan-grid > span');
  const count = await cells.count();
  const filled: number[] = [];
  for (let at = 0; at < count; at += 1) {
    if ((await cells.nth(at).getAttribute('class')) === 'is-filled') filled.push(at);
  }
  return filled;
}

test.describe('stone shadows', () => {
  test('loads with a heading, three plans and a plot of sixteen columns', async ({ page }) => {
    const problems = trackProblems(page);
    await openPlot(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1); // sr-only, but present
    await expect(page.locator(PLAN)).toHaveCount(3);
    await expect(page.locator('.pb-shd__plan-title')).toHaveText([
      'From the front',
      'From the side',
      'From above',
    ]);
    await expect(page.locator('.pb-shd__cell')).toHaveCount(16);
    await expect(page.getByRole('button', { name: 'Hint' })).toBeVisible();

    // The figure is drawn into a canvas, and a canvas is not a document. It is
    // hidden from assistive technology on purpose, because every fact it shows
    // is also in the plans, the plot and the status line.
    const canvas = page.locator('.pb-shd__view canvas');
    if ((await canvas.count()) > 0) {
      await expect(canvas).toHaveAttribute('aria-hidden', 'true');
    }

    expect(problems).toEqual([]);
  });

  test('a stone in the wrong square leaves the shadows disagreeing', async ({ page }) => {
    const problems = trackProblems(page);
    await openPlot(page);

    // The far corner of the plot, which no plan of level one has a stone in.
    await page.locator('.pb-shd__cell').first().click();

    await expect(page.locator('.pb-shd__status')).toHaveText('None of the three shadows agrees yet.');
    await expect(page.locator('.pb-shd__plan-verdict').first()).not.toHaveText('agrees');
    await expect(page.locator('.pb-shd__done')).toHaveCount(0);

    expect(problems).toEqual([]);
  });

  test('the three plans between them name the square that solves level one', async ({ page }) => {
    const problems = trackProblems(page);
    await openPlot(page);

    // One stone, so each plan has exactly one filled cell: the front says which
    // column, the side says which row, the ground says which square. Reading
    // them out of the DOM is the only version of this test that does not simply
    // agree with the engine about where the answer is.
    const front = await filledCells(page, 0);
    const side = await filledCells(page, 1);
    const top = await filledCells(page, 2);
    expect(front).toHaveLength(1);
    expect(side).toHaveLength(1);
    expect(top).toHaveLength(1);

    // Plans are drawn with the ground at the bottom, so display row 3 is level
    // zero — and the top plan is drawn with the far rank at the top.
    const file = front[0] % SIZE;
    const rank = side[0] % SIZE;
    expect(3 - Math.floor(top[0] / SIZE)).toBe(rank);
    expect(top[0] % SIZE).toBe(file);

    await page.getByRole('button', { name: `Row ${rank + 1}, column ${file + 1}:` }).click();

    await expect(page.locator('.pb-shd__status')).toHaveText('All three shadows agree.');
    await expect(page.locator('.pb-shd__plan-verdict')).toHaveText(['agrees', 'agrees', 'agrees']);
    await expect(page.getByRole('button', { name: 'Next plot' })).toBeVisible();
    await expect(page.locator('.pb-shd__done')).toHaveCount(1);

    expect(problems).toEqual([]);
  });

  test('a column can be built with the keyboard and taken down again', async ({ page }) => {
    const problems = trackProblems(page);
    await openPlot(page);

    const column = page.locator('.pb-shd__cell').first();
    await column.focus();
    await page.keyboard.press('Enter');
    await expect(column).toHaveAttribute('aria-label', /one stone$/);

    // Arrow keys walk the plot rather than leaving the grid, which is the whole
    // reason the plot is sixteen buttons and not a picture.
    await page.keyboard.press('ArrowLeft');
    const neighbour = page.getByRole('button', { name: 'Row 4, column 3:' });
    await expect(neighbour).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(neighbour).toHaveAttribute('aria-label', /one stone$/);

    // And the same place, taken apart. The radios inside the segmented control
    // are sr-only, so the press goes to the label that wears them.
    await page.getByText('Lift a stone', { exact: true }).click();
    await neighbour.focus();
    await page.keyboard.press('Enter');
    await expect(neighbour).toHaveAttribute('aria-label', /no stones$/);

    expect(problems).toEqual([]);
  });

  test('a hint names the square the plan wants rather than filling it', async ({ page }) => {
    const problems = trackProblems(page);
    await openPlot(page);

    // The plans are drawn with the far rank at the top, so display row 3 is
    // rank 0 — the same flip the plot makes. Read, never imported.
    const top = await filledCells(page, 2);
    expect(top).toHaveLength(1);
    const rank = 3 - Math.floor(top[0] / SIZE);
    const file = top[0] % SIZE;

    // A stone where the plan wants none, so the plot is wrong in both
    // directions at once: one stone too many, one too few.
    const wrong = rank * SIZE + file === 15 ? 0 : 15;
    const wrongLabel = `Row ${Math.floor(wrong / SIZE) + 1}, column ${(wrong % SIZE) + 1}:`;
    await page.getByRole('button', { name: wrongLabel }).click();

    await page.getByRole('button', { name: 'Hint' }).click();

    // Of the two things wrong, the hint reports the missing stone. Taking away
    // the stone a child has just placed leaves an empty plot, which is also
    // wrong; naming the square the plan covers is the move that helps.
    const hint = page.locator('.pb-shd__hint');
    await expect(hint).toContainText(`Row ${rank + 1}, column ${file + 1}`);

    // And it points. Whether the stone is still standing is the whole
    // difference between a hint and an answer.
    await expect(page.getByRole('button', { name: wrongLabel })).toHaveAttribute('aria-label', /one stone$/);
    await expect(page.locator('.pb-shd__done')).toHaveCount(0);

    expect(problems).toEqual([]);
  });
});
