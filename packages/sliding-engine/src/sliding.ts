/**
 * Sliding Garden — an n-puzzle (8 or 15) shuffled only by legal slides.
 *
 * Provenance: classic public-domain 15-puzzle rules. The shuffle-by-walk
 * idea (never an unsolvable permutation) is the same approach used by
 * react-puzzle-games/15-puzzle (MIT). The board, the tiles and the copy
 * here are original.
 */

export type Size = 3 | 4;

export interface SlidingState {
  readonly size: Size;
  /** Row-major tiles. `0` is the empty square. */
  readonly tiles: readonly number[];
  readonly empty: number;
  readonly moves: number;
}

export function solvedTiles(size: Size): number[] {
  const total = size * size;
  const tiles = Array.from({ length: total }, (_, i) => (i + 1) % total);
  return tiles;
}

export function isSolved(state: SlidingState): boolean {
  const goal = solvedTiles(state.size);
  return state.tiles.every((tile, i) => tile === goal[i]);
}

export function canSlide(state: SlidingState, index: number): boolean {
  if (index < 0 || index >= state.tiles.length || index === state.empty) return false;
  const size = state.size;
  const er = Math.floor(state.empty / size);
  const ec = state.empty % size;
  const r = Math.floor(index / size);
  const c = index % size;
  return (r === er && Math.abs(c - ec) === 1) || (c === ec && Math.abs(r - er) === 1);
}

export function slide(state: SlidingState, index: number): SlidingState {
  if (!canSlide(state, index)) return state;
  const tiles = state.tiles.slice();
  tiles[state.empty] = tiles[index];
  tiles[index] = 0;
  return { ...state, tiles, empty: index, moves: state.moves + 1 };
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

/**
 * A fresh board, scrambled by walking the empty square. Walking rather than
 * shuffling the array is what keeps every deal solvable.
 */
export function createPuzzle(size: Size, seed: number, steps?: number): SlidingState {
  const rand = mulberry32(seed);
  const walk = steps ?? (size === 3 ? 24 : 64);
  let tiles = solvedTiles(size);
  let empty = tiles.length - 1;
  let last = -1;
  for (let n = 0; n < walk; n++) {
    const neighbours = [empty - 1, empty + 1, empty - size, empty + size].filter((i) => {
      if (i < 0 || i >= tiles.length || i === last) return false;
      const er = Math.floor(empty / size);
      const r = Math.floor(i / size);
      const ec = empty % size;
      const c = i % size;
      return (r === er && Math.abs(c - ec) === 1) || (c === ec && Math.abs(r - er) === 1);
    });
    const pick = neighbours[Math.floor(rand() * neighbours.length)];
    tiles = tiles.slice();
    tiles[empty] = tiles[pick];
    tiles[pick] = 0;
    last = empty;
    empty = pick;
  }
  return { size, tiles, empty, moves: 0 };
}
