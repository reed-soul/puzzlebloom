/**
 * The nine creatures a card can show.
 *
 * The engine does not draw them and must not learn how. The drawings live in
 * `packages/ui` as React components, and an engine that imports one cannot be
 * run in a test runner without a DOM. What the engine owns is the *identity* of
 * each creature: a number to compare two cards by, and one plain-English name
 * for the two places that have to say it out loud — a card's accessible label
 * and a hint.
 *
 * The names are read off the shapes in `CreatureGlyph`, feature by feature:
 *
 *   1  two round ears at the sides of the head   the bear
 *   2  two long upright ears                     the rabbit
 *   3  one sharp spike on the crown              the horned one
 *   4  one stalk ending in a round eye           the snail
 *   5  one leaf growing out of the crown         the sprout
 *   6  three round bumps above the face          the spotted one
 *   7  two small pointed ears                    the cat
 *   8  two swept-back tufts                      the owl
 *   9  a jagged crest across the whole crown     the crowned one
 *
 * Three of the nine are named for the headgear rather than for an animal, and
 * that is a decision rather than a gap. A single spike is not enough of a
 * drawing to call that creature a unicorn — there is no mane and no muzzle —
 * and inventing an animal the shape does not support would give a child a
 * second thing to remember instead of a description of the first. "The horned
 * one" is what is actually on the card.
 */

/** 1–9, one per drawing in `CreatureGlyph`. Never a tenth: see `deal.ts`. */
export type Creature = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const CREATURES: readonly Creature[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Leading article included, because every caller puts it mid-sentence. */
const NAMES: Record<Creature, string> = {
  1: 'the bear',
  2: 'the rabbit',
  3: 'the horned one',
  4: 'the snail',
  5: 'the sprout',
  6: 'the spotted one',
  7: 'the cat',
  8: 'the owl',
  9: 'the crowned one',
};

/**
 * The name a hint and a card label both use, e.g. `the snail`.
 *
 * Anything outside 1–9 is not a creature and gets the vaguest true thing that
 * can be said about it. This is not defensive padding: `creatureName` is called
 * with whatever came out of a saved board, and a save is data from an older
 * build.
 */
export function creatureName(creature: Creature): string {
  return NAMES[creature] ?? 'the creature';
}

export function isCreature(value: unknown): value is Creature {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9;
}
