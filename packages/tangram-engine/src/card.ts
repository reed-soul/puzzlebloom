/**
 * The tangram card art for the front page.
 *
 * The home page must not pull the tangram engine in to decorate a card, and the
 * card must not keep its own copy of a figure's coordinates: this file exists
 * because the copy it used to keep stayed behind when the figure library
 * changed, and the card went on drawing a house that the game no longer had.
 *
 * So the coordinates live here, beside the figures they describe, in the only
 * form the page needs — plain strings, no imports, nothing to bundle but seven
 * short literals. `tests/card.test.ts` builds the same seven polygons from the
 * figure itself and compares them to these strings, so the two cannot drift
 * apart without a red test: change `sail` in `figures.ts` and that test says
 * so, by name, with both lists printed.
 */
export const CARD_FIGURE = {
  id: 'sail',
  /**
   * One `"x,y x,y …"` per piece, in the figure's own piece order, at the
   * precision `polygonPoints` writes — so these are the strings the board draws,
   * not a rounded-off sketch of them.
   */
  polygons: [
    '2,0 4,0 2,2',
    '2,0 2,2 0,0',
    '2,2 1,3 1,1',
    '0,1 1,1 1,2 0,2',
    '1,2 1,3 0,4 0,3',
    '0,2 1,2 0,3',
    '0,1 0,0 1,1',
  ],
} as const;
