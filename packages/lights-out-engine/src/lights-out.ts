/**
 * Firefly Lights — Lights Out, plus-shaped toggles.
 *
 * Provenance: classic Lights Out. ScriptRaccoon/Lights-Out-Vanilla-JavaScript
 * (MIT) toggles a cell and its four neighbours (the checkbox flips itself;
 * the handler flips the neighbours). Puzzles here are carved by pressing a
 * solved (all-dark) board, so every deal is solvable — the vanilla randomise
 * is not, and a child should never be handed an impossible garden.
 */

export interface LightsState {
  readonly size: number;
  /** true = firefly is lit. */
  readonly lit: readonly boolean[];
  readonly presses: number;
}

export function createLights(size: number, seed: number, clicks = 8): LightsState {
  const rand = mulberry32(seed);
  let state: LightsState = {
    size,
    lit: Array.from({ length: size * size }, () => false),
    presses: 0,
  };
  const n = size * size;
  for (let i = 0; i < clicks; i++) {
    state = press(state, Math.floor(rand() * n));
  }
  let guard = 0;
  while (isSolved(state) && guard < n * 2) {
    state = press(state, Math.floor(rand() * n));
    guard += 1;
  }
  return { ...state, presses: 0 };
}

export function press(state: LightsState, index: number): LightsState {
  const { size } = state;
  if (index < 0 || index >= size * size) return state;
  const lit = state.lit.slice();
  const flip = (i: number) => {
    if (i >= 0 && i < lit.length) lit[i] = !lit[i];
  };
  const r = Math.floor(index / size);
  const c = index % size;
  flip(index);
  if (c > 0) flip(index - 1);
  if (c < size - 1) flip(index + 1);
  if (r > 0) flip(index - size);
  if (r < size - 1) flip(index + size);
  return { ...state, lit, presses: state.presses + 1 };
}

export function isSolved(state: LightsState): boolean {
  return state.lit.every((on) => !on);
}

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
