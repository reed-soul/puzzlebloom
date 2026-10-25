/**
 * A half-played round, written as JSON, read as if it might be anything.
 *
 * Only the faces and the log are stored. The deal is a pure function of
 * `(pairs, seed)`, so the creatures are re-derived on load and never written
 * down — which means a save cannot disagree with its own deal, and a change to
 * the creature set cannot leave old saves holding cards that no longer exist.
 *
 * Every read is defensive. Storage can be disabled, full, or holding something
 * an older build wrote, and none of those is a reason to throw inside a game a
 * child is in the middle of. A save that does not survive the checks below is
 * treated as a save that was never made.
 */

import type { Board, CardFace, TurnLog } from './board';
import { deal, isLevel, type Level, PAIRS_BY_LEVEL } from './deal';

export const PROGRESS_KEY = 'pb.memory-garden.progress.v1';

export interface SavedProgress {
  readonly level: Level;
  readonly seed: number;
  readonly faces: readonly CardFace[];
  readonly log: readonly TurnLog[];
  readonly elapsedMs: number;
  readonly hintsUsed: number;
  /** The `YYYY-MM-DD` this board belongs to, when it was a daily. */
  readonly daily: string | null;
  readonly finished: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

function decodeFaces(value: unknown, size: number): CardFace[] | null {
  if (!Array.isArray(value) || value.length !== size) return null;
  const faces: CardFace[] = [];
  for (const face of value) {
    if (face !== 'down' && face !== 'up' && face !== 'kept') return null;
    faces.push(face);
  }
  // A board with more than two cards face up is not a state this game can be in.
  if (faces.filter((face) => face === 'up').length > 2) return null;
  return faces;
}

function decodeLog(value: unknown, size: number): TurnLog[] | null {
  if (!Array.isArray(value)) return null;
  const log: TurnLog[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const { a, b, matched } = entry;
    if (typeof a !== 'number' || !Number.isInteger(a) || a < 0 || a >= size) return null;
    if (typeof b !== 'number' || !Number.isInteger(b) || b < 0 || b >= size) return null;
    if (a === b) return null;
    if (typeof matched !== 'boolean') return null;
    log.push({ a, b, matched });
  }
  return log;
}

export function decodeProgress(raw: unknown): SavedProgress | null {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(parsed)) return null;
  if (!isLevel(parsed.level)) return null;
  if (typeof parsed.seed !== 'number' || !Number.isInteger(parsed.seed) || parsed.seed < 0) return null;

  const size = PAIRS_BY_LEVEL[parsed.level] * 2;
  const faces = decodeFaces(parsed.faces, size);
  if (!faces) return null;
  const log = decodeLog(parsed.log, size);
  if (!log) return null;
  if (!isCount(parsed.elapsedMs) || !isCount(parsed.hintsUsed)) return null;
  if (parsed.daily !== null && typeof parsed.daily !== 'string') return null;

  return {
    level: parsed.level,
    seed: parsed.seed >>> 0,
    faces,
    log,
    elapsedMs: Math.round(parsed.elapsedMs),
    hintsUsed: Math.round(parsed.hintsUsed),
    daily: parsed.daily ?? null,
    finished: parsed.finished === true,
  };
}

export function encodeProgress(progress: SavedProgress): string {
  return JSON.stringify({
    level: progress.level,
    seed: progress.seed >>> 0,
    faces: progress.faces,
    log: progress.log,
    elapsedMs: Math.max(0, Math.round(progress.elapsedMs)),
    hintsUsed: Math.max(0, Math.round(progress.hintsUsed)),
    daily: progress.daily,
    finished: progress.finished,
  });
}

/**
 * Rebuild the board a save describes.
 *
 * `open` is read back off the faces: the cards that are face up are exactly the
 * cards the player is holding, and their order inside the pair decides nothing
 * — the next press covers both either way.
 */
export function boardFrom(saved: SavedProgress): Board | null {
  const pairs = PAIRS_BY_LEVEL[saved.level];
  const dealt = deal(pairs, saved.seed);
  if (saved.faces.length !== dealt.creatures.length) return null;

  const open: number[] = [];
  let kept = 0;
  saved.faces.forEach((face, index) => {
    if (face === 'up') open.push(index);
    if (face === 'kept') kept += 1;
  });

  return {
    pairs,
    creatures: dealt.creatures,
    faces: [...saved.faces],
    open,
    // The log is the record of turns; a board restored from a save has taken
    // exactly as many turns as it has entries.
    turns: saved.log.length,
    kept: Math.floor(kept / 2),
    log: [...saved.log],
  };
}

/** `localStorage` itself can throw on access in a locked-down browser. */
function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readProgress(storage: StorageLike | null = defaultStorage()): SavedProgress | null {
  if (!storage) return null;
  try {
    return decodeProgress(storage.getItem(PROGRESS_KEY));
  } catch {
    return null;
  }
}

export function writeProgress(progress: SavedProgress, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(PROGRESS_KEY, encodeProgress(progress));
  } catch {
    /* Private mode, or the quota is full. Losing a save is survivable. */
  }
}

export function clearProgress(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(PROGRESS_KEY);
  } catch {
    /* Nothing stored, nothing to remove. */
  }
}
