/**
 * Peg Pond — English-board hop solitaire.
 *
 * Provenance: classic English peg solitaire (33 holes, centre empty).
 * ggades/peg-solitaire (MIT) is the overnight reference for hop geometry
 * and undo; the board here is a 7×7 with the four 2×2 corners removed,
 * hops are orthogonal, and the copy talks of seeds on lily pads.
 */

export type Hole = 'none' | 'empty' | 'seed';

export interface PegState {
  readonly holes: readonly Hole[];
  readonly selected: number | null;
  readonly history: readonly (readonly Hole[])[];
}

export const SIZE = 7;
export const CENTRE = 24; // 3 * 7 + 3

export function isOnBoard(index: number): boolean {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) return false;
  const corner = (r < 2 || r > 4) && (c < 2 || c > 4);
  return !corner;
}

export function createEnglish(): PegState {
  const holes: Hole[] = Array.from({ length: SIZE * SIZE }, (_, i) => {
    if (!isOnBoard(i)) return 'none';
    return i === CENTRE ? 'empty' : 'seed';
  });
  return { holes, selected: null, history: [] };
}

const ORTHO = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export function hopsFrom(state: PegState, from: number): number[] {
  if (state.holes[from] !== 'seed') return [];
  const r = Math.floor(from / SIZE);
  const c = from % SIZE;
  const dest: number[] = [];
  for (const { dr, dc } of ORTHO) {
    const mid = (r + dr) * SIZE + (c + dc);
    const to = (r + 2 * dr) * SIZE + (c + 2 * dc);
    if (state.holes[mid] === 'seed' && state.holes[to] === 'empty') dest.push(to);
  }
  return dest;
}

export function select(state: PegState, index: number): PegState {
  if (!isOnBoard(index)) return state;
  if (state.selected !== null && hopsFrom(state, state.selected).includes(index)) {
    return hop(state, state.selected, index);
  }
  if (state.holes[index] === 'seed') return { ...state, selected: index };
  return { ...state, selected: null };
}

export function hop(state: PegState, from: number, to: number): PegState {
  if (!hopsFrom(state, from).includes(to)) return state;
  const mid = (from + to) / 2;
  const holes = state.holes.slice();
  holes[from] = 'empty';
  holes[mid] = 'empty';
  holes[to] = 'seed';
  return { holes, selected: null, history: [...state.history, state.holes] };
}

export function undo(state: PegState): PegState {
  if (state.history.length === 0) return state;
  const holes = state.history[state.history.length - 1];
  return { holes, selected: null, history: state.history.slice(0, -1) };
}

export function seedCount(state: PegState): number {
  return state.holes.filter((h) => h === 'seed').length;
}

export function hasMoves(state: PegState): boolean {
  return state.holes.some((h, i) => h === 'seed' && hopsFrom(state, i).length > 0);
}

export function isSolved(state: PegState): boolean {
  return seedCount(state) === 1;
}
