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
