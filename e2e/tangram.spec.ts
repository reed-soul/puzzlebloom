import { expect, type Page, test } from '@playwright/test';
import { trackProblems, waitForBoard } from './helpers';

/**
 * Tangram, played rather than inspected.
 *
 * The engine has its own tests for whether the judge tells the truth and
 * whether the keyboard rule lets a piece leave a corner. What can only be
 * checked here is the seam: that a board arrives, that a piece dropped near the
 * right place clicks into it, that a piece dropped in open space does not, that
 * turning and mirroring really transform the polygon, that a drag is one undo
 * step, that the first figure can be finished with nothing but Tab, arrows, R
 * and F, that a half-finished board survives a reload, that the win panel holds
 * focus, that the board fits a 320px phone, and that the three games can share
 * one document without sharing styles.
 *
 * Two rules this file follows on purpose:
 *
 * 1. No import from `@puzzlebloom/tangram-engine`. Every number below is read
 *    out of the rendered DOM — the silhouette the player is looking at is the
 *    answer, and copying it from the engine would make the test agree with the
 *    code by construction.
 * 2. Nothing here depends on *which* figure is dealt, how many figures there
 *    are, or what they are called beyond the one figure the game promises as
 *    its tutorial (`FIGURES[0]`, "the box they came in"). The library is
 *    expected to grow; this spec must not have to.
 */

// ---------------------------------------------------------------------------
// reading the board
// ---------------------------------------------------------------------------

interface Vert {
  x: number;
  y: number;
}

interface Shape {
  /** Absolute vertices, as drawn. */
  vertices: Vert[];
  /** Mean of the vertices, which is the centroid of every piece in the set. */
  centroid: Vert;
  area: number;
  /** Edge lengths, sorted — a rotation- and translation-free signature. */
  edges: number[];
  /** The `points` attribute as written, for before/after comparisons. */
  raw: string;
}

interface BoardState {
  pieces: Record<string, Shape>;
  silhouette: Shape[];
  /** CSS pixels per figure unit at the current size. */
  scale: number;
}

/**
 * Everything measurable about the board, in one round trip.
 *
 * Read from the SVG rather than from React state: the assertion is about what a
 * player is looking at, and a piece whose `points` did not change did not move,
 * whatever the state object says.
 */
function readBoard(page: Page): Promise<BoardState> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('.pb-tangram-board');
    if (!svg) throw new Error('there is no tangram board on this page');

    const shapeOf = (node: Element) => {
      const raw = node.getAttribute('points') ?? '';
      const vertices = raw
        .trim()
        .split(/\s+/)
        .map((pair) => {
          const [x, y] = pair.split(',').map(Number);
          return { x, y };
        });
      let twiceArea = 0;
      let weightedX = 0;
      let weightedY = 0;
      for (let index = 0; index < vertices.length; index += 1) {
        const a = vertices[index];
        const b = vertices[(index + 1) % vertices.length];
        const cross = a.x * b.y - b.x * a.y;
        twiceArea += cross;
        weightedX += (a.x + b.x) * cross;
        weightedY += (a.y + b.y) * cross;
      }
      const edges = vertices
        .map((a, index) => {
          const b = vertices[(index + 1) % vertices.length];
          return Math.hypot(b.x - a.x, b.y - a.y);
        })
        .sort((left, right) => left - right);
      return {
        raw,
        vertices,
        edges,
        area: Math.abs(twiceArea) / 2,
        centroid:
          twiceArea === 0
            ? { x: 0, y: 0 }
            : { x: weightedX / (3 * twiceArea), y: weightedY / (3 * twiceArea) },
      };
    };

    const pieces: Record<string, unknown> = {};
    for (const node of svg.querySelectorAll('.pb-tangram__piece')) {
      pieces[node.getAttribute('data-piece') ?? '?'] = shapeOf(node);
    }
    const silhouette = Array.from(svg.querySelectorAll('.pb-tangram__silhouette polygon')).map(shapeOf);
    const matrix = svg.getScreenCTM();
    return {
      pieces: pieces as Record<string, Shape>,
      silhouette,
      scale: matrix ? Math.hypot(matrix.a, matrix.b) : 0,
    };
  }) as Promise<BoardState>;
}

/** Figure coordinates → viewport coordinates, using the matrix the browser computed. */
function toScreen(page: Page, points: readonly Vert[]): Promise<Vert[]> {
  return page.evaluate((list) => {
    const svg = document.querySelector<SVGSVGElement>('.pb-tangram-board');
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) throw new Error('the board has no screen matrix');
    return list.map(({ x, y }) => {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      const screen = point.matrixTransform(matrix);
      return { x: screen.x, y: screen.y };
    });
  }, points as Vert[]);
}

/**
 * Where each piece belongs, taken from the silhouette itself.
 *
 * Matched on shape, not on position or on the order the polygons happen to be
 * in: vertex count plus sorted edge lengths is a signature that no two of the
 * seven shapes share (the square is 1,1,1,1 and the parallelogram is
 * 1,1,√2,√2; the three triangles differ in size). The two large triangles are
 * genuinely interchangeable, and so are the two small ones — the game marks a
 * board complete by coverage, so swapping them is a correct answer and this
 * matcher is free to pick either.
 */
function targetsFor(state: BoardState): Record<string, Shape> {
  const claimed = new Set<number>();
  const targets: Record<string, Shape> = {};
  for (const [id, piece] of Object.entries(state.pieces)) {
    const found = state.silhouette.findIndex((candidate, index) => {
      if (claimed.has(index)) return false;
      if (candidate.vertices.length !== piece.vertices.length) return false;
      // Five thousandths, because `points` is written to three decimals: a √2
      // edge can land on 1.414 or 1.415 depending on where the piece sits, and
      // a one-thousandth comparison would fail to recognise a piece's own hole.
      return candidate.edges.every((length, at) => Math.abs(length - piece.edges[at]) < 5e-3);
    });
    if (found === -1) throw new Error(`no silhouette polygon has the shape of ${id}`);
    claimed.add(found);
    targets[id] = state.silhouette[found];
  }
  return targets;
}

// ---------------------------------------------------------------------------
// driving the board
// ---------------------------------------------------------------------------

const board = (page: Page) => page.locator('.pb-tangram-board');
const placedCount = (page: Page) => page.locator('.pb-tangram__placed');
const piece = (page: Page, id: string) => page.locator(`.pb-tangram__piece[data-piece="${id}"]`);
const trayPiece = (page: Page) => page.locator('.pb-tangram__piece.is-tray');

/**
 * The board is behind a lazy chunk; the first paint of this route is a
 * skeleton. Waiting for the seven pieces *and* the seven silhouette polygons
 * is what proves the figure was dealt and drawn.
 */
async function waitForTangramBoard(page: Page): Promise<BoardState> {
  await expect(board(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.pb-tangram__piece')).toHaveCount(7);
  await expect(page.locator('.pb-tangram__silhouette polygon')).toHaveCount(7);
  return readBoard(page);
}

/**
 * Drag a piece by its centroid to a figure coordinate.
 *
 * Pressing the centroid is the one press that needs no offset arithmetic: the
 * centroid is inside every one of these seven convex pieces, and the game
 * carries the grab offset itself. The move is made in steps so the browser sees
 * a drag rather than a teleport — a single jump would still work, but it would
 * not exercise the pointer-move path that draws the piece under the finger.
 */
async function dragCentroidTo(page: Page, id: string, target: Vert, state?: BoardState): Promise<void> {
  const current = state ?? (await readBoard(page));
  const from = current.pieces[id].centroid;
  const [start, end] = await toScreen(page, [from, target]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(start.x + ((end.x - start.x) * step) / 6, start.y + ((end.y - start.y) * step) / 6);
  }
  await page.mouse.up();
}

/** The shape a piece's vertices describe, with the translation taken out. */
function shapeUpToTranslation(shape: Shape): Vert[] {
  return shape.vertices
    .map((vertex) => ({ x: vertex.x - shape.centroid.x, y: vertex.y - shape.centroid.y }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
}

function sameOrientation(actual: Shape, target: Shape, tolerance = 1e-2): boolean {
  const left = shapeUpToTranslation(actual);
  const right = shapeUpToTranslation(target);
  if (left.length !== right.length) return false;
  return left.every(
    (vertex, index) =>
      Math.abs(vertex.x - right[index].x) <= tolerance && Math.abs(vertex.y - right[index].y) <= tolerance,
  );
}

/**
 * Assert two polygons are the same set of vertices, whatever order they are
 * drawn in.
 *
 * Order is not the claim: `fromPolygon` recovers a rotation and a mirror from a
 * vertex *set*, so a transform is allowed to renumber them. Matching each
 * expected corner to an unused drawn one is the question actually being asked.
 */
function expectSameVertices(actual: readonly Vert[], expected: readonly Vert[], what: string): void {
  expect(actual.length, `${what}: corner count`).toBe(expected.length);
  const spare = [...actual];
  for (const wanted of expected) {
    const at = spare.findIndex(
      (candidate) => Math.abs(candidate.x - wanted.x) <= 5e-3 && Math.abs(candidate.y - wanted.y) <= 5e-3,
    );
    expect(at, `${what}: no drawn corner at (${wanted.x.toFixed(3)}, ${wanted.y.toFixed(3)})`).not.toBe(-1);
    spare.splice(at, 1);
  }
}

/**
 * Finish the dealt figure with nothing but the keyboard.
 *
 * The strategy is a child's, not a solver's: Tab to a piece, press R until the
 * piece faces the way the hole does, then walk it in with arrows — coarse
 * (Shift) while there is a long way to go, fine when close — re-reading the
 * board after every press so a snap that moved the piece somewhere unexpected
 * is corrected rather than compounded.
 *
 * Orientation is found by trial, not by calculation: the target is the vertex
 * set of the silhouette polygon the piece has to fill, and both are compared
 * with the translation removed. That is 16 possible states (8 turns × mirrored
 * or not), so the search is bounded and exhaustive — no geometry is re-derived
 * here, and no engine code is imported.
 */
async function finishWithKeyboard(page: Page): Promise<{ presses: number; tabs: number; elapsedMs: number }> {
  const started = Date.now();
  const initial = await readBoard(page);
  const targets = targetsFor(initial);

  let tabs = 0;
  for (let press = 0; press < 40; press += 1) {
    const onPiece = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset?.piece ?? null,
    );
    if (onPiece) break;
    await page.keyboard.press('Tab');
    tabs += 1;
  }

  let presses = 0;
  const order = Object.keys(initial.pieces);
  for (const [index, id] of order.entries()) {
    // The polygons are tabbed in document order, which is the order they are
    // listed here, so one Tab per piece is all the navigation this needs.
    if (index > 0) {
      await page.keyboard.press('Tab');
      tabs += 1;
    }
    const focused = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset?.piece ?? null,
    );
    expect(focused, `Tab should have reached ${id}`).toBe(id);

    const target = targets[id];
    const faces = async () => sameOrientation((await readBoard(page)).pieces[id], target);
    let oriented = await faces();
    for (let turn = 0; turn < 8 && !oriented; turn += 1) {
      await page.keyboard.press('r');
      presses += 1;
      oriented = await faces();
    }
    if (!oriented) {
      // Eight turns come back to the start, so the only states left are the
      // mirrored ones.
      await page.keyboard.press('f');
      presses += 1;
      for (let turn = 0; turn < 8 && !oriented; turn += 1) {
        await page.keyboard.press('r');
        presses += 1;
        oriented = await faces();
      }
    }
    expect(oriented, `${id} should reach the orientation of its hole`).toBe(true);

    let settled = false;
    for (let step = 0; step < 400; step += 1) {
      const here = (await readBoard(page)).pieces[id].centroid;
      const dx = target.centroid.x - here.x;
      const dy = target.centroid.y - here.y;
      if (Math.abs(dx) <= 0.03 && Math.abs(dy) <= 0.03) {
        settled = true;
        break;
      }
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const delta = horizontal ? dx : dy;
      const arrow = horizontal
        ? delta > 0
          ? 'ArrowRight'
          : 'ArrowLeft'
        : delta > 0
          ? 'ArrowDown'
          : 'ArrowUp';
      await page.keyboard.press(Math.abs(delta) >= 0.5 ? `Shift+${arrow}` : arrow);
      presses += 1;
    }
    expect(settled, `${id} should walk to its hole`).toBe(true);
  }

  return { presses, tabs, elapsedMs: Date.now() - started };
}

// ---------------------------------------------------------------------------
// the tests
// ---------------------------------------------------------------------------

test.describe('tangram', () => {
  test('a board arrives with seven pieces in the tray, and nothing is logged', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    const state = await waitForTangramBoard(page);

    // The heading is sr-only, but it has to exist or the document has none.
    await expect(page.getByRole('heading', { name: 'Tangram for kids', level: 1 })).toHaveCount(1);

    // The board's real accessible name — an `<svg>` with no explicit role, so
    // this is also the assertion that nobody bolted a landmark onto it.
    await expect(board(page)).toHaveAttribute('aria-label', /: the shape to fill, and the seven pieces$/);
    expect(await board(page).evaluate((node) => node.tagName)).toBe('svg');

    // Seven pieces, all in the tray, each naming itself and saying where it is.
    await expect(trayPiece(page)).toHaveCount(7);
    await expect(page.locator('.pb-tangram__piece')).toHaveCount(7);
    const labels = await page
      .locator('.pb-tangram__piece')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
    expect(labels.sort()).toEqual(
      [
        'Large triangle one, in the tray',
        'Large triangle two, in the tray',
        'Medium triangle, in the tray',
        'Parallelogram, in the tray',
        'Small triangle one, in the tray',
        'Small triangle two, in the tray',
        'Square, in the tray',
      ].sort(),
    );
    // A piece is a control in a drawing, not a link: role="button" is what a
    // screen reader can actually press.
    expect(
      await page
        .locator('.pb-tangram__piece')
        .evaluateAll((nodes) => nodes.every((n) => n.getAttribute('role') === 'button')),
    ).toBe(true);

    await expect(placedCount(page)).toHaveText('0 of 7 placed');
    await expect(page.locator('.pb-win')).toHaveCount(0);

    // The seven pieces fill the same area as the hole (8 figure units), which is
    // the promise the whole game rests on. Measured from the drawing, not from
    // the engine. Two decimals, because the drawn coordinates are rounded to
    // three and seven rounded polygons do not add up to the unrounded total.
    const piecesArea = Object.values(state.pieces).reduce((total, shape) => total + shape.area, 0);
    const holeArea = state.silhouette.reduce((total, shape) => total + shape.area, 0);
    expect(piecesArea).toBeCloseTo(8, 2);
    expect(holeArea).toBeCloseTo(piecesArea, 2);

    // Every piece starts inside the tray band, which is the only thing a player
    // can pick up.
    const tray = await page.locator('.pb-tangram__tray').boundingBox();
    if (!tray) throw new Error('the tray has no box');
    for (const id of Object.keys(state.pieces)) {
      const box = await piece(page, id).boundingBox();
      if (!box) throw new Error(`${id} has no box`);
      const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      expect(centre.y, `${id} should start in the tray`).toBeGreaterThan(tray.y);
    }

    expect(problems).toEqual([]);
  });

  test('a piece dropped near its hole clicks in; a piece dropped in open space stays put', async ({
    page,
  }) => {
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    const state = await waitForTangramBoard(page);
    const targets = targetsFor(state);

    // The square: the piece whose home is least ambiguous, and the one whose
    // target is not on the outline.
    const id = 'square';
    const home = state.pieces[id].centroid;
    const hole = targets[id].centroid;

    // Somewhere with no corner within reach: up and to the left of the
    // silhouette, well outside the tray.
    const lonely = { x: hole.x - 0.9, y: hole.y - 0.9 };
    await dragCentroidTo(page, id, lonely, state);
    const dropped = (await readBoard(page)).pieces[id].centroid;
    expect(dropped.x, 'a piece dropped in open space must not be snapped').toBeCloseTo(lonely.x, 1);
    expect(dropped.y).toBeCloseTo(lonely.y, 1);
    // It is off the tray, so it counts as placed — but it is not in the hole.
    await expect(placedCount(page)).toHaveText('1 of 7 placed');

    // One undo puts it back, which is also the only way back to a clean board
    // without a second drag.
    await page.getByRole('button', { name: 'Undo' }).click();
    const restored = (await readBoard(page)).pieces[id].centroid;
    expect(restored.x).toBeCloseTo(home.x, 3);
    expect(restored.y).toBeCloseTo(home.y, 3);
    await expect(placedCount(page)).toHaveText('0 of 7 placed');

    // Turn it to face its hole first.
    //
    // A piece snaps corner onto corner, and in this figure the square's hole is
    // turned forty-five degrees from the way the square rests in the tray. Left
    // unturned there is no corner for its corners to meet, so nothing snaps —
    // and an assertion written without this step measures how finely the
    // pointer can be rounded rather than whether snapping works. That is not
    // hypothetical: it passed at a desktop width, where a pixel is worth a
    // fraction of a figure unit, and failed on a phone, where a pixel is worth
    // three times as much.
    const [tap] = await toScreen(page, [home]);
    await page.mouse.click(tap.x, tap.y);
    for (let turns = 0; turns < 8; turns += 1) {
      if (sameOrientation((await readBoard(page)).pieces[id], targets[id])) break;
      await page.keyboard.press('r');
    }
    expect(
      sameOrientation((await readBoard(page)).pieces[id], targets[id]),
      'the square has to be turned to match its hole before there is anything to snap to',
    ).toBe(true);

    // Now the same drag, aimed at the hole. Snapping is what has to do the work
    // here: the pointer lands on the centroid, not on a corner, and the corners
    // are what pull it home — exactly home, not merely near.
    await dragCentroidTo(page, id, hole);
    const seated = (await readBoard(page)).pieces[id].centroid;
    expect(seated.x, 'the piece should have snapped into its hole').toBeCloseTo(hole.x, 3);
    expect(seated.y).toBeCloseTo(hole.y, 3);
    await expect(placedCount(page)).toHaveText('1 of 7 placed');
    // Seated, not merely near: the piece is no longer flagged as tray stock.
    await expect(piece(page, id)).not.toHaveClass(/is-tray/);

    expect(problems).toEqual([]);
  });

  test('turn and mirror really transform the polygon', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    const state = await waitForTangramBoard(page);

    // The parallelogram: the only piece that a mirror visibly changes, and
    // therefore the only one where an assertion about Flip can fail.
    const id = 'parallelogram';
    // A tap, not a drag: press and release without moving, which selects the
    // piece and records no undo step.
    const centre = state.pieces[id].centroid;
    const [at] = await toScreen(page, [centre]);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect(piece(page, id)).toHaveClass(/is-selected/);

    const turned = page.getByRole('button', { name: /forty-five degrees$/ });
    const mirrored = page.getByRole('button', { name: 'Mirror the selected piece' });

    // Turn: one eighth of a turn about the centroid. Checked as a real 45°
    // rotation of the drawn vertices — reading `aria-pressed` or a class would
    // only prove the button was pressed.
    const before = (await readBoard(page)).pieces[id];
    await turned.click();
    const after = (await readBoard(page)).pieces[id];
    expect(after.raw, 'Turn must change the drawn polygon').not.toBe(before.raw);
    expect(after.centroid.x, 'a turn must not move the piece').toBeCloseTo(before.centroid.x, 2);
    expect(after.centroid.y).toBeCloseTo(before.centroid.y, 2);
    expect(after.area, 'a turn must not resize the piece').toBeCloseTo(before.area, 3);

    const angle = Math.PI / 4;
    const expected = before.vertices.map((vertex) => {
      const dx = vertex.x - before.centroid.x;
      const dy = vertex.y - before.centroid.y;
      return {
        x: before.centroid.x + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: before.centroid.y + dx * Math.sin(angle) + dy * Math.cos(angle),
      };
    });
    expectSameVertices(after.vertices, expected, 'one eighth of a turn');

    // Mirror: an involution about the centroid, and it must actually move the
    // vertices of a parallelogram.
    const beforeFlip = (await readBoard(page)).pieces[id];
    await mirrored.click();
    const flipped = (await readBoard(page)).pieces[id];
    expect(flipped.raw, 'Flip must change the drawn polygon').not.toBe(beforeFlip.raw);
    expect(flipped.centroid.x, 'a mirror must not move the piece').toBeCloseTo(beforeFlip.centroid.x, 2);
    expect(flipped.area, 'a mirror must not resize the piece').toBeCloseTo(beforeFlip.area, 3);

    // Twice is the identity. That pins the mirror to the piece's own axis
    // rather than to the screen: a mirror across the vertical would also look
    // like a mirror, but it would not be its own inverse in this frame.
    await mirrored.click();
    const twice = (await readBoard(page)).pieces[id];
    expectSameVertices(twice.vertices, beforeFlip.vertices, 'a mirrored mirror');

    // And undo walks the three transforms back one at a time. A transform is
    // recorded before it is applied, so one press takes the second flip back and
    // leaves the turn and the first flip alone.
    await page.getByRole('button', { name: 'Undo' }).click();
    const onceUndone = (await readBoard(page)).pieces[id];
    expectSameVertices(onceUndone.vertices, flipped.vertices, 'one undo takes back the second mirror');
    await page.getByRole('button', { name: 'Undo' }).click();
    const twiceUndone = (await readBoard(page)).pieces[id];
    expectSameVertices(
      twiceUndone.vertices,
      beforeFlip.vertices,
      'the second undo takes back the first mirror',
    );
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();

    expect(problems).toEqual([]);
  });

  test('one drag is one undo, and undo goes back to the tray', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    const state = await waitForTangramBoard(page);
    const targets = targetsFor(state);

    const id = 'medium';
    const home = state.pieces[id].centroid;
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();

    await dragCentroidTo(page, id, targets[id].centroid, state);
    await expect(placedCount(page)).toHaveText('1 of 7 placed');
    await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();

    // One press of Undo, and the piece is where it started — the tray home it
    // was dealt to, not the last point the pointer passed through on the way.
    await page.getByRole('button', { name: 'Undo' }).click();
    const back = (await readBoard(page)).pieces[id].centroid;
    expect(back.x, 'undo should return the piece to the tray, not to mid-drag').toBeCloseTo(home.x, 3);
    expect(back.y).toBeCloseTo(home.y, 3);
    await expect(placedCount(page)).toHaveText('0 of 7 placed');
    await expect(piece(page, id)).toHaveClass(/is-tray/);
    // One drag, one step: there is nothing left to undo.
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();

    expect(problems).toEqual([]);
  });

  test('the first figure can be finished from the keyboard alone', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    await waitForTangramBoard(page);

    const effort = await finishWithKeyboard(page);
    console.log(
      `keyboard solve: ${effort.presses} arrow/turn presses, ${effort.tabs} tabs, ${effort.elapsedMs}ms`,
    );

    await expect(page.locator('.pb-win')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#pb-tangram-win-title')).toContainText(/appeared$/);
    // The whole board is complete, not merely "no piece is in the tray": the
    // pieces have taken their seven colours, which only `is-solved` does.
    await expect(page.locator('.pb-tangram')).toHaveClass(/is-solved/);
    await expect(placedCount(page)).toHaveText('7 of 7 placed');

    // A slow but correct solve is a product fact, not a test tolerance. The
    // engine's own scripted player needs well under 200 presses; a real player
    // needs more, so this is a ceiling on absurdity, not a benchmark.
    expect(effort.presses, 'finishing the box should not take hundreds of presses').toBeLessThan(400);
    expect(effort.elapsedMs, 'finishing the box should not take half a minute').toBeLessThan(30_000);

    expect(problems).toEqual([]);
  });

  test('a placed piece survives a reload', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    const state = await waitForTangramBoard(page);
    const targets = targetsFor(state);

    const id = 'large-1';
    await dragCentroidTo(page, id, targets[id].centroid, state);
    await expect(placedCount(page)).toHaveText('1 of 7 placed');
    const seated = (await readBoard(page)).pieces[id].centroid;

    await page.reload();
    const restored = await waitForTangramBoard(page);
    await expect(placedCount(page)).toHaveText('1 of 7 placed');
    expect(restored.pieces[id].centroid.x, 'the placed piece should come back').toBeCloseTo(seated.x, 2);
    expect(restored.pieces[id].centroid.y).toBeCloseTo(seated.y, 2);
    // Restored, not replayed: the other six are still in the tray.
    await expect(trayPiece(page)).toHaveCount(6);

    expect(problems).toEqual([]);
  });

  test('the win panel takes focus, keeps Tab inside it, and does not close on Escape', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    await waitForTangramBoard(page);
    await finishWithKeyboard(page);
    await expect(page.locator('.pb-win')).toBeVisible({ timeout: 15_000 });

    // The house style: the card is the dialog's focus target, and it is
    // `tabindex="-1"`, so Tab from it starts at the first button.
    await expect(page.locator('.pb-win__card')).toBeFocused();

    const inDialog = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body) return 'freed';
        return active.closest('.pb-win') ? 'dialog' : 'behind';
      });

    for (let press = 1; press <= 6; press += 1) {
      await page.keyboard.press('Tab');
      expect(await inDialog(), `Tab ${press} must stay in the panel`).toBe('dialog');
    }
    for (let press = 1; press <= 3; press += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await inDialog(), `Shift+Tab ${press} must stay in the panel`).toBe('dialog');
    }

    // Escape is deliberately not a close: a finished figure has no "cancel",
    // and a child who pressed the key to shut a menu would lose the one moment
    // the game was building towards. This asserts the decision, so that a later
    // "add Escape to all dialogs" change has to argue with a test.
    await page.keyboard.press('Escape');
    await expect(page.locator('.pb-win')).toBeVisible();
    await expect(page.locator('.pb-tangram')).toHaveClass(/is-solved/);

    expect(problems).toEqual([]);
  });

  test('a 320px phone fits the board, the tray and the pieces', async ({ page }) => {
    const problems = trackProblems(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/play/tangram');
    const state = await waitForTangramBoard(page);

    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(widths.scroll, 'the page must not scroll sideways').toBeLessThanOrEqual(widths.inner);

    // Not merely clipped: the board and the tray are both inside the viewport.
    const boardBox = await board(page).boundingBox();
    const trayBox = await page.locator('.pb-tangram__tray').boundingBox();
    if (!boardBox || !trayBox) throw new Error('the board or the tray has no box');
    expect(boardBox.x).toBeGreaterThanOrEqual(0);
    expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(320);
    expect(trayBox.x).toBeGreaterThanOrEqual(0);
    expect(trayBox.x + trayBox.width).toBeLessThanOrEqual(320);
    expect(trayBox.y + trayBox.height, 'the tray is the only thing you can pick up').toBeLessThanOrEqual(720);

    // A small triangle's leg, in the pixels a six-year-old actually has to hit.
    // The piece is dealt at rotation 0, so its bounding box *is* its leg.
    const leg = await piece(page, 'small-1').evaluate((node) => node.getBoundingClientRect().width);
    console.log(`320px: small-triangle leg ${leg.toFixed(1)}px, ${state.scale.toFixed(1)}px per unit`);
    expect(leg, 'a small triangle below 40px is not a finger target').toBeGreaterThanOrEqual(40);

    expect(problems).toEqual([]);
  });

  test('the three games can be visited in one session without sharing styles', async ({ page }) => {
    const problems = trackProblems(page);
    await page.goto('/play/tangram');
    const cold = await waitForTangramBoard(page);
    const coldBox = await board(page).boundingBox();
    const coldFirst = await piece(page, 'large-1').boundingBox();
    if (!coldBox || !coldFirst) throw new Error('the cold board has no box');

    // Garden → nonogram → garden → sudoku → garden → tangram, all client-side.
    // All three stylesheets end up in the same document, which is the only way
    // the collision this test is about can happen at all.
    await page.getByRole('button', { name: 'Back to the garden' }).click();
    await page.locator('.pb-card--ready[href="/play/nonogram/"]').click();
    await expect(page.getByRole('grid', { name: 'Nonogram board, 5 by 5' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('.pb-tangram')).toHaveCount(0);
    await expect(page.locator('.pb-tangram-board')).toHaveCount(0);

    await page.getByRole('button', { name: 'Back to the garden' }).click();
    await page.locator('.pb-card--ready[href="/play/sudoku/"]').click();
    await waitForBoard(page);
    await expect(page.locator('.pb-nono')).toHaveCount(0);
    await expect(page.locator('.pb-tangram')).toHaveCount(0);
    // The sudoku grid still has its own nine columns while a game that redefines
    // `.pb-play` has been in the document.
    const sudokuColumns = await page
      .getByRole('grid', { name: 'Sudoku board' })
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(sudokuColumns).toBe(9);

    await page.getByRole('button', { name: 'Back to the garden' }).click();
    await page.locator('.pb-card--ready[href="/play/tangram/"]').click();
    const warm = await waitForTangramBoard(page);
    await expect(page.locator('.pb-nono')).toHaveCount(0);

    // The same board, measured the same way, after two other games' CSS has
    // been in the document. A shared `.pb-play` or `.pb-tool` rule leaking
    // across is exactly what this catches.
    expect(await board(page).boundingBox()).toEqual(coldBox);
    expect(await piece(page, 'large-1').boundingBox()).toEqual(coldFirst);
    // And the same placements, to the drawn coordinate.
    for (const id of Object.keys(cold.pieces)) {
      expect(warm.pieces[id].raw, `${id} moved between a cold and a warm load`).toBe(cold.pieces[id].raw);
    }

    expect(problems).toEqual([]);
  });
});
