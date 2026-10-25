/**
 * A half-finished figure, written as one short string.
 *
 * The board is the only thing worth saving, and it is seven placements of four
 * numbers, so it is stored as `large-1:2.53,1.4,3,0;…` — semicolon between
 * pieces, comma between fields. One string a person could squint at, and one a
 * previous version could plausibly have written.
 *
 * Every read is defensive. Storage can be disabled, full, or holding something
 * an older build wrote, and none of those is a reason to throw inside a game a
 * child is in the middle of. A save that does not parse is treated as a save
 * that was never made.
 */

import { figureById } from './figures';
import { normaliseRotation, type Placement } from './geometry';
import { isPieceId, PIECE_IDS, type PieceId } from './pieces';

export const PROGRESS_KEY = 'pb.tangram.progress.v1';
export const PROGRESS_VERSION = 1;

export interface SavedProgress {
  readonly figureId: string;
  readonly placements: readonly Placement[];
  readonly elapsedMs: number;
  readonly hintsUsed: number;
  readonly daily: string | null;
  readonly finished: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Four decimals is finer than a vertex snap will ever need, and keeps the string short. */
const number = (value: number): string => `${Math.round(value * 1e4) / 1e4}`;

function encodePlacement(where: Placement): string {
  const rotation = normaliseRotation(where.rotation);
  return `${where.id}:${number(where.cx)},${number(where.cy)},${rotation},${where.flipped ? 1 : 0}`;
}

export function encodeProgress(progress: SavedProgress): string {
  return [
    PROGRESS_VERSION,
    progress.figureId,
    progress.daily ?? '-',
    Math.max(0, Math.round(progress.elapsedMs)),
    Math.max(0, Math.round(progress.hintsUsed)),
    progress.finished ? '1' : '0',
    progress.placements.map(encodePlacement).join(';'),
  ].join('|');
}

function decodePlacements(text: string): Placement[] | null {
  const parts = text.split(';').filter((part) => part.length > 0);
  // All seven, always: a piece is either on the board or in the tray, and both
  // are positions. A save missing one has nothing sensible to restore.
  if (parts.length !== PIECE_IDS.length) return null;
  const seen = new Set<PieceId>();
  const placements: Placement[] = [];
  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) return null;
    const id = part.slice(0, colon);
    if (!isPieceId(id) || seen.has(id)) return null;
    const fields = part.slice(colon + 1).split(',');
    if (fields.length !== 4) return null;
    const values = fields.map(Number);
    if (!values.every((value) => Number.isFinite(value))) return null;
    const [cx, cy, rotation, flipped] = values;
    if (!Number.isInteger(rotation) || rotation < 0 || rotation > 7) return null;
    if (flipped !== 0 && flipped !== 1) return null;
    seen.add(id);
    placements.push({ id, cx, cy, rotation, flipped: flipped === 1 });
  }
  return placements;
}

export function decodeProgress(raw: unknown): SavedProgress | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const fields = raw.split('|');
  if (fields.length !== 7) return null;
  if (Number(fields[0]) !== PROGRESS_VERSION) return null;

  const figure = figureById(fields[1]);
  if (!figure) return null;

  const elapsedMs = Number(fields[3]);
  const hintsUsed = Number(fields[4]);
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(hintsUsed)) return null;

  const placements = decodePlacements(fields[6]);
  if (!placements) return null;

  return {
    figureId: figure.id,
    placements,
    elapsedMs: Math.max(0, elapsedMs),
    hintsUsed: Math.max(0, hintsUsed),
    daily: fields[2] === '-' ? null : fields[2],
    finished: fields[5] === '1',
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
