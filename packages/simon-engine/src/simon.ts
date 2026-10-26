/**
 * Echo Bloom — a Simon sequence of four petals.
 *
 * Provenance: classic Simon rules. Sequence growth and "listen then copy"
 * match TheWilley/Simon (MIT). Miss handling is ours: the same bloom is
 * replayed, with no fail-shame and no lost streak to protect.
 */

export type Pad = 0 | 1 | 2 | 3;
export type Phase = 'listen' | 'copy' | 'again' | 'bloom';

export interface EchoState {
  readonly sequence: readonly Pad[];
  readonly copied: number;
  readonly phase: Phase;
}

const PADS: Pad[] = [0, 1, 2, 3];
export const BLOOM_LENGTH = 8;

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

export function createEcho(seed: number): EchoState {
  const rand = mulberry32(seed);
  const first = PADS[Math.floor(rand() * 4)];
  return { sequence: [first], copied: 0, phase: 'listen' };
}

export function readyToCopy(state: EchoState): EchoState {
  if (state.phase === 'bloom') return state;
  return { ...state, copied: 0, phase: 'copy' };
}

export function press(state: EchoState, pad: Pad): EchoState {
  if (state.phase !== 'copy') return state;
  const expected = state.sequence[state.copied];
  if (pad !== expected) {
    return { ...state, copied: 0, phase: 'again' };
  }
  const copied = state.copied + 1;
  if (copied === state.sequence.length) {
    if (state.sequence.length >= BLOOM_LENGTH) {
      return { ...state, copied, phase: 'bloom' };
    }
    return { ...state, copied, phase: 'listen' };
  }
  return { ...state, copied, phase: 'copy' };
}

/** Grow the bloom by one petal. Called after a perfect copy. */
export function grow(state: EchoState, seed: number): EchoState {
  if (state.phase === 'bloom') return state;
  const rand = mulberry32(seed + state.sequence.length * 997);
  const next = PADS[Math.floor(rand() * 4)];
  return { sequence: [...state.sequence, next], copied: 0, phase: 'listen' };
}

export function replay(state: EchoState): EchoState {
  return { ...state, copied: 0, phase: 'listen' };
}
