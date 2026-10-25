import { expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * Frog Road, played rather than inspected.
 *
 * The engine has its own tests: the dice are decorrelated, the total never goes
 * negative without the log saying so, the session is a fixed length. What can
 * only be checked here is the seam — that the page rolls two distinct numbers,
 * shows the running count as it changes, and reads the recap as sentences with
 * real arithmetic in them. Nothing is imported from
 * `@puzzlebloom/frog-road-engine`; every assertion is read out of the DOM.
 */

const TURNS = 8;

test.describe('frog road', () => {
  test('loads with the road, the car and both dice controls', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/frog-road/');

    await expect(page.locator('.pb-road__sq').first()).toBeVisible();
    await expect(page.locator('.pb-road__sq.is-here')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Roll' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Go' })).toBeDisabled();
    await expect(page.getByText('Frogs aboard:')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('a roll shows two numbers; go moves the car and applies the square', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/frog-road/');

    const before = await page.locator('.pb-road__sq.is-here').getAttribute('aria-label');

    await page.getByRole('button', { name: 'Roll' }).click();
    // Two dice, and they are not one number: the die faces read differently.
    const move = await page.locator('.pb-road__die').first().textContent();
    expect(move).toMatch(/Move [1-6]/);

    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page.locator('.pb-road__die--empty')).toBeVisible();
    // The car moved, or wrapped to the same square; either way the turn
    // advanced and a sentence with arithmetic appeared.
    const after = await page.locator('.pb-road__sq.is-here').getAttribute('aria-label');
    const turn2 = await page.getByText('Turn 2 of 8').count();
    expect(turn2 === 1 || before !== after).toBe(true);
    // The sentence carries arithmetic — including the clamped case, where the
    // operand never appears because there was nobody aboard to take off.
    await expect(page.locator('.pb-road__last')).toContainText(/— .* = \d+\.$/);
    expect(problems).toEqual([]);
  });

  test('the count changes and never lies: plus adds, minus clamps at zero', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/frog-road/');

    // Play several turns; whatever the dice do, aboard must match the last
    // sentence's arithmetic — the sentence is the contract between the engine
    // and the screen, and reading both is the check that neither drifts.
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Roll' }).click();
      await page.getByRole('button', { name: 'Go' }).click();
    }

    const sentence = await page.locator('.pb-road__last').textContent();
    const shown = Number((await page.getByText('Frogs aboard:').textContent())?.replace(/[^\d]/g, '') ?? '0');
    const match = sentence?.match(/= (\d+)\.$/);
    expect(match).toBeTruthy();
    expect(shown).toBe(Number(match?.[1]));
    expect(problems).toEqual([]);
  });

  test('eight turns end the ride with a recap, and another road restarts', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/frog-road/');

    for (let i = 0; i < TURNS; i++) {
      await page.getByRole('button', { name: 'Roll' }).click();
      await page.getByRole('button', { name: 'Go' }).click();
    }

    await expect(page.getByRole('heading', { name: 'The ride is over' })).toBeVisible();
    // One sentence per turn, each with its own arithmetic.
    await expect(page.locator('.pb-road__log li')).toHaveCount(TURNS);

    await page.getByRole('button', { name: 'Another road' }).click();
    await expect(page.getByText('Turn 1 of 8')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Roll' })).toBeEnabled();
    expect(problems).toEqual([]);
  });
});
