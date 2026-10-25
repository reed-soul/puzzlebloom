/**
 * Public surface of the Memory Garden engine.
 *
 * The game imports from here and nowhere else, so the names below are the
 * contract: a creature, a dealt board, a turn, a recap, a hint, a save. The
 * modules behind it are small and single-purpose, and this barrel is where the
 * story of how they fit together is told once.
 */

export {
  type Board,
  type CardFace,
  isComplete,
  type TurnEvent,
  type TurnLog,
  type TurnResult,
  turn,
} from './board';
export { CREATURES, type Creature, creatureName, isCreature } from './creatures';
export { type DailyDeal, dailyDeal, localDateKey } from './daily';
export {
  cardCount,
  columnsFor,
  createRandom,
  deal,
  isLevel,
  LEVELS,
  type Level,
  MAX_PAIRS,
  nextSeed,
  PAIRS_BY_LEVEL,
  seedFrom,
} from './deal';
export { type Hint, nextHint, seenIn } from './hints';
export {
  boardFrom,
  clearProgress,
  decodeProgress,
  encodeProgress,
  PROGRESS_KEY,
  readProgress,
  type SavedProgress,
  type StorageLike,
  writeProgress,
} from './progress';
export { type Recap, recap } from './recap';
