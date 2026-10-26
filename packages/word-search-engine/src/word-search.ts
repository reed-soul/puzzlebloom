/**
 * Word Meadow — a small grid of nature words.
 *
 * Provenance: classic word-search placement (write a word along a vector,
 * fill the rest with letters). vzsoares/Word-Search-Puzzle-REACT (MIT)
 * is the overnight reference; the word list here is a garden list, not
 * theirs, and the selector is original.
 */

export type Vec = { dr: number; dc: number };

export interface Placement {
  readonly word: string;
  readonly cells: readonly number[];
}

export interface MeadowState {
  readonly size: number;
  readonly grid: readonly string[];
  readonly words: readonly string[];
  readonly found: readonly string[];
  readonly placements: readonly Placement[];
}

const DIRS: Vec[] = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: -1 },
];

export const NATURE = [
  'FERN',
  'MOSS',
  'POND',
  'LEAF',
  'BIRD',
  'FROG',
  'DEW',
  'SUN',
  'PATH',
  'BLOOM',
  'SEED',
  'RAIN',
] as const;

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

const at = (size: number, r: number, c: number) => r * size + c;

function tryPlace(
  grid: (string | null)[],
  size: number,
  word: string,
  start: number,
  dir: Vec,
): number[] | null {
  const sr = Math.floor(start / size);
  const sc = start % size;
  const cells: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const r = sr + dir.dr * i;
    const c = sc + dir.dc * i;
    if (r < 0 || c < 0 || r >= size || c >= size) return null;
    const i2 = at(size, r, c);
    const existing = grid[i2];
    if (existing && existing !== word[i]) return null;
    cells.push(i2);
  }
  for (let i = 0; i < word.length; i++) grid[cells[i]] = word[i];
  return cells;
}

export function createMeadow(seed: number, size = 8, count = 6): MeadowState {
  const rand = mulberry32(seed);
  const pool = [...NATURE];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, count);
  const grid: (string | null)[] = Array.from({ length: size * size }, () => null);
  const placements: Placement[] = [];
  for (const word of chosen) {
    const starts = Array.from({ length: size * size }, (_, i) => i);
    for (let i = starts.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [starts[i], starts[j]] = [starts[j], starts[i]];
    }
    const dirs = [...DIRS];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    let placed: number[] | null = null;
    outer: for (const dir of dirs) {
      for (const start of starts) {
        const snapshot = grid.slice();
        placed = tryPlace(snapshot, size, word, start, dir);
        if (placed) {
          for (let i = 0; i < snapshot.length; i++) grid[i] = snapshot[i];
          placements.push({ word, cells: placed });
          break outer;
        }
      }
    }
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const filled = grid.map((ch) => ch ?? letters[Math.floor(rand() * letters.length)]);
  return {
    size,
    grid: filled,
    words: placements.map((p) => p.word),
    found: [],
    placements,
  };
}

function line(size: number, a: number, b: number): number[] | null {
  const ar = Math.floor(a / size);
  const ac = a % size;
  const br = Math.floor(b / size);
  const bc = b % size;
  const dr = Math.sign(br - ar);
  const dc = Math.sign(bc - ac);
  if (dr !== 0 && dc !== 0 && Math.abs(br - ar) !== Math.abs(bc - ac)) return null;
  if (dr === 0 && dc === 0) return [a];
  const cells = [a];
  let r = ar;
  let c = ac;
  while (r !== br || c !== bc) {
    r += dr;
    c += dc;
    cells.push(at(size, r, c));
  }
  return cells;
}

export function select(state: MeadowState, a: number, b: number): MeadowState {
  const cells = line(state.size, a, b);
  if (!cells) return state;
  const forward = cells.map((i) => state.grid[i]).join('');
  const backward = [...cells]
    .reverse()
    .map((i) => state.grid[i])
    .join('');
  const hit = state.words.find((w) => w === forward || w === backward);
  if (!hit || state.found.includes(hit)) return state;
  return { ...state, found: [...state.found, hit] };
}

export function isSolved(state: MeadowState): boolean {
  return state.found.length === state.words.length && state.words.length > 0;
}
