/**
 * Maze Path — recursive-backtracker hedges, one start, one gate, no enemies.
 *
 * Provenance: the recursive-backtracker (depth-first carve) is the generator
 * described by codebox/mazes (MIT). We lift the algorithm, not the viewer:
 * a grid of cells with four walls, carved until every cell is reachable.
 */

export type Dir = 'n' | 'e' | 's' | 'w';

export interface Cell {
  n: boolean;
  e: boolean;
  s: boolean;
  w: boolean;
}

export interface MazeState {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly Cell[];
  readonly pos: number;
  readonly goal: number;
  readonly path: readonly number[];
}

const DELTA: Record<Dir, { dr: number; dc: number; opp: Dir }> = {
  n: { dr: -1, dc: 0, opp: 's' },
  e: { dr: 0, dc: 1, opp: 'w' },
  s: { dr: 1, dc: 0, opp: 'n' },
  w: { dr: 0, dc: -1, opp: 'e' },
};

export const DIRS: Dir[] = ['n', 'e', 's', 'w'];

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

const idx = (width: number, r: number, c: number) => r * width + c;

export function generateMaze(width: number, height: number, seed: number): MazeState {
  const rand = mulberry32(seed);
  const cells: Cell[] = Array.from({ length: width * height }, () => ({
    n: true,
    e: true,
    s: true,
    w: true,
  }));
  const visited = new Set<number>([0]);
  const stack = [0];
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const r = Math.floor(current / width);
    const c = current % width;
    const options: Dir[] = DIRS.filter((dir) => {
      const nr = r + DELTA[dir].dr;
      const nc = c + DELTA[dir].dc;
      if (nr < 0 || nc < 0 || nr >= height || nc >= width) return false;
      return !visited.has(idx(width, nr, nc));
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const dir = options[Math.floor(rand() * options.length)];
    const next = idx(width, r + DELTA[dir].dr, c + DELTA[dir].dc);
    cells[current] = { ...cells[current], [dir]: false };
    cells[next] = { ...cells[next], [DELTA[dir].opp]: false };
    visited.add(next);
    stack.push(next);
  }
  const goal = width * height - 1;
  return { width, height, cells, pos: 0, goal, path: [0] };
}

export function canMove(state: MazeState, dir: Dir): boolean {
  return !state.cells[state.pos][dir];
}

export function move(state: MazeState, dir: Dir): MazeState {
  if (!canMove(state, dir)) return state;
  const r = Math.floor(state.pos / state.width);
  const c = state.pos % state.width;
  const next = idx(state.width, r + DELTA[dir].dr, c + DELTA[dir].dc);
  if (next < 0 || next >= state.cells.length) return state;
  return { ...state, pos: next, path: [...state.path, next] };
}

export function isSolved(state: MazeState): boolean {
  return state.pos === state.goal;
}

/** The next step on a shortest path to the gate. Null only if already there. */
export function hint(state: MazeState): Dir | null {
  if (isSolved(state)) return null;
  const { width, height, cells, pos, goal } = state;
  const prev = new Map<number, { from: number; dir: Dir }>();
  const q = [pos];
  const seen = new Set([pos]);
  while (q.length > 0) {
    const cur = q.shift()!;
    if (cur === goal) break;
    const r = Math.floor(cur / width);
    const c = cur % width;
    for (const dir of DIRS) {
      if (cells[cur][dir]) continue;
      const next = idx(width, r + DELTA[dir].dr, c + DELTA[dir].dc);
      if (next < 0 || next >= width * height || seen.has(next)) continue;
      seen.add(next);
      prev.set(next, { from: cur, dir });
      q.push(next);
    }
  }
  if (!prev.has(goal) && goal !== pos) return null;
  let cursor = goal;
  let step: { from: number; dir: Dir } | undefined = prev.get(cursor);
  while (step && step.from !== pos) {
    cursor = step.from;
    step = prev.get(cursor);
  }
  return step?.dir ?? null;
}
