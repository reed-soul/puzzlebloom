/**
 * Dealing a board, from a seed.
 *
 * Three constraints shape this file.
 *
 * 1. The deal is a pure function of `(pairs, seed)`. No `Math.random()`, no
 *    clock, no device. That is what lets a daily board be the same board for
 *    everyone without a server, and it is also what lets a saved game be a
 *    short record — the creatures are re-derived, never stored.
 *
 * 2. Nine pairs is the ceiling, because the garden has nine creatures and one
 *    pair is one creature twice. A larger board would have to repeat a creature
 *    four times, and that changes the game being played: "remember where the
 *    snail is" degrades into "remember which cards are the same as each other",
 *    which is a matching game, not a memory one.
 *
 * 3. The number of columns is decided here, next to the number of pairs, and not
 *    in the stylesheet. Two things need the same answer: the grid renders in
 *    that many columns, and a hint says "the second row". If the CSS picked a
 *    different count from the hint, the hint would point at the wrong row on a
 *    phone — so the count is computed once in TypeScript and handed to CSS as a
 *    custom property.
 */

import type { Board } from './board';
import type { Creature } from './creatures';

export type Level = 'small' | 'medium' | 'large';

/** Smallest first, which is also the order the size picker shows them in. */
export const LEVELS: readonly Level[] = ['small', 'medium', 'large'];

/**
 * Six pairs is twelve cards: a first game that fits on one phone screen.
 * Eight is sixteen, a full 4×4. Nine is every creature exactly once over.
 */
export const PAIRS_BY_LEVEL: Record<Level, number> = { small: 6, medium: 8, large: 9 };

export const MAX_PAIRS = 9;

export function isLevel(value: unknown): value is Level {
  return value === 'small' || value === 'medium' || value === 'large';
}

/**
 * Columns per size, as `[narrow, wide]`.
 *
 * The narrow numbers are measured against a 320px screen: three columns of a
 * twelve-card board come out around 93px a card, four columns of a sixteen-card
 * board around 68px, and both clear the 64px floor that keeps a card a fingertip
 * wide. The wide numbers keep the tallest board (eighteen cards) from becoming
 * three rows of six unreadably wide cards on a laptop.
 */
const COLUMNS: Record<number, readonly [narrow: number, wide: number]> = {
  6: [3, 4],
  8: [4, 4],
  9: [3, 6],
};

/** Total cards on a board of this size. */
export function cardCount(pairs: number): number {
  return clampPairs(pairs) * 2;
}

export function columnsFor(pairs: number, wide: boolean): number {
  const [narrow, broad] = COLUMNS[clampPairs(pairs)] ?? [3, 4];
  return wide ? broad : narrow;
}

/** Guard rail rather than validation: a size is a constant, never user input. */
function clampPairs(pairs: number): number {
  if (!Number.isFinite(pairs)) return 1;
  return Math.min(MAX_PAIRS, Math.max(1, Math.floor(pairs)));
}

/**
 * FNV-1a. Deterministic, tiny, and good enough to spread dates across sizes.
 * Not for anything that needs unpredictability — nothing here does.
 */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Mulberry32. Hand-written because `Math.random()` cannot be seeded, and a deal
 * that cannot be reproduced cannot be saved, shared or tested.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The seed of the next board, for "Another board".
 *
 * One step of a linear congruential generator, so the sequence of boards a
 * player sees is deterministic and distinct without reaching for the clock or
 * `Math.random()`. A seed is still the only input to `deal`, which keeps the
 * promise intact: every board can be reconstructed from two numbers.
 */
export function nextSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1103515245) + 12345) >>> 0;
}

/**
 * Shuffle a deck of `pairs * 2` cards and lay it out face down.
 *
 * Fisher–Yates, one pass, from the back. The deck starts as each creature twice
 * in order, so the only thing the shuffle can get wrong is its own randomness.
 */
export function deal(pairs: number, seed: number): Board {
  const count = clampPairs(pairs);
  const random = createRandom(seed);
  const creatures: Creature[] = [];
  for (let value = 1; value <= count; value += 1) {
    const creature = value as Creature;
    creatures.push(creature, creature);
  }

  for (let index = creatures.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = creatures[index];
    creatures[index] = creatures[swap];
    creatures[swap] = held;
  }

  return {
    pairs: count,
    creatures,
    faces: creatures.map(() => 'down' as const),
    open: [],
    turns: 0,
    kept: 0,
    log: [],
  };
}
