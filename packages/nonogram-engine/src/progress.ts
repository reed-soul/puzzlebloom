/**
 * A half-finished picture, written as one short string.
 *
 * The board is the only thing worth saving, and it is a hundred cells in three
 * states, so it is stored run-length encoded — `25.8#3.` is a mostly empty
 * 10×10 and reads almost like the picture itself. The surrounding fields are
 * semicolon-separated rather than JSON because the whole point is that this is
 * one string a person could look at and a previous version could have written.
 *
 * Every read is defensive. Storage can be disabled, full, or hold something an
 * older version wrote, and none of those is a reason to throw inside a game a
 * child is in the middle of.
 */

import { BLANK, CROSS, FILL } from './board';
import { pictureById, pictureWidth, type Size } from './pictures';

export const PROGRESS_KEY = 'pb.nonogram.progress.v1';
export const PROGRESS_VERSION = 1;

export interface SavedProgress {
  pictureId: string;
  size: Size;
  marks: Uint8Array;
  elapsedMs: number;
  hintsUsed: number;
  daily: string | null;
  finished: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MARK_CHARS = ['.', '#', 'x'] as const;

function encodeMarks(marks: Uint8Array): string {
  let out = '';
  let index = 0;
  while (index < marks.length) {
    const mark = marks[index];
    let length = 1;
    while (index + length < marks.length && marks[index + length] === mark) length += 1;
    out += `${length}${MARK_CHARS[mark] ?? '.'}`;
    index += length;
  }
  return out;
}

function decodeMarks(text: string, total: number): Uint8Array | null {
  const marks = new Uint8Array(total);
  const pattern = /(\d+)([.#x])/g;
  let filled = 0;
  let consumed = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    if (match.index !== consumed) return null;
    const count = Number(match[1]);
    if (!Number.isInteger(count) || count <= 0 || filled + count > total) return null;
    const mark = match[2] === '#' ? FILL : match[2] === 'x' ? CROSS : BLANK;
    marks.fill(mark, filled, filled + count);
    filled += count;
    consumed = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (consumed !== text.length || filled !== total) return null;
  return marks;
}

export function encodeProgress(progress: SavedProgress): string {
  return [
    PROGRESS_VERSION,
    progress.pictureId,
    progress.size,
    encodeMarks(progress.marks),
    Math.max(0, Math.round(progress.elapsedMs)),
    Math.max(0, Math.round(progress.hintsUsed)),
    progress.daily ?? '-',
    progress.finished ? '1' : '0',
  ].join(';');
}

export function decodeProgress(raw: unknown): SavedProgress | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const fields = raw.split(';');
  if (fields.length !== 8) return null;
  if (Number(fields[0]) !== PROGRESS_VERSION) return null;

  const picture = pictureById(fields[1]);
  if (!picture) return null;

  const size = Number(fields[2]);
  if (size !== 5 && size !== 10) return null;
  if (picture.rows !== size || pictureWidth(picture) !== size) return null;

  const marks = decodeMarks(fields[3], picture.rows * pictureWidth(picture));
  if (!marks) return null;

  const elapsedMs = Number(fields[4]);
  const hintsUsed = Number(fields[5]);
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(hintsUsed)) return null;

  return {
    pictureId: picture.id,
    size,
    marks,
    elapsedMs: Math.max(0, elapsedMs),
    hintsUsed: Math.max(0, hintsUsed),
    daily: fields[6] === '-' ? null : fields[6],
    finished: fields[7] === '1',
  };
}

/**
 * `localStorage` itself can throw on access in a locked-down browser, so even
 * reaching for it is inside the guard.
 */
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
