import { expect, type Page, test } from '@playwright/test';
import {
  SMALL_PICTURE_COLS as COLS,
  SMALL_PICTURE_ANSWER as LEAF_ANSWER,
  trackProblems,
  waitForNonogramBoard,
} from './helpers';

/**
 * Nonogram, played rather than inspected.
 *
 * The engine has its own tests for whether a hint is honest and whether a
 * picture has one answer. What can only be checked here is the seam: that a
 * board arrives at all, that fill and cross are two modes rather than one, that
 * a drag is one undo step, that a picture can be finished with a keyboard, that
 * a half-finished board survives a reload, that the two games can share a
 * document without fighting, and that ten columns still fit a 320px phone.
 *
 * The answer to the first five-by-five picture lives in `helpers.ts` with an
 * explanation of why it is written down instead of imported.
 */

const cell = (page: Page, index: number) => page.locator(`.pb-nono-cell[data-index="${index}"]`);

/** The state word the board puts in every square's label: blank / filled / crossed out. */
async function stateOf(page: Page, index: number): Promise<string | null> {
  const label = await cell(page, index).getAttribute('aria-label');
  return label?.match(/: (blank|filled|crossed out)\.$/)?.[1] ?? null;
}

/** Which square the browser has focused, as the board numbers it. */
async function activeIndex(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    const index = active?.dataset.index;
    return index === undefined ? null : Number(index);
  });
}

/** Walk from one square to another with the arrow keys, no mouse involved. */
async function arrowTo(page: Page, from: number, to: number): Promise<void> {
  const fromRow = Math.floor(from / COLS);
  const fromCol = from % COLS;
  const toRow = Math.floor(to / COLS);
  const toCol = to % COLS;
  for (let col = fromCol; col < toCol; col++) await page.keyboard.press('ArrowRight');
  for (let col = fromCol; col > toCol; col--) await page.keyboard.press('ArrowLeft');
  for (let row = fromRow; row < toRow; row++) await page.keyboard.press('ArrowDown');
  for (let row = fromRow; row > toRow; row--) await page.keyboard.press('ArrowUp');
  expect(await activeIndex(page), `arrow keys should land on ${to}`).toBe(to);
}

/** Board and cell measurements, for comparing a cold load against a warm one. */
async function boardGeometry(page: Page) {
  const board = page.locator('.pb-nono-board');
  const box = await board.boundingBox();
  const firstCell = await page.locator('.pb-nono-cell').first().boundingBox();
  const tracks = await board.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  if (!box || !firstCell) throw new Error('the board has no box to measure');
  return {
    width: Math.round(box.width),
    height: Math.round(box.height),
    columns: tracks.split(' ').length,
    cell: [Math.round(firstCell.width), Math.round(firstCell.height)],
  };
}

test.describe('nonogram', () => {
  test('a board arrives with clues, and nothing is logged', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    await expect(page.getByRole('grid', { name: 'Nonogram board, 5 by 5' })).toBeVisible();
    await expect(page.getByRole('gridcell')).toHaveCount(25);

    // Five clues above the columns, five beside the rows, and the leaf's middle
    // row is five squares wide — so the strip has to say 5.
    await expect(page.locator('.pb-nono-clues--column .pb-nono-clue')).toHaveCount(5);
    await expect(page.locator('.pb-nono-clues--row .pb-nono-clue')).toHaveCount(5);
    await expect(page.locator('.pb-nono-clues--row')).toContainText('5');

    // The heading is sr-only, but it has to exist or the document has none.
    await expect(page.getByRole('heading', { name: 'Nonogram for kids', level: 1 })).toHaveCount(1);
    await expect(page.locator('.pb-win')).toHaveCount(0);

    expect(problems).toEqual([]);
  });

  test('fill and cross are separate modes and do not bleed into each other', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    await cell(page, 12).click();
    await expect(cell(page, 12)).toHaveClass(/is-filled/);

    // Same tap, different mode, different result.
    await page.getByRole('radiogroup', { name: 'Marking' }).getByText('Cross', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Cross' })).toBeChecked();
    await cell(page, 7).click();

    await expect(cell(page, 7)).toHaveClass(/is-crossed/);
    await expect(cell(page, 7)).not.toHaveClass(/is-filled/);

    // The square filled before the switch is untouched, and the one crossed
    // after it did not take its neighbours with it.
    await expect(cell(page, 12)).toHaveClass(/is-filled/);
    await expect(cell(page, 12)).not.toHaveClass(/is-crossed/);
    expect(await stateOf(page, 11)).toBe('blank');
    expect(await stateOf(page, 13)).toBe('blank');

    expect(problems).toEqual([]);
  });

  test('a drag paints a whole line and one undo takes the whole line back', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    const box = await page.locator('.pb-nono-board').boundingBox();
    if (!box) throw new Error('the board has no box to drag across');
    const stepX = box.width / COLS;
    const stepY = box.height / COLS;
    const rowY = box.y + stepY / 2;

    await page.mouse.move(box.x + stepX / 2, rowY);
    await page.mouse.down();
    for (let col = 1; col < COLS; col++) {
      await page.mouse.move(box.x + stepX * (col + 0.5), rowY);
    }
    await page.mouse.up();

    // The design promise: dragging fills a run, not a cell.
    for (let col = 0; col < COLS; col++) await expect(cell(page, col)).toHaveClass(/is-filled/);

    // And the matching half of that promise: the stroke is one undo step, so a
    // single press has to take all five back. Undoing one cell at a time is
    // exactly the behaviour the stroke model exists to avoid.
    await page.getByRole('button', { name: 'Undo' }).click();
    for (let col = 0; col < COLS; col++) {
      await expect(cell(page, col)).not.toHaveClass(/is-filled/);
      expect(await stateOf(page, col)).toBe('blank');
    }

    expect(problems).toEqual([]);
  });

  test('a five-by-five picture can be finished from the keyboard alone', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    // Tab in from wherever the browser starts. Nothing is clicked: this is the
    // path a child without a mouse has to be able to take.
    let here = await activeIndex(page);
    for (let press = 0; press < 30 && here === null; press++) {
      await page.keyboard.press('Tab');
      here = await activeIndex(page);
    }
    expect(here, 'Tab should reach the board').not.toBeNull();

    // Cross one square before filling anything, so both keys are exercised. The
    // leaf's top-left corner is blank, so crossing it is true and stays true.
    if (here !== 0) await arrowTo(page, here ?? 0, 0);
    await page.keyboard.press('x');
    await expect(cell(page, 0)).toHaveClass(/is-crossed/);

    for (const target of LEAF_ANSWER) {
      const from = (await activeIndex(page)) ?? 0;
      if (from !== target) await arrowTo(page, from, target);
      await page.keyboard.press('Space');
      await expect(cell(page, target)).toHaveClass(/is-filled/);
    }

    await expect(page.locator('.pb-win')).toBeVisible();
    await expect(page.locator('#pb-nono-win-title')).toContainText('Leaf');
    // The win panel is a modal, so focus has to be inside it or Tab walks the
    // board behind it and the two ways out are unreachable. On this path
    // nothing else moves focus, so the landing is done by `useModalFocus`'s
    // frame callback — which is why removing that callback breaks the keyboard
    // path and only the keyboard path. `focus.spec.ts` asserts the pointer
    // path, where the capture-phase `focusin` listener is the one that wins.
    await expect(page.locator('.pb-win__card')).toBeFocused();

    expect(problems).toEqual([]);
  });

  test('two squares survive a reload', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    await cell(page, 6).click();
    await cell(page, 7).click();
    await expect(cell(page, 6)).toHaveClass(/is-filled/);

    await page.reload();
    await waitForNonogramBoard(page);

    await expect(cell(page, 6)).toHaveClass(/is-filled/);
    await expect(cell(page, 7)).toHaveClass(/is-filled/);
    // Restored, not replayed: the squares that were blank are still blank.
    expect(await stateOf(page, 8)).toBe('blank');
    expect(await stateOf(page, 11)).toBe('blank');

    expect(problems).toEqual([]);
  });

  test('both games can be visited in one session without sharing styles', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);
    const cold = await boardGeometry(page);
    expect(cold.columns).toBe(5);

    // Garden → sudoku → garden → nonogram, all client-side. Both game chunks
    // and both stylesheets end up in the same document, which is the only way
    // the collision this test is about can happen at all.
    await page.getByRole('button', { name: 'Back to the garden' }).click();
    await page.locator('.pb-door[href="/play/sudoku/"]').click();
    await expect(page.getByRole('grid', { name: 'Sudoku board' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('gridcell')).toHaveCount(81);

    // Nothing of the nonogram is left on the sudoku page, and the sudoku grid
    // still has its own nine columns.
    await expect(page.locator('.pb-nono')).toHaveCount(0);
    const sudokuTracks = await page
      .getByRole('grid', { name: 'Sudoku board' })
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(sudokuTracks).toBe(9);

    await page.getByRole('button', { name: 'Back to the garden' }).click();
    await page.locator('.pb-door[href="/play/nonogram/"]').click();
    await waitForNonogramBoard(page);
    await expect(page.getByRole('gridcell')).toHaveCount(25);

    // The same board, measured the same way, after the other game's CSS has
    // been in the document. A shared `.pb-play` rule leaking across is exactly
    // what this catches.
    expect(await boardGeometry(page)).toEqual(cold);

    expect(problems).toEqual([]);
  });

  test('a ten-by-ten board fits a 320px phone without scrolling sideways', async ({ page }) => {
    const problems = trackProblems(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    await page.getByRole('radiogroup', { name: 'Size' }).getByText('Medium', { exact: true }).click();
    await waitForNonogramBoard(page, 10);
    await expect(page.getByRole('gridcell')).toHaveCount(100);

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.inner);

    // Not merely clipped: the whole grid is inside the viewport.
    const box = await page.locator('.pb-nono-board').boundingBox();
    if (!box) throw new Error('the board has no box to measure');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);

    expect(problems).toEqual([]);
  });
});
