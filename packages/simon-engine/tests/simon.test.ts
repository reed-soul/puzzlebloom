import { describe, expect, it } from 'vitest';
import { BLOOM_LENGTH, createEcho, grow, press, readyToCopy, replay } from '../src';

describe('echo bloom', () => {
  it('a matching copy grows the sequence; a miss replays the same bloom', () => {
    let state = readyToCopy(createEcho(1));
    const first = state.sequence[0];
    state = press(state, first);
    expect(state.phase).toBe('listen');
    state = grow(state, 1);
    expect(state.sequence).toHaveLength(2);

    state = readyToCopy(state);
    const wrong = ([0, 1, 2, 3] as const).find((p) => p !== state.sequence[0])!;
    state = press(state, wrong);
    expect(state.phase).toBe('again');
    expect(state.sequence).toHaveLength(2);
    state = replay(state);
    expect(state.phase).toBe('listen');
    expect(state.sequence).toHaveLength(2);
  });

  it('eight perfect copies bloom', () => {
    let state = createEcho(4);
    for (let i = 0; i < BLOOM_LENGTH; i++) {
      state = readyToCopy(state);
      for (const pad of state.sequence) {
        state = press(state, pad);
      }
      if (i < BLOOM_LENGTH - 1) state = grow(state, 4);
    }
    expect(state.phase).toBe('bloom');
  });

  it('ignores a press while the garden is speaking', () => {
    const state = createEcho(2);
    expect(press(state, 0).copied).toBe(0);
    expect(press(state, 0).phase).toBe('listen');
  });
});
