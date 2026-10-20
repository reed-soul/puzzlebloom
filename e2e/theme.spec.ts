import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { trackProblems } from './helpers';

const STUDIO = '/themes';

/**
 * A colour well is an `<input type="color">`, whose value Playwright refuses to
 * `fill()` — there is no text to type. Setting `value` directly is also not
 * enough: React tracks the previous value on the DOM node and swallows a
 * synthetic change unless the native setter is used first. This is the short
 * version of the trick `@testing-library` ships.
 */
async function setWell(page: Page, label: string, value: string): Promise<void> {
  const well = page.locator('.pb-fields .pb-field').filter({ hasText: label });
  await well.locator('input[type="color"]').evaluate((element, next) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/** Reads a custom property straight off `<html>`, where the theme actually lives. */
async function readVar(page: Page, name: string): Promise<string> {
  const value = await page.evaluate(
    (property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
    name,
  );
  // A hex written by hand is uppercase, one that came out of a colour picker is
  // not. Case is not what these tests are about.
  return value.toLowerCase();
}

/** The row in the audit that belongs to a given pair. */
function auditRow(page: Page, label: string) {
  return page.locator('.pb-audit__list li').filter({ hasText: label });
}

test.describe('theme studio', () => {
  test.beforeEach(async ({ page }) => {
    // Every test starts from the shipped meadow, not from the previous test's
    // leftovers. `localStorage` is per-origin and survives between tests
    // inside a worker unless it is cleared.
    await page.goto(STUDIO);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('offers eight wells and says every pair is readable', async ({ page }) => {
    const problems = trackProblems(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Make it yours');
    await expect(page.locator('.pb-fields input[type="color"]')).toHaveCount(8);

    // Eight pairs are audited, and the shipped theme must pass all of them.
    await expect(page.locator('.pb-audit__list li')).toHaveCount(8);
    await expect(page.locator('.pb-audit__list li.is-bad')).toHaveCount(0);
    await expect(page.locator('.pb-audit__title')).toContainText('Every pair is readable');

    expect(problems).toEqual([]);
  });

  test('choosing a mood repaints the page and loads it into the wells', async ({ page }) => {
    const before = await readVar(page, '--pb-bg');
    expect(await page.locator('html').getAttribute('data-theme')).toBe('meadow');

    await page
      .locator('.pb-theme-card')
      .filter({ hasText: 'Night Owl' })
      .getByRole('button', { name: /Use|In use/ })
      .click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    await expect(page.locator('html')).toHaveAttribute('data-mood', 'dark');
    expect(await readVar(page, '--pb-bg')).not.toBe(before);

    // The bug this pins down: the theme switched but the studio kept showing
    // the previous mood's colours, so "Save" saved what you were not seeing.
    const wells = page.locator('.pb-fields input[type="color"]');
    await expect(wells.first()).toHaveValue('#111522');
    await expect(page.locator('.pb-swatches').first()).toBeVisible();
  });

  test('the label on the bright colour is re-derived, not chosen', async ({ page }) => {
    // Start dark: night's ink is near-white, so a pale accent would leave a
    // white label on a near-white button if the studio trusted the old value.
    await page
      .locator('.pb-theme-card')
      .filter({ hasText: 'Night Owl' })
      .getByRole('button', { name: /Use|In use/ })
      .click();
    // A named mood switches through a view transition, so the new colours
    // arrive a frame later. Reading `--pb-ink` before that would capture the
    // previous theme and make the comparison below meaningless.
    await expect(page.locator('html')).toHaveAttribute('data-mood', 'dark');

    const inkBefore = await readVar(page, '--pb-ink');
    await setWell(page, 'Bright', '#FFF3C4');

    await expect.poll(() => readVar(page, '--pb-accent')).toBe('#fff3c4');
    // The derivation has to choose black here, and the audit has to agree.
    await expect.poll(() => readVar(page, '--pb-accent-ink')).toBe('#141412');
    expect(await readVar(page, '--pb-ink')).toBe(inkBefore);
    await expect(auditRow(page, 'Label on the bright accent')).toHaveClass(/is-ok/);
    await expect(page.locator('.pb-audit__list li.is-bad')).toHaveCount(0);
  });

  test('a theme that stops being readable offers a one-tap fix', async ({ page }) => {
    // Pale ink on a pale page: seven of the eight pairs fail at once.
    await setWell(page, 'Ink', '#F2F2F2');

    const broken = page.locator('.pb-audit__list li.is-bad');
    await expect.poll(async () => broken.count()).toBeGreaterThan(0);
    await expect(page.locator('.pb-audit')).toHaveClass(/is-warning/);
    await expect(page.locator('.pb-audit__title')).toContainText(/hard to read/);

    await page.getByRole('button', { name: 'Fix the contrast for me' }).click();

    await expect(page.locator('.pb-audit__list li.is-bad')).toHaveCount(0);
    await expect(page.locator('.pb-audit__title')).toContainText('Every pair is readable');
    await expect(page.getByRole('button', { name: 'Fix the contrast for me' })).toHaveCount(0);

    // "Fix" moves the ink, not the colours the visitor chose on purpose.
    expect(await readVar(page, '--pb-accent')).toBe('#fab72a');
  });

  test('saving survives a reload and shows up under "Made by you"', async ({ page }) => {
    await setWell(page, 'Bright', '#36C2A0');
    await page.getByLabel('Name it').fill('Sea glass');
    await page.getByRole('button', { name: /^Save this theme/ }).click();

    await expect(page.locator('.pb-studio__message')).toContainText('Saved');
    const active = await page.locator('html').getAttribute('data-theme');
    expect(active).toMatch(/^custom-/);

    await page.reload();

    expect(await page.locator('html').getAttribute('data-theme')).toBe(active);
    expect(await readVar(page, '--pb-accent')).toBe('#36c2a0');
    await expect(page.locator('.pb-theme-card').filter({ hasText: 'Sea glass' }).first()).toBeVisible();
  });

  test('undo puts the colours back without touching what is saved', async ({ page }) => {
    const original = await readVar(page, '--pb-accent');
    await setWell(page, 'Bright', '#7B4BFF');
    await expect.poll(() => readVar(page, '--pb-accent')).toBe('#7b4bff');

    await page.getByRole('button', { name: 'Undo changes' }).click();

    expect(await readVar(page, '--pb-accent')).toBe(original);
    // Nothing was saved, so the "Made by you" column is still empty.
    await expect(page.locator('.pb-empty')).toBeVisible();
  });
});

/** `btoa` and the wire format, mirrored so the test does not need Node types. */
function encodeLikeTheApp(payload: unknown): string {
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

test.describe('sharing a theme', () => {
  /** A link written by v0.1, which knew seven colours and no `sky`. */
  const legacyToken = encodeLikeTheApp({
    n: 'Old link',
    m: 'light',
    c: ['#FFF7E0', '#FFFDF8', '#231A0C', '#8A5A00', '#F0B429', '#A6352D', '#2F7A46'],
  });

  test('an older seven-colour link still arrives', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto(`${STUDIO}?theme=${legacyToken}`);

    expect(await readVar(page, '--pb-bg')).toBe('#fff7e0');
    // `sky` did not exist when the link was made, so it must be derived rather
    // than left empty — an empty sky would paint the hero transparent.
    expect(await readVar(page, '--pb-sky')).toMatch(/^#[0-9a-f]{6}$/);

    await expect(page.locator('.pb-incoming')).toContainText('Old link');
    expect(problems).toEqual([]);
  });

  test('a link round-trips into a clean browser', async ({ page, browser, baseURL }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: baseURL ?? 'http://127.0.0.1:4173',
    });

    await page.goto(STUDIO);
    await page.getByLabel('Name it').fill('Sent to a friend');
    await setWell(page, 'Bright', '#FF6B6B');
    await page.getByRole('button', { name: /Copy a share link/ }).click();

    // Clipboard access can be refused; the studio then prints the link instead
    // of lying about having copied it. Handle both rather than flake.
    const message = page.locator('.pb-studio__message');
    await expect(message).toBeVisible();
    let link = (await message.innerText()).trim();
    if (!link.startsWith('http')) {
      link = (await page.evaluate(() => navigator.clipboard.readText())).trim();
    }
    expect(link).toContain('?theme=');

    // A second context, not a second tab: a fresh visitor has no localStorage.
    const guest: BrowserContext = await browser.newContext();
    const visit = await guest.newPage();
    await visit.goto(link);

    expect(await readVar(visit, '--pb-accent')).toBe('#ff6b6b');
    await expect(visit.locator('.pb-incoming')).toContainText('Sent to a friend');

    await visit.getByRole('button', { name: 'Keep it' }).click();
    await expect(visit.locator('.pb-incoming')).toHaveCount(0);
    await expect(visit.locator('html')).toHaveAttribute('data-theme', /^custom-/);

    await guest.close();
  });
});
