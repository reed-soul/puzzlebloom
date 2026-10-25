/**
 * Bloom: drop, roll, meet, merge — a physics merge garden for little hands.
 *
 * The genre is Suika's: drop circles into a jar, two circles of the same kind
 * become one circle of the next kind, the jar fills, the game ends. The
 * engine here is deliberately NOT a rigid-body library. Children do not care
 * about rotational dynamics, and a physics library's tunables (restitution
 * stacks, sleeping thresholds, solver iterations) are where a calm game goes
 * twitchy. Nine sizes, one gravity, circles only: every behaviour below can be
 * reasoned about on paper, and the determinism that falls out of that is what
 * makes seeded boards, replays and the "same drop, same garden" promise
 * possible.
 *
 * Rendering is not this file's problem. The state is plain data; the React
 * layer draws it — through HTML-in-Canvas where the browser can, through DOM
 * otherwise.
 */

/** One creature in the jar. A merge replaces two of these with one. */
export interface Bloom {
  readonly id: number;
  /** Index into TIERS, 0..8. */
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** The drop that is being aimed, before it exists as physics. */
export interface Pending {
  tier: number;
  /** The x the player has moved it to, clamped by the engine. */
  x: number;
  /** The fixed release height above the jar's rim. */
  y: number;
}

/** One turn's merge, where it happened: the juice layer's input. */
export interface MergeEvent {
  x: number;
  y: number;
  tier: number;
}

export interface BloomState {
  blooms: Bloom[];
  /** Merges from the most recent tick; empty when nothing merged. */
  merges: MergeEvent[];
  pending: Pending;
  nextTier: number;
  score: number;
  /** Index of the best tier ever merged — the garden's height. */
  bestTier: number;
  /** True once any bloom rests above the rim long enough to end the run. */
  over: boolean;
  /** Ticks since the last change, for settle animations. */
  quietFor: number;
  /** Monotonic id source. */
  seq: number;
}

/**
 * The nine tiers. Radii grow by ~26% per step: enough that a merge visibly
 * rewards, small enough that nine tiers fit a 2:2.6 jar. Names are garden
 * things a four-year-old can say.
 */
export const TIERS = [
  { name: 'ant', radius: 13 },
  { name: 'bunny', radius: 16.5 },
  { name: 'sprout', radius: 21 },
  { name: 'fox', radius: 26.5 },
  { name: 'frog', radius: 33 },
  { name: 'bird', radius: 41 },
  { name: 'ram', radius: 50 },
  { name: 'panda', radius: 61 },
  { name: 'crown', radius: 74 },
] as const;

export const TIER_COUNT = TIERS.length;

/** The jar: a width the walls contain and a depth the floor bounds. */
export interface Jar {
  width: number;
  height: number;
}

export const JAR: Jar = { width: 340, height: 440 };

/** Rim tolerance: a bloom must poke this far above for this long to end the run. */
const OVERFLOW_Y = -8;
const OVERFLOW_TICKS = 45;
/** How fast things fall. Tuned so a full jar settles in about two seconds. */
const GRAVITY = 0.34;
/** Velocity damping per tick. Below 1; keeps stacks from jittering forever. */
const DAMPING = 0.995;
/** Position correction strength on overlap. 1 would be a hard push apart. */
const SEPARATE = 0.5;

/** Tier that may drop: the first five only, so the jar is earned, not given. */
export const DROPPABLE_MAX_TIER = 4;

/**
 * Steps the whole world one tick. Order matters and is fixed: gravity, walls,
 * pairwise separation (two passes for stability), merges, then the overflow
 * clock. Same inputs, same tick, same world — the property the tests lean on.
 */
export function step(state: BloomState): BloomState {
  if (state.over) return state;

  let blooms = state.blooms.map((b) => ({ ...b }));

  // Gravity.
  for (const b of blooms) {
    b.vy += GRAVITY;
  }

  // Integrate.
  for (const b of blooms) {
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= DAMPING;
    b.vy *= DAMPING;
  }

  // Walls and floor as a function, because the constraint must hold after
  // separation too: two blooms pushing apart can push a third over the wall,
  // and a wall that only holds before the pushes is not a wall.
  const contain = () => {
    for (const b of blooms) {
      const r = TIERS[b.tier].radius;
      if (b.x - r < 0) {
        b.x = r;
        b.vx = Math.abs(b.vx) * 0.4;
      }
      if (b.x + r > JAR.width) {
        b.x = JAR.width - r;
        b.vx = -Math.abs(b.vx) * 0.4;
      }
      if (b.y + r > JAR.height) {
        b.y = JAR.height - r;
        b.vy = -Math.abs(b.vy) * 0.25;
      }
    }
  };
  contain();

  // Pairwise separation, two passes. Circles only: push along the centre
  // line, half each, proportional to overlap. No rotation to conserve, so
  // there is no torque term to misbehave.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < blooms.length; i++) {
      for (let j = i + 1; j < blooms.length; j++) {
        const a = blooms[i];
        const b = blooms[j];
        const minDist = TIERS[a.tier].radius + TIERS[b.tier].radius;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist) continue;
        let dist = Math.sqrt(distSq);
        if (dist === 0) {
          // Exactly stacked (a dropped dead-centre): nudge deterministically.
          dx = 0.01;
          dy = -0.01;
          dist = Math.sqrt(dx * dx + dy * dy);
        }
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const push = (overlap * SEPARATE) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        // Kill the closing velocity along the normal, keep the rest: this is
        // a collision in one dimension only, which is all a circle needs.
        const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (closing < 0) {
          const impulse = closing * 0.5;
          a.vx += nx * impulse;
          a.vy += ny * impulse;
          b.vx -= nx * impulse;
          b.vy -= ny * impulse;
        }
      }
    }
  }
  contain();

  // Merges: same tier, touching. One sweep per tick; newly merged blooms do
  // not merge again until the next tick, which reads as rhythm rather than
  // as a chain-explosion. Recorded as events so the screen can celebrate
  // each one where it happened — the juice layer subscribes to these.
  const merged = new Set<number>();
  const out: Bloom[] = [];
  const merges: MergeEvent[] = [];
  let score = state.score;
  let bestTier = state.bestTier;
  for (let i = 0; i < blooms.length; i++) {
    const a = blooms[i];
    if (merged.has(a.id)) continue;
    for (let j = i + 1; j < blooms.length; j++) {
      const b = blooms[j];
      if (merged.has(b.id) || b.tier !== a.tier || a.tier >= TIER_COUNT - 1) continue;
      const minDist = TIERS[a.tier].radius + TIERS[b.tier].radius;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy > minDist * minDist) continue;
      // Merge at the midpoint, nudge upward so the new bloom has room.
      const tier = a.tier + 1;
      const child: Bloom = {
        id: state.seq,
        tier,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2 - TIERS[tier].radius * 0.2,
        vx: (a.vx + b.vx) / 2,
        vy: (a.vy + b.vy) / 2 - 0.5,
      };
      merged.add(a.id);
      merged.add(b.id);
      out.push(child);
      merges.push({ x: child.x, y: child.y, tier });
      score += (tier + 1) * (tier + 2);
      bestTier = Math.max(bestTier, tier);
      break;
    }
  }
  for (const b of blooms) if (!merged.has(b.id)) out.push(b);
  blooms = out;

  // Overflow: the run ends when something rests above the rim. A momentary
  // bounce over the line must not end anything — children drop things.
  let overTick = state.over ? OVERFLOW_TICKS : 0;
  const anyOver = blooms.some((b) => b.y - TIERS[b.tier].radius < OVERFLOW_Y);
  overTick = anyOver ? state.quietFor + 1 : 0;

  return {
    ...state,
    blooms,
    merges,
    score,
    bestTier,
    over: overTick >= OVERFLOW_TICKS,
    quietFor: anyOver ? overTick : 0,
    seq: state.seq + blooms.length,
  };
}

/** A fresh run. The first two droppable tiers are seeded into the queue. */
export function createBloom(seed: () => number = Math.random): BloomState {
  const state: BloomState = {
    blooms: [],
    merges: [],
    pending: { tier: 0, x: JAR.width / 2, y: 60 },
    nextTier: randomTier(seed),
    score: 0,
    bestTier: 0,
    over: false,
    quietFor: 0,
    seq: 1,
  };
  return state;
}

/**
 * The queue is weighted toward the first three tiers, so the jar fills from
 * the bottom and merges stay reachable. Tier 4 (the largest droppable) is the
 * rare gift, at one drop in ten.
 */
export function randomTier(rand: () => number = Math.random): number {
  const r = rand();
  if (r < 0.32) return 0;
  if (r < 0.62) return 1;
  if (r < 0.87) return 2;
  if (r < 0.97) return 3;
  return 4;
}

/** Aim: clamp inside the walls minus one radius, whatever the pointer did. */
export function aim(state: BloomState, x: number): BloomState {
  const r = TIERS[state.pending.tier].radius;
  const clamped = Math.max(r, Math.min(JAR.width - r, x));
  return { ...state, pending: { ...state.pending, x: clamped } };
}

/** Release the pending drop: it becomes physics, the queue advances. */
export function drop(state: BloomState, rand: () => number = Math.random): BloomState {
  if (state.over) return state;
  const bloom: Bloom = {
    id: state.seq,
    tier: state.pending.tier,
    x: state.pending.x,
    y: state.pending.y,
    vx: 0,
    vy: 0.5,
  };
  return {
    ...state,
    blooms: [...state.blooms, bloom],
    merges: [],
    pending: { tier: state.nextTier, x: state.pending.x, y: 60 },
    nextTier: randomTier(rand),
    seq: state.seq + 1,
  };
}

/** Runs the world until it stops changing or the limit hits. Test helper. */
export function settle(state: BloomState, maxTicks = 2400): BloomState {
  let s = state;
  for (let i = 0; i < maxTicks; i++) {
    const next = step(s);
    if (next === s) return s;
    s = next;
  }
  return s;
}
