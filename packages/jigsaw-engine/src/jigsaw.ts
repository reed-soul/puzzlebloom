/**
 * Piece Garden — an n×n permutation, tap two pieces to swap.
 *
 * Provenance: classic sliding-swap / jigsaw-as-permutation. No third-party
 * engine is lifted: kid-safe garden art is the bottleneck on MIT jigsaw
 * ports, so the "picture" is an SVG scene sliced by viewBox, and the engine
 * is only the scramble.
 */

export type Size = 2 | 3 | 4;

export interface JigsawState {
  readonly size: Size;
  /** `pieces[i]` is the picture-index currently sitting in slot i. */
  readonly pieces: readonly number[];
  readonly selected: number | null;
  readonly swaps: number;
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

export function createJigsaw(size: Size, seed: number): JigsawState {
  const rand = mulberry32(seed);
  const n = size * size;
  const pieces = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  if (isIdentity(pieces)) {
    [pieces[0], pieces[1]] = [pieces[1], pieces[0]];
  }
  return { size, pieces, selected: null, swaps: 0 };
}

function isIdentity(pieces: readonly number[]): boolean {
  return pieces.every((p, i) => p === i);
}

export function isSolved(state: JigsawState): boolean {
  return isIdentity(state.pieces);
}

export function tap(state: JigsawState, slot: number): JigsawState {
  if (slot < 0 || slot >= state.pieces.length) return state;
  if (state.selected === null) return { ...state, selected: slot };
  if (state.selected === slot) return { ...state, selected: null };
  const pieces = state.pieces.slice();
  const a = state.selected;
  [pieces[a], pieces[slot]] = [pieces[slot], pieces[a]];
  return { ...state, pieces, selected: null, swaps: state.swaps + 1 };
}
