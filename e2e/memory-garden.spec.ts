import { expect, type Page, test } from '@playwright/test';
import { trackProblems } from './helpers';

/**
 * Memory Garden, played rather than inspected.
 *
 * The engine has its own tests for the four claims the product makes — a missed
 * pair stays face up, the recap counts runs rather than matches, a hint only
 * mentions a card the player has turned over, and nine pairs is the ceiling.
 * What can only be checked here is the seam, and this file has one rule about
 * it: **nothing is imported from `@puzzlebloom/memory-garden-engine`**. Every
 * assertion below is read out of the rendered DOM, because the promise is about
 * what a child sees on the screen, and a test that asked the engine what the
 * screen should say would agree with the code by construction.
 *
 * The cards are read through `aria-label`, not through colour or class alone:
 * `Card 5, face down`, `Card 5, the snail`, `Card 5, the snail, kept`. That is
 * also the only channel a screen-reader player has, so a label that lies breaks
 * two things at once.
 */

const CARD = '.pb-memory__card';
const GRID = '.pb-memory__grid';
const HINT_BUTTON = 'Ask the garden what to turn';

type Face = 'down' | 'up' | 'kept';

interface CardState {
  index: number;
  face: Face;
  /** Null while face down: the label does not give the creature away. */
  creature: string | null;
}

/** Every card this round has shown the player, and what it showed. */
type Known = Map<number, string>;

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

// ---------------------------------------------------------------------------
// reading and playing the board
// ---------------------------------------------------------------------------

async function waitForBoard(page: Page, cards = 12): Promise<void> {
  await page.locator(CARD).first().waitFor({ timeout: 20_000 });
  await expect(page.locator(CARD)).toHaveCount(cards);
}

async function readCards(page: Page): Promise<CardState[]> {
  const labels = await page
    .locator(CARD)
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));

  return labels.map((label, index) => {
    const kept = /, kept$/.test(label);
    const down = /, face down$/.test(label);
    const creature = label.match(/, (the [a-z' -]+?)(, kept)?$/)?.[1] ?? null;
    return { index, face: down ? 'down' : kept ? 'kept' : 'up', creature: down ? null : creature };
  });
}

function remember(known: Known, cards: readonly CardState[]): void {
  for (const card of cards) if (card.creature) known.set(card.index, card.creature);
}

/**
 * A press, and a frame for React to commit it.
 *
 * A click is a discrete event, so React flushes it synchronously — but a test
 * that reads the DOM straight after a hundred presses is a test that will one
 * day read a stale board and blame the game.
 */
async function press(page: Page, index: number): Promise<void> {
  await page.locator(CARD).nth(index).click();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
}

const keptCount = (page: Page): Promise<string> =>
  page
    .locator('.pb-memory__count')
    .innerText()
    .then((text) => text.trim());

/** Some card the player has turned over that is face down again. */
const hasSeenAndDown = (cards: readonly CardState[], known: Known) =>
  cards.some((card) => card.face === 'down' && known.has(card.index));

const hasKeptPair = (cards: readonly CardState[]) => cards.some((card) => card.face === 'kept');

const isSolved = (cards: readonly CardState[]) => cards.every((card) => card.face === 'kept');

/** Two cards face up at once is a miss, whatever was on them. */
const upPair = (cards: readonly CardState[]) =>
  cards.filter((card) => card.face === 'up').map((card) => card.index);

/**
 * Play the board the way a person does: turn an unknown card, then either pair
 * it with a twin already known or turn the next unknown one.
 *
 * Written as a loop over what the screen says, so it works for any deal and any
 * size — the test does not know the arrangement, and must not. `known` is the
 * caller's, because what a player has seen is the thing most of these tests are
 * about.
 */
async function playUntil(
  page: Page,
  known: Known,
  enough: (cards: readonly CardState[], known: Known) => boolean,
  limit = 90,
): Promise<void> {
  for (let turn = 0; turn < limit; turn += 1) {
    let cards = await readCards(page);
    if (enough(cards, known)) return;

    const partnerOf = (card: CardState) =>
      cards.find(
        (other) =>
          other.index !== card.index &&
          other.face === 'down' &&
          known.has(card.index) &&
          known.get(other.index) === known.get(card.index),
      );

    const first =
      cards.find((card) => card.face === 'down' && partnerOf(card) !== undefined) ??
      cards.find((card) => card.face === 'down' && !known.has(card.index)) ??
      cards.find((card) => card.face === 'down');
    if (!first) return;
    await press(page, first.index);
    cards = await readCards(page);
    remember(known, cards);

    const wanted = known.get(first.index);
    const second =
      cards.find(
        (card) => card.face === 'down' && wanted !== undefined && known.get(card.index) === wanted,
      ) ??
      cards.find((card) => card.face === 'down' && !known.has(card.index)) ??
      cards.find((card) => card.face === 'down');
    if (!second) return;
    await press(page, second.index);
    remember(known, await readCards(page));
  }
}

/** A kept pair and a card that is seen and down: enough for a hint and a recap. */
const midRound = (cards: readonly CardState[], known: Known) =>
  hasKeptPair(cards) && hasSeenAndDown(cards, known);

/**
 * The grid as it is really drawn, measured from the cards rather than from the
 * CSS.
 *
 * Two numbers, and the difference between them is the thing worth checking:
 * `columns` is how many cards share a left edge, `declared` is the count the
 * game wrote into `--pb-memory-columns` — which is the number the hint does its
 * row arithmetic with. A hint that says "the second row" while the grid draws
 * something else is the failure this measures for.
 *
 * Counting geometry rather than splitting `grid-template-columns` is deliberate:
 * Chromium serialises that property as `repeat(6, minmax(0px, 1fr))`, so a naive
 * split counts commas and calls eighteen cards three columns.
 */
function renderedGrid(page: Page): Promise<{ columns: number; declared: number; rows: number[] }> {
  return page.evaluate(
    ({ cardSelector, gridSelector }) => {
      const rects = Array.from(document.querySelectorAll(cardSelector)).map((node) =>
        node.getBoundingClientRect(),
      );
      const round = (value: number) => Math.round(value);
      const tops = [...new Set(rects.map((rect) => round(rect.top)))].sort((a, b) => a - b);
      const lefts = new Set(rects.map((rect) => round(rect.left)));
      const grid = document.querySelector<HTMLElement>(gridSelector);
      if (!grid) throw new Error('there is no card grid on this page');
      const declared = Number(getComputedStyle(grid).getPropertyValue('--pb-memory-columns').trim());
      return { columns: lefts.size, declared, rows: rects.map((rect) => tops.indexOf(round(rect.top))) };
    },
    { cardSelector: CARD, gridSelector: GRID },
  );
}

/** The picker's option is a pill wrapping a visually hidden radio. */
async function chooseLevel(page: Page, label: 'Small' | 'Medium' | 'Large'): Promise<void> {
  await page.locator('.pb-seg__item', { hasText: new RegExp(`^${label}`) }).click();
}

/** The one sentence on the hint sheet, with its whitespace flattened. */
async function readHint(page: Page): Promise<string> {
  await page.getByRole('button', { name: HINT_BUTTON }).click();
  const text = page.locator('.pb-hint__text');
  await expect(text).toBeVisible();
  // The refusal is a different sentence, and a test that accepted it would pass
  // on a game that had nothing honest to say.
  await expect(text).not.toContainText('Nothing to remind you of yet');
  return (await text.innerText()).replace(/\s+/g, ' ').trim();
}

const HINT_SENTENCE = /^You turned (the [a-z' -]+) over in the ([a-z]+) row\. It is still face down\.$/;

// ---------------------------------------------------------------------------
// 1. cold start
// ---------------------------------------------------------------------------

test('the board arrives, twelve cards face down, and nothing logs', async ({ page }) => {
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  // The heading is real and not drawn, so a crawler finds one; the screen gets a
  // back button, a size and a clock instead.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Memory Garden for kids');
  await expect(page.getByRole('group', { name: 'The cards' })).toBeVisible();

  const cards = await readCards(page);
  expect(cards).toHaveLength(12);
  for (const card of cards) {
    expect(card.face, `card ${card.index + 1}`).toBe('down');
    // The label a screen reader gets before anything has happened: a number and
    // the one fact that matters, with no creature in it.
    await expect(page.locator(CARD).nth(card.index)).toHaveAttribute(
      'aria-label',
      new RegExp(`^Card ${card.index + 1}, face down$`),
    );
  }

  await expect(page.locator('.pb-memory__count')).toHaveText('0 of 6 kept');
  await expect(page.locator('.pb-play__level')).toHaveText('Six pairs');
  // The layout is three columns on a phone and four on a desktop, and this test
  // runs at both widths — so what is asserted here is the relation, not a
  // number: the count the hint does its row arithmetic with is the count the
  // cards are really drawn in, and every card is in the row its index implies.
  const grid = await renderedGrid(page);
  expect(grid.declared, 'the number the hint reads is the number that is drawn').toBe(grid.columns);
  expect(grid.columns).toBeGreaterThanOrEqual(3);
  grid.rows.forEach((row, index) => {
    expect(row, `card ${index + 1} is in the wrong row for ${grid.columns} columns`).toBe(
      Math.floor(index / grid.columns),
    );
  });

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 2. a pair that matches
// ---------------------------------------------------------------------------

test('two of the same creature are kept, and the label says so', async ({ page }) => {
  test.setTimeout(120_000);
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  await playUntil(page, new Map(), (cards) => hasKeptPair(cards));

  const cards = await readCards(page);
  const kept = cards.filter((card) => card.face === 'kept');
  expect(kept).toHaveLength(2);
  expect(kept[0].creature).not.toBeNull();
  expect(kept[0].creature).toBe(kept[1].creature);
  expect(await keptCount(page)).toBe('1 of 6 kept');

  // Read from the label, not from the brand-coloured edge: colour is a second
  // signal for people who can see it, never the only one.
  await expect(page.locator(CARD).nth(kept[0].index)).toHaveAttribute(
    'aria-label',
    new RegExp(`^Card ${kept[0].index + 1}, .+, kept$`),
  );
  await expect(page.locator(`${CARD}.is-kept`)).toHaveCount(2);

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 3. the promise with no clock in it
// ---------------------------------------------------------------------------

test('a missed pair is still face up two seconds later, and only the next press covers it', async ({
  page,
}) => {
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  // Turn cards in order until two different creatures are up together.
  const known: Known = new Map();
  let missed: number[] = [];
  for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    const before = await readCards(page);
    if (before[index].face !== 'down') continue;
    await press(page, index);
    const cards = await readCards(page);
    remember(known, cards);
    if (upPair(cards).length === 2) {
      missed = upPair(cards);
      break;
    }
  }

  expect(missed, 'the scan should reach a miss').toHaveLength(2);
  expect(known.get(missed[0])).not.toBe(known.get(missed[1]));
  const keptBefore = await keptCount(page);
  await expect(page.locator(`${CARD}.is-up`)).toHaveCount(2);

  // The whole point of the game, and the reason there is no timer anywhere in
  // it: a slow reader keeps the picture for as long as they need it.
  await page.waitForTimeout(2000);

  const later = await readCards(page);
  expect(later[missed[0]].face, 'the first card was covered by a timer').toBe('up');
  expect(later[missed[1]].face, 'the second card was covered by a timer').toBe('up');
  expect(upPair(later)).toEqual(missed);
  expect(later[missed[0]].creature).toBe(known.get(missed[0]));
  expect(later[missed[1]].creature).toBe(known.get(missed[1]));
  expect(await keptCount(page)).toBe(keptBefore);

  // The next press covers the pair first, then turns itself over: one press, and
  // the player never has to "clear" a miss before starting again.
  const next = later.find((card) => card.face === 'down');
  if (!next) throw new Error('the scan should have left a card face down');
  await press(page, next.index);

  const after = await readCards(page);
  expect(after[missed[0]].face).toBe('down');
  expect(after[missed[1]].face).toBe('down');
  expect(upPair(after)).toEqual([next.index]);
  await expect(page.locator(`${CARD}.is-up`)).toHaveCount(1);
  expect(await keptCount(page)).toBe(keptBefore);

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 4. keyboard only
// ---------------------------------------------------------------------------

test('a round can be finished with nothing but Tab, arrows and Enter — and Tab still leaves', async ({
  page,
  browserName,
}) => {
  test.setTimeout(300_000);
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  let keys = 0;
  const tap = async (key: string) => {
    await page.keyboard.press(key);
    keys += 1;
  };
  const focusIsCard = () =>
    page.evaluate(
      (selector) => Boolean((document.activeElement as HTMLElement | null)?.matches?.(selector) ?? false),
      CARD,
    );

  // Into the grid, one Tab at a time. Roving tabindex means exactly one card is
  // a tab stop, which is what makes this a finite walk rather than eighteen.
  let inGrid = false;
  for (let step = 0; step < 40 && !inGrid; step += 1) {
    await tap('Tab');
    inGrid = await focusIsCard();
  }
  expect(inGrid, 'Tab should reach the grid').toBe(true);
  const tabsToReachGrid = keys;

  // And out of it. A roving-tabindex grid that traps the keyboard is a grid a
  // keyboard user cannot leave, which is worse than one they cannot enter.
  const focusReport = () =>
    page.evaluate((selector) => {
      const active = document.activeElement as HTMLElement | null;
      return {
        inGrid: Boolean(active?.closest?.(selector) ?? false),
        onBody: active === document.body || active === null,
        label: active?.getAttribute('aria-label') ?? active?.textContent?.trim().slice(0, 24) ?? '',
      };
    }, GRID);

  await tap('Tab');
  const escaped = await focusReport();
  expect(escaped.inGrid, 'Tab must leave the grid').toBe(false);

  if (browserName === 'chromium') {
    // Chromium's native tab order includes buttons, so the next stop is the
    // control that follows the grid in the document.
    expect(escaped.onBody, 'Tab must land on a real control, not the body').toBe(false);
    expect(escaped.label, 'the next stop after the grid is the hint button').toBe(HINT_BUTTON);
  } else {
    // WebKit's own tab order only visits elements with an explicit `tabindex` —
    // that is why `useModalFocus` owns Tab itself rather than trusting the
    // engine — so a press from a card parks focus on `<body>` and the next one
    // returns to the card. This is a property of the engine, not of this game:
    // the same press out of the sudoku grid does the same thing. What the game
    // owes a keyboard user is the promise the roving tabindex can actually
    // break — that the grid does not hold focus by force — and that is asserted
    // above, on both engines.
    console.log(`Tab out of the grid on ${browserName}: focus went to "${escaped.label}"`);
  }

  // Back in, one Tab at a time — forward rather than Shift+Tab, because the tab
  // order out of a grid is the browser's business and only the way back in is
  // this page's. Then the whole round from the keyboard.
  let backIn = false;
  for (let step = 0; step < 40 && !backIn; step += 1) {
    await tap('Tab');
    backIn = await focusIsCard();
  }
  expect(backIn, 'Tab must be able to get back into the grid').toBe(true);

  const focusIndex = () =>
    page.evaluate((selector) => {
      const active = document.activeElement as HTMLElement | null;
      if (!active?.matches?.(selector)) return null;
      const match = (active.getAttribute('aria-label') ?? '').match(/^Card (\d+),/);
      return match ? Number(match[1]) - 1 : null;
    }, CARD);

  const turnWithKeys = async (index: number) => {
    const at = await focusIndex();
    if (at === null) throw new Error('focus left the grid');
    const count = await page.locator(CARD).count();
    const right = (index - at + count) % count;
    const left = (at - index + count) % count;
    const key = right <= left ? 'ArrowRight' : 'ArrowLeft';
    for (let step = 0; step < Math.min(right, left); step += 1) await tap(key);
    expect(await focusIndex(), `arrows should reach card ${index + 1}`).toBe(index);
    await tap('Enter');
  };

  const known: Known = new Map();
  const started = Date.now();
  for (let turn = 0; turn < 90; turn += 1) {
    if (await page.locator('.pb-win').isVisible()) break;

    let cards = await readCards(page);
    const first =
      cards.find(
        (card) =>
          card.face === 'down' &&
          known.has(card.index) &&
          cards.some(
            (other) =>
              other.index !== card.index &&
              other.face === 'down' &&
              known.get(other.index) === known.get(card.index),
          ),
      ) ??
      cards.find((card) => card.face === 'down' && !known.has(card.index)) ??
      cards.find((card) => card.face === 'down');
    if (!first) break;
    await turnWithKeys(first.index);
    cards = await readCards(page);
    remember(known, cards);

    const wanted = known.get(first.index);
    const second =
      cards.find(
        (card) => card.face === 'down' && wanted !== undefined && known.get(card.index) === wanted,
      ) ??
      cards.find((card) => card.face === 'down' && !known.has(card.index)) ??
      cards.find((card) => card.face === 'down');
    if (!second) break;
    await turnWithKeys(second.index);
    remember(known, await readCards(page));
  }
  const elapsedMs = Date.now() - started;

  await expect(page.locator('.pb-win')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.pb-memory__count')).toHaveText('6 of 6 kept');

  console.log(`keyboard round: ${keys} keys (${tabsToReachGrid} Tabs to reach the grid), ${elapsedMs}ms`);
  // A round playable only with a mouse is not keyboard accessible, so the count
  // is printed and bounded rather than merely succeeding once.
  expect(keys, 'a twelve-card round should not need hundreds of presses').toBeLessThan(400);

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 5. a half-turned board survives a reload
// ---------------------------------------------------------------------------

test('a half-turned board survives a reload, faces and all', async ({ page }) => {
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  // A kept pair *and* two cards in hand: the two things a reload has to bring
  // back, and the only state where "the faces survived" means anything.
  await playUntil(page, new Map(), (cards) => hasKeptPair(cards) && upPair(cards).length === 2);
  const before = await readCards(page);
  const countBefore = await keptCount(page);
  expect(upPair(before).length, 'a miss is what makes this test worth running').toBe(2);
  expect(countBefore, 'a kept pair is what the other half of the save is').not.toBe('0 of 6 kept');

  await page.reload();
  await waitForBoard(page);

  const after = await readCards(page);
  expect(after.map((card) => card.face)).toEqual(before.map((card) => card.face));
  expect(after.map((card) => card.creature)).toEqual(before.map((card) => card.creature));
  expect(await keptCount(page)).toBe(countBefore);
  // The same deal, not a new one: a save is `(level, seed)` plus the faces.
  await expect(page.locator('.pb-play__level')).toHaveText('Six pairs');

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 6. the hint only says what the player has seen — and says where it really is
// ---------------------------------------------------------------------------

test('the hint names a card the player turned over, in the row it is really in (320px)', async ({ page }) => {
  test.setTimeout(120_000);
  const problems = trackProblems(page);
  // 320px is the narrow case: three columns, so a card's row here is not the row
  // a wide grid would put it in.
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/play/memory-garden');
  await waitForBoard(page);
  expect((await renderedGrid(page)).columns, 'twelve cards in three columns at 320px').toBe(3);

  const known: Known = new Map();
  await playUntil(page, known, (cards, seen) => hasSeenAndDown(cards, seen));
  const message = await readHint(page);

  const cards = await readCards(page);
  const { columns, declared, rows } = await renderedGrid(page);
  // The number the hint did its arithmetic with is the number on the screen.
  expect(declared).toBe(columns);

  // The hint picks the earliest card it is allowed to mention: face down, and
  // one the player has already turned. Written here as the same rule, read off
  // the board, without asking the engine what it decided.
  const expected = cards.find((card) => card.face === 'down' && known.has(card.index));
  if (!expected) throw new Error('there should be a seen card face down to hint about');

  const parsed = message.match(HINT_SENTENCE);
  expect(parsed, `the sentence has to say what and where: "${message}"`).not.toBeNull();
  // What: a creature the player has actually looked at, on a card still down.
  expect([...known.values()], 'the named creature must be one the player turned over').toContain(parsed?.[1]);
  expect(parsed?.[1]).toBe(known.get(expected.index));

  // Where: the row the card is drawn in — measured from the layout, checked
  // against the arithmetic the grid gives, and against the sentence itself.
  expect(rows[expected.index]).toBe(Math.floor(expected.index / columns));
  expect(parsed?.[2]).toBe(ORDINALS[rows[expected.index]]);

  expect(problems).toEqual([]);
});

test('the hint agrees with the wide grid too: Large is six columns, and the row follows', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const problems = trackProblems(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  // Nine pairs is the size the wide layout exists for: eighteen cards in six
  // columns is three rows, and in three columns it would be six.
  await chooseLevel(page, 'Large');
  await waitForBoard(page, 18);
  await expect(page.locator('.pb-play__level')).toHaveText('Nine pairs');
  expect((await renderedGrid(page)).columns, 'eighteen cards in six columns when there is room').toBe(6);

  const known: Known = new Map();
  await playUntil(page, known, (cards, seen) => hasSeenAndDown(cards, seen));
  const message = await readHint(page);

  const cards = await readCards(page);
  const { columns, declared, rows } = await renderedGrid(page);
  expect(declared).toBe(columns);

  const expected = cards.find((card) => card.face === 'down' && known.has(card.index));
  if (!expected) throw new Error('there should be a seen card face down to hint about');

  const parsed = message.match(HINT_SENTENCE);
  expect(parsed, `the sentence has to say what and where: "${message}"`).not.toBeNull();
  expect([...known.values()]).toContain(parsed?.[1]);
  expect(parsed?.[1]).toBe(known.get(expected.index));
  expect(rows[expected.index]).toBe(Math.floor(expected.index / columns));
  expect(parsed?.[2]).toBe(ORDINALS[rows[expected.index]]);

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 7. the end of a round
// ---------------------------------------------------------------------------

test('the win panel takes focus, keeps Tab inside it, ignores Escape and says what happened', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  await playUntil(page, new Map(), (cards) => isSolved(cards));
  await expect(page.locator('.pb-win')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.pb-memory__count')).toHaveText('6 of 6 kept');

  // The house style: the card is the dialog's focus target and is `tabindex=-1`,
  // so Tab from it starts at the first button.
  await expect(page.locator('.pb-win__card')).toBeFocused();

  const where = () =>
    page.evaluate(() => {
      const active = document.activeElement;
      if (!active || active === document.body) return 'freed';
      return active.closest('.pb-win') ? 'dialog' : 'behind';
    });

  for (let count = 1; count <= 4; count += 1) {
    await page.keyboard.press('Tab');
    expect(await where(), `Tab ${count} must stay in the panel`).toBe('dialog');
  }

  // No Escape handler, on purpose: a finished round has no "cancel", and a child
  // who pressed the key to shut a menu would lose the one moment it built to.
  await page.keyboard.press('Escape');
  await expect(page.locator('.pb-win')).toBeVisible();
  await expect(page.locator('.pb-memory')).toHaveClass(/is-solved/);

  // The three facts, and they are sentences rather than a score. A round solved
  // by turning over unknown cards always misses at least once, so the third
  // sentence is the pair that kept meeting.
  await expect(page.locator('.pb-win__title')).toHaveText('All six pairs');
  const lines = page.locator('.pb-memory__recap li');
  await expect(lines).toHaveCount(3);
  const recap = await lines.allInnerTexts();
  expect(recap[0]).toMatch(/^You found them in (one|[a-z]+) turns?\.$/);
  expect(recap[1]).toMatch(/^Your best run was (one|[a-z]+) pairs? without a miss\.$/);
  expect(recap[2]).toMatch(
    /^The [a-z' -]+ and the [a-z' -]+ met (once|twice|[a-z]+ times) before you kept them apart\.$/,
  );
  await expect(page.locator('.pb-win__sub')).toContainText('Found in');

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 8. the smallest phone, and the biggest board
// ---------------------------------------------------------------------------

test('a 320px phone fits the board, and the Large board keeps a fingertip target', async ({ page }) => {
  const problems = trackProblems(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/play/memory-garden');
  await waitForBoard(page);

  const pageWidth = () =>
    page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));

  const smallestEdge = async () => {
    const boxes = await page
      .locator(CARD)
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
    return Math.min(...boxes.map((box) => Math.min(box.width, box.height)));
  };

  let width = await pageWidth();
  expect(width.scroll, 'the page must not scroll sideways').toBeLessThanOrEqual(width.inner);

  const smallSmallest = await smallestEdge();
  console.log(`320px, six pairs: smallest card edge ${smallSmallest.toFixed(1)}px`);
  expect(smallSmallest, 'a card below 60px is not a finger target').toBeGreaterThanOrEqual(60);

  // Eighteen cards is the worst case: half again as many, same width.
  await chooseLevel(page, 'Large');
  await waitForBoard(page, 18);
  expect((await renderedGrid(page)).columns, 'nine pairs stay in three columns on a phone').toBe(3);

  width = await pageWidth();
  expect(width.scroll, 'the Large board must not scroll sideways either').toBeLessThanOrEqual(width.inner);
  const largeSmallest = await smallestEdge();
  console.log(`320px, nine pairs: smallest card edge ${largeSmallest.toFixed(1)}px`);
  expect(largeSmallest, 'eighteen cards must not shrink below a fingertip').toBeGreaterThanOrEqual(60);

  expect(problems).toEqual([]);
});

// ---------------------------------------------------------------------------
// 9. four games, one document
// ---------------------------------------------------------------------------

test('the games can be visited in one session without sharing styles', async ({ page }) => {
  test.setTimeout(180_000);
  const problems = trackProblems(page);
  await page.goto('/play/memory-garden');
  await waitForBoard(page);
  // A round in progress, so the board that comes back has to be the same one.
  await playUntil(page, new Map(), midRound);

  const coldFirst = await page.locator(CARD).first().boundingBox();
  const coldLabels = await page
    .locator(CARD)
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
  if (!coldFirst) throw new Error('the cold board has no box');

  await page.getByRole('button', { name: 'Back to the garden' }).click();
  await page.locator('.pb-card--ready[href="/play/tangram/"]').click();
  await page.locator('.pb-tangram-board').waitFor({ timeout: 20_000 });
  await expect(page.locator('.pb-memory')).toHaveCount(0);
  await expect(page.locator(CARD)).toHaveCount(0);

  await page.getByRole('button', { name: 'Back to the garden' }).click();
  await page.locator('.pb-card--ready[href="/play/nonogram/"]').click();
  await page.locator('.pb-nono-cell').first().waitFor({ timeout: 20_000 });
  await expect(page.locator('.pb-memory')).toHaveCount(0);
  await expect(page.locator('.pb-tangram-board')).toHaveCount(0);

  await page.getByRole('button', { name: 'Back to the garden' }).click();
  await page.locator('.pb-card--ready[href="/play/memory-garden/"]').click();
  await waitForBoard(page);

  // Nothing of the other two games is left in the document…
  await expect(page.locator('.pb-nono')).toHaveCount(0);
  await expect(page.locator('.pb-tangram')).toHaveCount(0);
  await expect(page.locator('.pb-tangram-board')).toHaveCount(0);

  // …and the grid measures exactly what it measured cold, after two other
  // stylesheets have been in the same document. A shared `.pb-play` or `.pb-tool`
  // rule leaking across is what this catches.
  expect(await page.locator(CARD).first().boundingBox()).toEqual(coldFirst);
  const back = await renderedGrid(page);
  expect(back.declared).toBe(back.columns);
  expect(
    await page.locator(CARD).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label'))),
    'the board should come back as the one that was left',
  ).toEqual(coldLabels);

  expect(problems).toEqual([]);
});
