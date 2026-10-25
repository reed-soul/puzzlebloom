import { describe, expect, it } from 'vitest';
import { CARD_FIGURE } from '../src/card';
import { figureById, polygonPoints } from '../src/index';

/**
 * The card on the front page is not allowed to advertise a figure the game does
 * not ship.
 *
 * It did once: the card kept its own copy of the house's coordinates, the house
 * left the library, and the card went on drawing it under the word "Ready".
 * Copying a new set of numbers across fixes that for a day. This test fixes it
 * for good, by deriving the seven polygons from the figure itself and comparing
 * them to the strings the page draws.
 */
describe('the card art', () => {
  it('draws a figure that exists', () => {
    const figure = figureById(CARD_FIGURE.id);
    expect(figure, `no figure with id "${CARD_FIGURE.id}" in the library`).not.toBeNull();
  });

  it('draws that figure exactly, piece for piece', () => {
    const figure = figureById(CARD_FIGURE.id);
    if (!figure) return;

    // Sorted, because the order of the pieces on the card is a presentation
    // choice and the order inside one `points` attribute is the engine's; what
    // has to match is the set of polygons drawn.
    const drawn = figure.pieces.map(polygonPoints).sort();
    const card = [...CARD_FIGURE.polygons].sort();

    expect(
      card,
      `the card and figure "${figure.id}" disagree.\ncard:\n${card.join('\n')}\nengine:\n${drawn.join('\n')}`,
    ).toEqual(drawn);
  });

  it('draws all seven pieces, so the card is a figure and not a fragment', () => {
    // Seven, not "at least one": a card showing six of the seven pieces would
    // be a picture no player can build, which is the same broken promise in a
    // quieter form.
    expect(CARD_FIGURE.polygons).toHaveLength(7);
  });
});
