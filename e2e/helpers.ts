import type { Page } from '@playwright/test';

/**
 * Collects everything that went wrong in the console.
 *
 * A page that renders correctly but logs an error is still broken — a missing
 * font, a CSP violation, a failed chunk — and none of it shows up in a
 * screenshot. Every spec asserts this list is empty at the end.
 */
export function trackProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  page.on('requestfailed', (request) => {
    // A font that fails to load is exactly the kind of regression this catches.
    problems.push(`request failed: ${request.url()}`);
  });
  return problems;
}

/** The board is generated in a worker, so it arrives a beat after the route. */
export async function waitForBoard(page: Page): Promise<void> {
  await page.getByRole('grid', { name: 'Sudoku board' }).waitFor({ timeout: 20_000 });
  await page.locator('.pb-cell__mark').first().waitFor({ timeout: 20_000 });
}

/**
 * The nonogram board is behind a lazy chunk and a `useEffect`, so the first
 * paint on this route is the loading skeleton. Waiting for the grid by name
 * also pins the size, which is what proves the right puzzle was dealt.
 */
export async function waitForNonogramBoard(page: Page, size = 5): Promise<void> {
  await page.getByRole('grid', { name: `Nonogram board, ${size} by ${size}` }).waitFor({ timeout: 20_000 });
  await page.locator('.pb-nono-cell').first().waitFor({ timeout: 20_000 });
}

/** Width of the small picture, for the arrow-key arithmetic in tests. */
export const SMALL_PICTURE_COLS = 5;

/**
 * The answer to the first five-by-five picture — the leaf, which is what a
 * fresh visit deals (`useNonogram` starts at `puzzlesOfSize(5)[0]`).
 *
 * Written down rather than imported from the engine on purpose: importing it
 * would make the test agree with the code by construction, and the whole point
 * of a keyboard or mouse solve is that an independent statement of the drawing
 * says the player can finish it. If the picture or its order changes, this is
 * the line that has to change with it, deliberately.
 */
export const SMALL_PICTURE_ANSWER: readonly number[] = [6, 7, 8, 10, 11, 12, 13, 14, 16, 17, 18, 22];

/**
 * Finish the small picture with real mouse clicks, one square at a time.
 *
 * Every click is a full pointer press, which is the point: a press focuses the
 * element it lands on as the browser's own default action, and that timing is
 * exactly what a synchronous `focus()` inside a React effect loses to.
 */
export async function solveSmallPicture(page: Page): Promise<void> {
  for (const index of SMALL_PICTURE_ANSWER) {
    await page.locator(`.pb-nono-cell[data-index="${index}"]`).click();
  }
  await page.locator('.pb-win').waitFor({ timeout: 15_000 });
}

/** Is the focused element inside this selector? The one question a focus trap has to answer. */
export function focusInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((target) => Boolean(document.activeElement?.closest?.(target)), selector);
}

/**
 * A short, comparable description of whatever has focus right now.
 *
 * Deliberately fine-grained: two `sr-only` radios render as identical boxes
 * with no text, so a coarse fingerprint would report two different tab stops as
 * one and quietly weaken every assertion built on it. `name`/`value`/`id` are
 * what tell those apart.
 */
export function focusFingerprint(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement as HTMLInputElement | HTMLElement | null;
    if (!active) return 'none';
    const rect = active.getBoundingClientRect();
    return [
      active.tagName,
      active.id,
      active.className,
      (active as HTMLInputElement).name ?? '',
      (active as HTMLInputElement).value ?? '',
      active.getAttribute('aria-label') ?? '',
      (active.textContent ?? '').trim().slice(0, 30),
      `${Math.round(rect.width)}x${Math.round(rect.height)}`,
    ].join('|');
  });
}
