/**
 * The balance scale, as rules rather than as plastic.
 *
 * A physical number balance has one flaw the classroom cannot fix: the pivot.
 * A beam with any friction in it will sit level when the two sides are not
 * equal, and a child who believes a wrong answer balances has just been taught
 * something that will take years to unlearn. The digital beam has no friction.
 * `tilt` is a function of the difference and nothing else.
 *
 * What the game teaches, in order: a numeral is a count of things; the equals
 * sign means "the same on both sides", not "write the answer after this";
 * numbers come apart (6 is 2 and 4) and go together again. The engine keeps to
 * that and refuses to model subtraction, which a two-pan balance cannot say
 * honestly — take-away is not a thing you can do to one pan of a scale.
 */

/** One side of the beam. `tiles` are numerals, `frogs` are single units. */
export interface Pan {
  tiles: number[];
  frogs: number;
}

/** A puzzle: what the left pan holds, and what must be matched. */
export interface BalancePuzzle {
  id: string;
  /** The numeral tiles fixed onto the left pan. Length 1–2 for level one. */
  left: number[];
  /** 1–10. Levels constrain this; the engine never does. */
  targetTotal: number;
}

export interface BalanceState {
  puzzle: BalancePuzzle;
  right: Pan;
  /** True once the right pan has been weighed at least once. */
  weighed: boolean;
  solved: boolean;
}

export const leftTotal = (puzzle: BalancePuzzle): number => puzzle.left.reduce((sum, tile) => sum + tile, 0);

export const panTotal = (pan: Pan): number => pan.tiles.reduce((sum, tile) => sum + tile, 0) + pan.frogs;

/**
 * The beam angle, in degrees. The scale tips toward the heavier side and stops
 * at ±14°, which is as far as a beam looks like a beam. A full-proportional
 * swing would move too fast to read and a flat cap would hide small
 * differences; the square root keeps ±1 visible while letting ±8 saturate.
 */
export function tilt(state: BalanceState): number {
  const diff = leftTotal(state.puzzle) - panTotal(state.right);
  const sign = Math.sign(diff);
  const magnitude = Math.sqrt(Math.abs(diff));
  return Number((sign * Math.min(magnitude, 3.74) * 3.74).toFixed(2));
}

export function createBalance(puzzle: BalancePuzzle): BalanceState {
  return {
    puzzle,
    right: { tiles: [], frogs: 0 },
    weighed: false,
    solved: false,
  };
}

/** Returns the state after a weigh, solving if the pans match. */
export function weigh(state: BalanceState): BalanceState {
  const solved = panTotal(state.right) === leftTotal(state.puzzle);
  return { ...state, weighed: true, solved: solved || state.solved };
}

export function addTile(state: BalanceState, value: number): BalanceState {
  if (state.solved) return state;
  return { ...state, right: { ...state.right, tiles: [...state.right.tiles, value] } };
}

export function addFrog(state: BalanceState, count = 1): BalanceState {
  if (state.solved) return state;
  const frogs = Math.min(state.right.frogs + count, 20);
  return { ...state, right: { ...state.right, frogs } };
}

export function removeTopTile(state: BalanceState): BalanceState {
  if (state.solved || state.right.tiles.length === 0) return state;
  return { ...state, right: { ...state.right, tiles: state.right.tiles.slice(0, -1) } };
}

export function removeFrog(state: BalanceState): BalanceState {
  if (state.solved || state.right.frogs === 0) return state;
  return { ...state, right: { ...state.right, frogs: state.right.frogs - 1 } };
}

export function clearPan(state: BalanceState): BalanceState {
  if (state.solved) return state;
  return { ...state, right: { tiles: [], frogs: 0 }, weighed: false };
}

/**
 * The sentence the scale says when it balances. Shown only on success: printing
 * the running arithmetic before the weigh would do the child's one piece of
 * thinking for them, which is the exact thing the physical toy cannot do and
 * therefore the one thing this version must not copy from a worksheet.
 */
export function equationOf(state: BalanceState): string {
  const { puzzle, right } = state;
  const leftText = puzzle.left.join(' + ');
  const parts = [...right.tiles, ...Array<string>(right.frogs).fill('1')];
  return `${leftText} = ${parts.join(' + ')}`;
}

/**
 * Levels. Each is a generator, not a list: a child who clicks "next puzzle"
 * twenty times should see twenty puzzles, not a cycle.
 *
 * Level one: one numeral, total 3–9. The whole task is "count out that many
 * frogs", which is numeral → quantity, the first mapping.
 * Level two: two numerals, total 5–10, both ≥ 2. Now a number has parts.
 * Level three: like two, but one part is often 1 or 2, so the count-on from the
 * tile is short and the decomposition is the point.
 */
export type BalanceLevel = 1 | 2 | 3;

export function generatePuzzle(level: BalanceLevel, seed: number): BalancePuzzle {
  const rand = mulberry32(seed);
  if (level === 1) {
    const target = 3 + Math.floor(rand() * 7); // 3–9
    return { id: `l1-${seed}`, left: [target], targetTotal: target };
  }
  // levels 2–3: two tiles summing into 5–10, both positive
  let a = 0;
  let b = 0;
  if (level === 2) {
    a = 2 + Math.floor(rand() * 4); // 2–5
    b = 2 + Math.floor(rand() * 4); // 2–5
  } else {
    a = 1 + Math.floor(rand() * 2); // 1–2
    b = 2 + Math.floor(rand() * 5); // 2–6
  }
  const total = a + b;
  return {
    id: `l${level}-${seed}`,
    left: rand() > 0.5 ? [a, b] : [b, a],
    targetTotal: Math.min(total, 10),
  };
}

/** Deterministic 32-bit PRNG, so a seed is a puzzle and a puzzle is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
