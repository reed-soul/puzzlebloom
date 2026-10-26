/**
 * Flow Paths — Numberlink. Join matching colours; paths may not cross.
 *
 * Provenance: classic Numberlink / Flow. Menna107/Simple-Games flow-free.html
 * (MIT) is the overnight reference for "drag from a terminal along empty
 * cells". Puzzles below are hand-authored fillings, so every deal is solvable.
 */

export interface Pair {
  readonly color: number;
  readonly a: number;
  readonly b: number;
}

export interface FlowPuzzle {
  readonly size: number;
  readonly pairs: readonly Pair[];
}

export interface FlowState {
  readonly puzzle: FlowPuzzle;
  /** color -> ordered cells of the path, including both terminals when complete. */
  readonly paths: Readonly<Record<number, readonly number[]>>;
  readonly active: number | null;
}

export const PUZZLES: readonly FlowPuzzle[] = [
  {
    size: 5,
    pairs: [
      { color: 0, a: 0, b: 4 },
      { color: 1, a: 5, b: 24 },
      { color: 2, a: 6, b: 16 },
      { color: 3, a: 11, b: 13 },
    ],
  },
  {
    size: 5,
    pairs: [
      { color: 0, a: 0, b: 22 },
      { color: 1, a: 1, b: 6 },
      { color: 2, a: 11, b: 16 },
      { color: 3, a: 23, b: 24 },
    ],
  },
  {
    size: 6,
    pairs: [
      { color: 0, a: 0, b: 5 },
      { color: 1, a: 6, b: 35 },
      { color: 2, a: 7, b: 25 },
      { color: 3, a: 13, b: 19 },
    ],
  },
  {
    size: 6,
    pairs: [
      { color: 0, a: 0, b: 30 },
      { color: 1, a: 1, b: 31 },
      { color: 2, a: 7, b: 13 },
      { color: 3, a: 19, b: 25 },
    ],
  },
];

/** Known fillings, used by tests to prove each puzzle is actually solvable. */
export const FILLINGS: readonly Readonly<Record<number, readonly number[]>>[] = [
  {
    0: [0, 1, 2, 3, 4],
    1: [5, 10, 15, 20, 21, 22, 23, 24],
    2: [6, 7, 8, 9, 14, 19, 18, 17, 16],
    3: [11, 12, 13],
  },
  {
    0: [0, 5, 10, 15, 20, 21, 22],
    1: [1, 2, 3, 4, 9, 8, 7, 6],
    2: [11, 12, 13, 14, 19, 18, 17, 16],
    3: [23, 24],
  },
  {
    0: [0, 1, 2, 3, 4, 5],
    1: [6, 12, 18, 24, 30, 31, 32, 33, 34, 35],
    2: [7, 8, 9, 10, 11, 17, 23, 29, 28, 27, 26, 25],
    3: [13, 14, 15, 16, 22, 21, 20, 19],
  },
  {
    0: [0, 6, 12, 18, 24, 30],
    1: [1, 2, 3, 4, 5, 11, 17, 23, 29, 35, 34, 33, 32, 31],
    2: [7, 8, 9, 10, 16, 15, 14, 13],
    3: [19, 20, 21, 22, 28, 27, 26, 25],
  },
];

export function createFlow(index: number): FlowState {
  const puzzle = PUZZLES[((index % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
  const paths: Record<number, number[]> = {};
  for (const pair of puzzle.pairs) {
    paths[pair.color] = [pair.a];
  }
  return { puzzle, paths, active: null };
}

export function terminalColor(state: FlowState, cell: number): number | null {
  for (const pair of state.puzzle.pairs) {
    if (pair.a === cell || pair.b === cell) return pair.color;
  }
  return null;
}

function occupied(state: FlowState, cell: number, except?: number): number | null {
  for (const [key, path] of Object.entries(state.paths)) {
    const color = Number(key);
    if (color === except) continue;
    if (path.includes(cell)) return color;
  }
  return null;
}

function otherEnd(state: FlowState, color: number, cell: number): number {
  const pair = state.puzzle.pairs.find((p) => p.color === color)!;
  return pair.a === cell ? pair.b : pair.a;
}

export function adjacent(size: number, a: number, b: number): boolean {
  const ar = Math.floor(a / size);
  const ac = a % size;
  const br = Math.floor(b / size);
  const bc = b % size;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

export function begin(state: FlowState, cell: number): FlowState {
  const color = terminalColor(state, cell);
  if (color === null) {
    for (const [key, path] of Object.entries(state.paths)) {
      if (path[path.length - 1] === cell) {
        return { ...state, active: Number(key) };
      }
    }
    return state;
  }
  const paths = { ...state.paths, [color]: [cell] };
  return { ...state, paths, active: color };
}

export function extend(state: FlowState, cell: number): FlowState {
  if (state.active === null) return state;
  const color = state.active;
  const path = state.paths[color] ?? [];
  const last = path[path.length - 1];
  if (last === cell) return state;
  const earlier = path.lastIndexOf(cell);
  if (earlier >= 0) {
    return { ...state, paths: { ...state.paths, [color]: path.slice(0, earlier + 1) } };
  }
  if (!adjacent(state.puzzle.size, last, cell)) return state;
  if (occupied(state, cell, color) !== null) return state;
  const term = terminalColor(state, cell);
  if (term !== null && term !== color) return state;
  const next = [...path, cell];
  const complete = cell === otherEnd(state, color, path[0]);
  return {
    ...state,
    paths: { ...state.paths, [color]: next },
    active: complete ? null : color,
  };
}

export function endDrag(state: FlowState): FlowState {
  return { ...state, active: null };
}

export function clearColor(state: FlowState, color: number): FlowState {
  const pair = state.puzzle.pairs.find((p) => p.color === color);
  if (!pair) return state;
  return { ...state, paths: { ...state.paths, [color]: [pair.a] }, active: null };
}

export function isComplete(state: FlowState): boolean {
  const { size, pairs } = state.puzzle;
  const filled = new Set<number>();
  for (const pair of pairs) {
    const path = state.paths[pair.color] ?? [];
    const ends = [path[0], path[path.length - 1]];
    const ok =
      path.length >= 2 &&
      ((ends[0] === pair.a && ends[1] === pair.b) || (ends[0] === pair.b && ends[1] === pair.a));
    if (!ok) return false;
    for (let i = 1; i < path.length; i++) {
      if (!adjacent(size, path[i - 1], path[i])) return false;
    }
    for (const cell of path) filled.add(cell);
  }
  return filled.size === size * size;
}
