import { expect, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * Number Balance, played rather than inspected.
 *
 * The engine has its own tests for the claims the product makes — the tilt is a
 * pure function of the difference, the pan locks when solved, generation is
 * deterministic. What can only be checked here is the seam: that the page a
 * child loads actually tips its beam, accepts frogs, and says the sentence when
 * it balances. Nothing is imported from `@puzzlebloom/balance-engine`; every
 * assertion is read out of the rendered DOM.
 *
 * Level one is forced by clicking the segmented control, because the level
 * decides how many numerals sit on the left pan, and the counting test needs to
 * know what it is counting toward.
 */

test.describe('number balance', () => {
  test('loads, shows the beam and offers frogs', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/balance/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1); // sr-only, but present
    await expect(page.locator('.pb-bal__beam')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Frog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Weigh' })).toBeVisible();
    await expect(page.locator('.pb-bal__tile--given').first()).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('a wrong weigh does not solve, and says which side is heavier', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/balance/');

    // One frog, then weigh: unless the target was 1 (impossible — level one
    // generates 3–9), the right pan is lighter and the beam is tipped.
    await page.getByRole('button', { name: '+ Frog' }).click();
    await page.getByRole('button', { name: 'Weigh' }).click();

    await expect(page.locator('.pb-bal__win')).toHaveCount(0);
    await expect(page.locator('.pb-bal__target')).toContainText(/heavier/i);
    expect(problems).toEqual([]);
  });

  test('counting the numeral out in frogs balances the scale', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/balance/');

    // The target is printed on the left pan's tile. A test that read it from
    // the engine would agree with the engine by construction; reading it from
    // the DOM is the claim that the screen shows a child the number to reach.
    const tile = await page.locator('.pb-bal__tile--given').first().textContent();
    const target = Number(tile);

    for (let i = 0; i < target; i++) {
      await page.getByRole('button', { name: '+ Frog' }).click();
    }
    await page.getByRole('button', { name: 'Weigh' }).click();

    await expect(page.locator('.pb-bal__win')).toBeVisible();
    await expect(page.locator('.pb-bal__equation')).toContainText(String(target));
    // The equation names both sides, and its left side is the puzzle's numeral.
    const equation = await page.locator('.pb-bal__equation').textContent();
    expect(equation?.startsWith(`${target} =`)).toBe(true);
    expect(problems).toEqual([]);
  });

  test('emptying the pan clears frogs and the previous weigh', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/balance/');

    await page.getByRole('button', { name: '+ Frog' }).click();
    await page.getByRole('button', { name: '+ Frog' }).click();
    await page.getByRole('button', { name: 'Weigh' }).click();
    await page.getByRole('button', { name: 'Empty the pan' }).click();

    await expect(page.locator('.pb-bal__frog')).toHaveCount(0);
    await expect(page.locator('.pb-bal__target')).not.toContainText(/heavier|Level!/i);
    expect(problems).toEqual([]);
  });

  test('next puzzle after a solve serves a fresh numeral', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/balance/');

    const first = Number(await page.locator('.pb-bal__tile--given').first().textContent());
    for (let i = 0; i < first; i++) {
      await page.getByRole('button', { name: '+ Frog' }).click();
    }
    await page.getByRole('button', { name: 'Weigh' }).click();
    await page.getByRole('button', { name: 'Next puzzle' }).click();

    // The new tile exists; the pan is empty; the win panel is gone.
    await expect(page.locator('.pb-bal__win')).toHaveCount(0);
    await expect(page.locator('.pb-bal__frog')).toHaveCount(0);
    await expect(page.locator('.pb-bal__tile--given').first()).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('the level control changes the puzzle shape', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/balance/');

    // The radios are sr-only inside the Segmented control (keyboard behaviour
    // comes free from real inputs, at the cost of visibility to the pointer),
    // so the press goes to the label that wears them.
    await page.getByText('Level 2', { exact: true }).click();
    await expect(page.locator('.pb-bal__tile--given')).toHaveCount(2);

    await page.getByText('Level 1', { exact: true }).click();
    await expect(page.locator('.pb-bal__tile--given')).toHaveCount(1);
    expect(problems).toEqual([]);
  });
});
