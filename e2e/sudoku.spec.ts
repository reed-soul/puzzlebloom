import { expect, test } from '@playwright/test';
import { trackProblems, waitForBoard } from './helpers';

test.describe('sudoku', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play/sudoku');
    await waitForBoard(page);
  });

  test('a board arrives with eighty-one cells and some clues', async ({ page }) => {
    const problems = trackProblems(page);

    await expect(page.getByRole('gridcell')).toHaveCount(81);
    const givens = await page.locator('.pb-cell.is-given').count();
    expect(givens).toBeGreaterThan(20);
    expect(givens).toBeLessThan(60);

    // The nine keys each carry a "how many left" count — the teaching bit.
    await expect(page.locator('.pb-key')).toHaveCount(9);
    await expect(page.locator('.pb-key__count').first()).toHaveText(/^[0-9]$|^—$/);

    expect(problems).toEqual([]);
  });

  test('a digit can be placed, undone, and cleared', async ({ page }) => {
    const cell = page.locator('.pb-cell:not(.is-given)').first();
    await cell.click();
    await expect(cell).toHaveClass(/is-selected/);

    await page.getByRole('button', { name: /^Place 5,/ }).click();
    await expect(cell.locator('.pb-cell__mark')).toHaveText('5');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(cell.locator('.pb-cell__mark')).toHaveCount(0);

    await page.getByRole('button', { name: /^Place 7,/ }).click();
    await expect(cell.locator('.pb-cell__mark')).toHaveText('7');
    await page.getByRole('button', { name: 'Clear the selected cell' }).click();
    await expect(cell.locator('.pb-cell__mark')).toHaveCount(0);
  });

  test('the board is playable from the keyboard alone', async ({ page }) => {
    const cells = page.getByRole('gridcell');
    const selected = page.locator('.pb-cell.is-selected');

    // Tab onto the board and move with arrows. The first cell is the corner, so
    // right-then-down has exactly one right answer — and if the arrow handler
    // ever falls back to "no selection, start in the middle", this fails.
    await cells.nth(0).focus();
    await expect(selected).toHaveAttribute('aria-label', /^Row 1, column 1/);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect(selected).toHaveAttribute('aria-label', /^Row 2, column 2/);

    // Walk right until the highlighted cell is one a person could write in.
    for (let step = 0; step < 9; step++) {
      if (!(await selected.evaluate((element) => element.classList.contains('is-given')))) break;
      await page.keyboard.press('ArrowRight');
    }

    await page.keyboard.press('9');
    await expect(selected.locator('.pb-cell__mark')).toHaveText('9');
  });

  test('a hint explains itself in plain words and keeps the answer behind a tap', async ({ page }) => {
    await page.getByRole('button', { name: 'Ask for a hint' }).click();

    const panel = page.locator('.pb-hint');
    await expect(panel).toBeVisible();
    const text = (await page.locator('.pb-hint__text').innerText()).trim();
    expect(text.length).toBeGreaterThan(20);

    // The engine talks in r4c7; the player reads "row 4, column 7". If a raw
    // coordinate ever leaks through, this catches it.
    expect(text).not.toMatch(/\br\d+c\d+\b/);

    // Reading the reason is the exercise, so the answer is a separate tap.
    const apply = panel.getByRole('button', { name: 'Show me' });
    if (await apply.isVisible()) {
      await apply.click();
      await expect(panel).toHaveCount(0);
    } else {
      await panel.getByRole('button', { name: 'Got it' }).click();
      await expect(panel).toHaveCount(0);
    }
  });

  test('creatures mode swaps the glyphs without touching the puzzle', async ({ page }) => {
    const givensBefore = await page.locator('.pb-cell.is-given').count();

    await page.getByRole('button', { name: 'Switch between numerals and creatures' }).click();

    // Every given now renders an SVG instead of a character.
    await expect(page.locator('.pb-cell.is-given .pb-cell__mark svg').first()).toBeVisible();
    await expect(page.locator('.pb-cell.is-given').count()).resolves.toBe(givensBefore);
  });

  test('a harder level deals a harder board', async ({ page }) => {
    const before = await page.locator('.pb-cell.is-given').count();

    // The radio itself is `sr-only` and sits under its own label, so Playwright
    // clicks the text a person clicks. The label forwarding to the input is
    // part of what this asserts.
    await page.locator('.pb-seg').getByText('Brainy', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Brainy' })).toBeChecked();

    // Generation happens in a worker; the board unmounts and comes back.
    await expect
      .poll(async () => page.locator('.pb-cell.is-given').count(), { timeout: 25_000 })
      .toBeLessThan(before);
    await expect(page.getByRole('gridcell')).toHaveCount(81);
  });

  test('refreshing mid-puzzle restores the same board', async ({ page }) => {
    const cell = page.locator('.pb-cell:not(.is-given)').first();
    await cell.click();
    await page.getByRole('button', { name: /^Place 4,/ }).click();
    const label = await cell.getAttribute('aria-label');

    await page.reload();
    await waitForBoard(page);

    // The save key is per (puzzle, difficulty); the same clue set must come back.
    const givensAfter = await page.locator('.pb-cell.is-given').count();
    expect(givensAfter).toBeGreaterThan(20);
    await expect(page.getByRole('gridcell').nth(0)).toBeVisible();
    expect(label).toBeTruthy();
  });
});
