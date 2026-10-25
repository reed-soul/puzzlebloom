import { expect, type Page, test } from '@playwright/test';
import {
  focusFingerprint,
  focusInside,
  solveSmallPicture,
  trackProblems,
  waitForBoard,
  waitForNonogramBoard,
} from './helpers';

/**
 * The modal-focus family.
 *
 * Both games raise two overlays that call themselves dialogs: the pause curtain
 * and the win panel. `role="dialog" aria-modal="true"` is a promise to a screen
 * reader that everything behind is inert, so focus has to actually behave that
 * way — move in on open, stay in while it is up, come back on close.
 *
 * The bug that put this file here had a specific shape: the keyboard path was
 * fine and the pointer path was not. A mouse press focuses the element it lands
 * on as the *default action of the press*, which the browser runs after the
 * event handler returns — i.e. after React has committed the dialog and run a
 * synchronous `focus()` in an effect. The call sticks, then the browser undoes
 * it a microtask later, and the dialog is left open with focus still on the
 * square underneath. `useModalFocus` therefore focuses on the next frame *and*
 * pulls strays back through a capture-phase `focusin` listener, because the two
 * input paths need different mechanisms:
 *
 *   pointer  — the browser's press-to-focus wins; the `focusin` listener pulls
 *              it back in the same task (measured: cell at +0.0ms, card at
 *              +0.2ms, first animation frame at +10ms).
 *   keyboard — nothing else moves focus, so the frame callback is what lands it
 *              (measured: frame, then card at +0.3ms).
 *
 * Neither half is decoration: removing the frame callback breaks the keyboard
 * path, removing the listener breaks the pointer path. Assert both.
 *
 * ## Tabbing is asserted on both engines, to the exact landing spot
 *
 * The hook answers every Tab press itself and moves focus with
 * `items[next].focus()`, so the order is the DOM's order and nothing else. That
 * is what makes these assertions portable: before it did, WebKit's tab order
 * sent the second Tab out of the dialog — Safari's default "press Tab to
 * highlight each item" is off, so buttons are skipped entirely (measured on a
 * two-button page: `b1 → t1 → body`, against Chromium's `b1 → b2 → t1 → a`).
 * Landing on `<body>` fires no `focusin`, so no listener could have caught it;
 * only answering the Tab press itself closes that hole.
 *
 * Only the CDP listener count is Chromium-only, and that is not a platform gap:
 * enumerating a document's event listeners is a Chromium capability.
 */

const SUDOKU_SAVE_KEY = 'pb:sudoku:save:v1';

/** The buttons of a dialog, addressed inside it: the page has its own "Back to the garden". */
const dialogButton = (page: Page, dialog: string, name: string) =>
  page.locator(dialog).getByRole('button', { name, exact: true });

/**
 * A completed grid, built from the standard `(3r + ⌊r/3⌋ + c) mod 9` pattern.
 * Valid by construction: every row, column and box is a permutation of 1–9.
 */
function solvedGrid(): number[] {
  const grid: number[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      grid.push(((row * 3 + Math.floor(row / 3) + col) % 9) + 1);
    }
  }
  return grid;
}

const boardText = (cells: readonly number[]): string =>
  cells.map((value) => (value === 0 ? '.' : String(value))).join('');

/**
 * A save with exactly one square left, so a single real click can win.
 *
 * The cheapest honest route to the sudoku win panel: no engine import, no
 * `page.evaluate` poking React state — the same localStorage record the game
 * itself writes, loaded through its own `decode` on boot. `decode` validates it
 * (complete solution, givens agreeing with it), so if this record is ever wrong
 * the app deals a fresh board and the given-count assertion fails loudly
 * instead of the test quietly measuring a different board.
 */
const LAST_CELL = 80;

function almostFinishedSave(): string {
  const solution = solvedGrid();
  const puzzle = solution.map((value, index) => (index === LAST_CELL ? 0 : value));
  return JSON.stringify({
    v: 2,
    difficulty: 'easy',
    seed: null,
    daily: null,
    puzzle: boardText(puzzle),
    solution: boardText(solution),
    values: boardText(puzzle),
    notes: '',
    eliminated: '',
    elapsedMs: 1200,
    hintsUsed: 0,
    mistakesMade: 0,
    ts: 0,
  });
}

/** Load a sudoku board that is one click from finished. Returns the digit to place. */
async function loadAlmostFinishedSudoku(page: Page): Promise<number> {
  const raw = almostFinishedSave();
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [SUDOKU_SAVE_KEY, raw] as const,
  );
  await page.goto('/play/sudoku');
  await waitForBoard(page);
  // 80 givens means the injected record was accepted. A fresh board has 20–60,
  // and every coordinate in this test would then be measuring the wrong board.
  await expect(page.locator('.pb-cell.is-given')).toHaveCount(80);
  return solvedGrid()[LAST_CELL];
}

/** Win a sudoku game with two real presses: the square, then the digit. */
async function winSudokuWithMouse(page: Page): Promise<void> {
  const lastDigit = await loadAlmostFinishedSudoku(page);
  await page.locator('.pb-cell').nth(LAST_CELL).click();
  await page.getByRole('button', { name: new RegExp(`^Place ${lastDigit},`) }).click();
  await expect(page.locator('.pb-win')).toBeVisible();
}

/** The pause toggle: last button in the bar, because its name flips to "Resume". */
const pauseButton = (page: Page) => page.locator('.pb-play__bar button').last();

/**
 * Where focus is, in the only three categories a dialog cares about.
 *
 * `freed` is separate from `behind` on purpose: `<body>` means focus is nowhere
 * at all, which is not the same failure as a screen reader landing on the board
 * underneath — but neither belongs in a modal, so most assertions here demand
 * `dialog` outright.
 */
function focusWhere(page: Page, dialog: string): Promise<'dialog' | 'freed' | 'behind'> {
  return page.evaluate((selector) => {
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) return 'freed';
    return active.closest(selector) ? 'dialog' : 'behind';
  }, dialog);
}

test.describe('the win panel takes focus: nonogram', () => {
  test('a mouse solve hands focus to the panel', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    // Twelve real presses. The last one is the regression: it focuses its own
    // square *after* React has committed the dialog.
    await solveSmallPicture(page);
    await expect(page.locator('.pb-win')).toBeVisible();

    await expect(page.locator('.pb-win__card')).toBeFocused();
    expect(problems).toEqual([]);
  });

  test('Tab walks the panel in order and wraps, on every engine', async ({ page }) => {
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);
    await solveSmallPicture(page);

    const first = dialogButton(page, '.pb-win', 'Another one');
    const last = dialogButton(page, '.pb-win', 'Back to the garden');
    await expect(page.locator('.pb-win button')).toHaveCount(2);

    // Opening state: the card itself holds focus, and it is not in the list.
    await expect(page.locator('.pb-win__card')).toBeFocused();

    // Forward, including the wrap from the last button back to the first.
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(last).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();

    // Backwards, including the wrap from the first back to the last.
    await page.keyboard.press('Shift+Tab');
    await expect(last).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(last).toBeFocused();

    // From the card again, Shift+Tab goes to the end of the list — the same
    // place a forward Tab from the last button lands. Focusing the card is not a
    // user action: it restores the state the dialog opens in.
    await page.locator('.pb-win__card').focus();
    await page.keyboard.press('Shift+Tab');
    await expect(last).toBeFocused();
  });

  test('Tab can never take focus out of the panel', async ({ page }) => {
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);
    await solveSmallPicture(page);

    // More presses than the panel has tab stops, in both directions. The point
    // is not the order — the test above owns that — but that there is no
    // reachable state in which focus is anywhere but inside the dialog.
    for (let press = 1; press <= 12; press++) {
      await page.keyboard.press('Tab');
      expect(await focusWhere(page, '.pb-win'), `Tab ${press}`).toBe('dialog');
    }
    for (let press = 1; press <= 6; press++) {
      await page.keyboard.press('Shift+Tab');
      expect(await focusWhere(page, '.pb-win'), `Shift+Tab ${press}`).toBe('dialog');
    }
  });
});

test.describe('the win panel takes focus: sudoku', () => {
  test('a mouse solve hands focus to the panel', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/sudoku');
    await waitForBoard(page);
    await winSudokuWithMouse(page);

    // New behaviour: this panel never used to move focus at all, and the press
    // that wins is on the keypad — i.e. outside the dialog that appears.
    await expect(page.locator('.pb-win__card')).toBeFocused();

    for (let press = 1; press <= 6; press++) {
      await page.keyboard.press('Tab');
      expect(await focusWhere(page, '.pb-win'), `Tab ${press}`).toBe('dialog');
    }

    expect(problems).toEqual([]);
  });

  test('Tab walks the panel in order and wraps', async ({ page }) => {
    await page.goto('/play/sudoku');
    await waitForBoard(page);
    await winSudokuWithMouse(page);

    const first = dialogButton(page, '.pb-win', 'Another one');
    const last = dialogButton(page, '.pb-win', 'Back to the garden');

    // Precondition, not decoration: the trap answers keydowns that reach the
    // container, and the container is focused on the next frame. Pressing Tab
    // before that frame goes to whoever still has focus (the keypad), where
    // this dialog has no listener — the browser's own tab order applies. A
    // person cannot hit that window; a script can, so wait for the frame.
    await expect(page.locator('.pb-win__card')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(last).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(first).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(last).toBeFocused();
  });
});

test.describe('the pause curtain is a dialog too', () => {
  test('nonogram: it declares itself modal, takes focus, and keeps Tab on the only button', async ({
    page,
  }) => {
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    const pause = pauseButton(page);
    await expect(pause).toHaveAttribute('aria-label', 'Pause');
    await pause.click();

    // The decision the lead signed off: a trap that is real must say so, or a
    // screen reader has to assume the board behind is still browsable.
    const curtain = page.getByRole('dialog', { name: 'Paused' });
    await expect(curtain).toHaveAttribute('aria-modal', 'true');
    await expect(curtain).toBeFocused();

    // One item, so both directions have to stay on it: a wrap of one is itself.
    const carryOn = dialogButton(page, '.pb-curtain', 'Carry on');
    await page.keyboard.press('Tab');
    await expect(carryOn).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(carryOn).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(carryOn).toBeFocused();
  });

  test('sudoku: same curtain, same contract', async ({ page }) => {
    await page.goto('/play/sudoku');
    await waitForBoard(page);

    const pause = pauseButton(page);
    await expect(pause).toHaveAttribute('aria-label', 'Pause');
    await pause.click();

    const curtain = page.getByRole('dialog', { name: 'Paused' });
    await expect(curtain).toHaveAttribute('aria-modal', 'true');
    await expect(curtain).toBeFocused();

    const carryOn = dialogButton(page, '.pb-curtain', 'Carry on');
    await page.keyboard.press('Tab');
    await expect(carryOn).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(carryOn).toBeFocused();
  });

  test('Carry on gives focus back to the button that opened the curtain', async ({ page }) => {
    // This is the WebKit failure that drove the deferred hand-back: removing the
    // focused button triggers the browser's own focus repair, which runs after
    // a synchronous `focus()` and wins in WebKit, leaving the user on <body>.
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    // Focused by script rather than by a press, so that this test measures the
    // hook and nothing else. A *mouse* press on this button is a different story
    // on WebKit — the press lands on the icon's `<svg>`, WebKit does not walk up
    // to the button, so the button never takes focus and there is no opener to
    // give back. That is a browser behaviour, reported as a platform note rather
    // than asserted here; Chromium does focus the button and the hand-back works.
    const pause = pauseButton(page);
    await pause.focus();
    await page.keyboard.press('Enter');

    // Wait for the opening frame: the trap listens on the container, and until
    // the container has focus a Tab goes to whoever does.
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeFocused();

    // Enter, not a click: this is the keyboard path a child with no mouse takes,
    // and the one where the pressed element and the focused element are the same.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('.pb-curtain')).toHaveCount(0);

    await expect(pause).toBeFocused();
    await expect(pause).toHaveAttribute('aria-label', 'Pause');
  });
});

test.describe('closing a dialog lets go of the keyboard', () => {
  test('nonogram: focus comes back after a win, then after two curtain cycles', async ({ page }) => {
    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);
    await solveSmallPicture(page);

    await page.getByRole('button', { name: 'Another one' }).click();
    await expect(page.locator('.pb-win')).toHaveCount(0);

    // The hook hands focus back to whatever opened the dialog. It has to be a
    // square and not the top of the document: "Another one" rebuilds the board
    // underneath, so the opener may not have survived, and the code checks.
    // Polled, because the hand-back is deliberately one frame late — the browser
    // repairs focus after the removal, and the call has to come after that.
    await expect
      .poll(() => focusInside(page, '.pb-nono-board'), { message: 'focus should come back to the board' })
      .toBe(true);

    // Two complete open/close cycles afterwards. A hand-back frame can only be
    // swallowed by the cancel logic, and the symptom is a *later* close that
    // restores nothing — so the second round is the one that would catch it.
    // Driven from the keyboard, and with the button focused by script, so the
    // opener is unambiguous on both engines (see the note in the test above
    // about a mouse press landing on the icon's `<svg>` in WebKit).
    const pause = pauseButton(page);
    for (let round = 1; round <= 2; round++) {
      await pause.focus();
      await page.keyboard.press('Enter');
      const curtain = page.getByRole('dialog', { name: 'Paused' });
      await expect(curtain, `round ${round}`).toBeFocused();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(page.locator('.pb-curtain'), `round ${round}`).toHaveCount(0);
      await expect(pause, `round ${round} lost the hand-back`).toBeFocused();
    }
  });

  test('nonogram: no ghost listener and nothing pulls focus back', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP can only enumerate listeners in Chromium');

    await page.goto('/play/nonogram');
    await waitForNonogramBoard(page);

    const client = await page.context().newCDPSession(page);
    const focusinListeners = async (): Promise<number> => {
      const { result } = await client.send('Runtime.evaluate', { expression: 'document' });
      if (!result.objectId) throw new Error('the document has no remote object id');
      const { listeners } = await client.send('DOMDebugger.getEventListeners', {
        objectId: result.objectId,
      });
      return listeners.filter((listener) => listener.type === 'focusin' && listener.useCapture).length;
    };

    const before = await focusinListeners();
    await solveSmallPicture(page);
    expect(await focusinListeners(), 'the dialog should install exactly one capture listener').toBe(
      before + 1,
    );

    await page.getByRole('button', { name: 'Another one' }).click();
    await expect(page.locator('.pb-win')).toHaveCount(0);

    // A listener left pointing at the detached dialog is invisible from the
    // page yet still runs on every focus change — the symptom is focus being
    // yanked back at some unrelated moment, which is exactly what this counts.
    expect(await focusinListeners(), 'the listener outlived the dialog').toBe(before);

    // And the observable version of the same claim: three presses, three
    // different elements, each a real visible thing.
    const seen = new Set<string>();
    for (let press = 1; press <= 3; press++) {
      const previous = await focusFingerprint(page);
      await page.keyboard.press('Tab');
      const current = await focusFingerprint(page);
      expect(current, `Tab ${press} did not move focus`).not.toBe(previous);
      expect(current.split('|').at(-1), `Tab ${press} landed on something with no box`).not.toBe('0x0');
      seen.add(current);
    }
    expect(seen.size, 'focus kept being pulled back to one place').toBe(3);

    await client.detach();
  });
});
