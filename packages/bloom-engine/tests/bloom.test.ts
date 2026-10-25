import { describe, expect, it } from 'vitest';
import { aim, createBloom, drop, JAR, randomTier, settle, step, TIER_COUNT, TIERS } from '../src';

/**
 * The claims this engine must keep: nothing escapes the jar, merges only ever
 * combine equals into the next tier, and the same inputs produce the same
 * garden. A child will test the first two with their thumb; these tests are
 * the thumb.
 */

const seededRandom = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe('the jar', () => {
  it('keeps every bloom inside the walls, however many drop', () => {
    let state = createBloom(seededRandom(7));
    for (let i = 0; i < 60; i++) {
      state = aim(state, (i % 2 === 0 ? 1 : -1) * 500); // throw at the walls
      state = drop(state, seededRandom(i + 1));
    }
    state = settle(state);
    for (const b of state.blooms) {
      const r = TIERS[b.tier].radius;
      expect(b.x - r).toBeGreaterThanOrEqual(-0.5);
      expect(b.x + r).toBeLessThanOrEqual(JAR.width + 0.5);
      expect(b.y + r).toBeLessThanOrEqual(JAR.height + 0.5);
    }
  });

  it('ends the run when something rests above the rim, not when it bounces', () => {
    // Stack until overflow: no waiting on luck, just drop in one place.
    let state = createBloom(() => 0); // always tier 0
    state = aim(state, JAR.width / 2);
    let ticks = 0;
    while (!state.over && ticks < 100000) {
      state = drop(state, () => 0);
      state = settle(state);
      ticks++;
    }
    expect(state.over).toBe(true);
    // And before it ended, nothing above the rim ended it early: the run
    // needed more than a handful of drops.
    expect(ticks).toBeGreaterThan(10);
  });
});

describe('merging', () => {
  it('turns two touching equals into one of the next tier, scoring it', () => {
    let state = createBloom(() => 0);
    state = aim(state, JAR.width / 2);
    state = drop(state, () => 0);
    state = settle(state);
    const before = state.blooms.length;
    const scoreBefore = state.score;

    state = drop(state, () => 0); // same tier, same place
    state = settle(state);

    expect(state.blooms.length).toBeLessThan(before + 1); // merged, not stacked
    expect(state.score).toBeGreaterThan(scoreBefore);
    expect(state.bestTier).toBeGreaterThanOrEqual(1);
  });

  it('never creates a tier above the ninth', () => {
    // Force high tiers: drop only tier-4 (queue rigged), many, same spot.
    let state = createBloom(seededRandom(3));
    for (let i = 0; i < 80; i++) {
      state = aim(state, JAR.width / 2 + (i % 5) * 4);
      state = drop(state, () => 0.999); // queue tier 4
      state = settle(state, 400);
      if (state.over) break;
    }
    for (const b of state.blooms) {
      expect(b.tier).toBeLessThanOrEqual(TIER_COUNT - 1);
    }
  });

  it('does not merge different tiers that touch', () => {
    // Built by hand, not by drops: the queue decides the *next* drop, so
    // rigging the queue rigging nothing here. Two blooms, different tiers,
    // placed exactly in contact.
    let state = createBloom(() => 0);
    const r0 = TIERS[0].radius;
    const r2 = TIERS[2].radius;
    state = {
      ...state,
      blooms: [
        { id: 1, tier: 0, x: JAR.width / 2 - (r0 + r2) / 2, y: JAR.height - r0, vx: 0, vy: 0 },
        { id: 2, tier: 2, x: JAR.width / 2 + (r0 + r2) / 2, y: JAR.height - r2, vx: 0, vy: 0 },
      ],
    };
    state = settle(state);
    const tiers = state.blooms.map((b) => b.tier).sort();
    expect(tiers).toEqual([0, 2]); // still two, still unequal
  });
});

describe('the queue', () => {
  it('only offers the droppable five tiers, weighted toward the small', () => {
    const counts = new Array(9).fill(0);
    for (let i = 0; i < 5000; i++) counts[randomTier(seededRandom(i + 100))]++;
    for (let t = 5; t < 9; t++) expect(counts[t]).toBe(0);
    expect(counts[0] + counts[1] + counts[2]).toBeGreaterThan(5000 * 0.8);
  });

  it('aims within the walls whatever the pointer asks', () => {
    let state = createBloom(() => 0);
    state = aim(state, -999);
    expect(state.pending.x).toBeGreaterThanOrEqual(TIERS[state.pending.tier].radius);
    state = aim(state, 9999);
    expect(state.pending.x).toBeLessThanOrEqual(JAR.width - TIERS[state.pending.tier].radius);
  });
});

describe('determinism', () => {
  it('the same seed and the same drops grow the same garden', () => {
    const play = (n: number) => {
      let state = createBloom(seededRandom(42));
      for (let i = 0; i < n; i++) {
        state = aim(state, JAR.width / 2 + Math.sin(i * 0.7) * 100);
        state = drop(state, seededRandom(i + 42));
        state = settle(state, 300);
      }
      return state;
    };
    const a = play(30);
    const b = play(30);
    expect(a.score).toBe(b.score);
    expect(a.blooms.length).toBe(b.blooms.length);
    expect(a.blooms.map((x) => `${x.tier}:${x.x.toFixed(2)},${x.y.toFixed(2)}`)).toEqual(
      b.blooms.map((x) => `${x.tier}:${x.x.toFixed(2)},${x.y.toFixed(2)}`),
    );
  });

  it('a tick is pure: stepping twice from one state gives two equal worlds', () => {
    let state = createBloom(seededRandom(5));
    state = drop(state, seededRandom(6));
    state = step(state);
    const left = step(state);
    const right = step(state);
    expect(JSON.stringify(left.blooms)).toBe(JSON.stringify(right.blooms));
  });
});
