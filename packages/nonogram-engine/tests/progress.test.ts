import { describe, expect, it } from 'vitest';
import { BLANK, CROSS, FILL } from '../src/board';
import { pictureById } from '../src/pictures';
import {
  clearProgress,
  decodeProgress,
  encodeProgress,
  PROGRESS_KEY,
  readProgress,
  type SavedProgress,
  type StorageLike,
  writeProgress,
} from '../src/progress';
import { puzzleByPictureId } from '../src/puzzle';

const memoryStorage = (): StorageLike & { dump: Map<string, string> } => {
  const dump = new Map<string, string>();
  return {
    dump,
    getItem: (key) => dump.get(key) ?? null,
    setItem: (key, value) => {
      dump.set(key, value);
    },
    removeItem: (key) => {
      dump.delete(key);
    },
  };
};

const sample = (): SavedProgress => {
  const puzzle = puzzleByPictureId('leaf');
  if (!puzzle) throw new Error('the leaf picture is part of the library');
  const marks = new Uint8Array(puzzle.rows * puzzle.cols);
  marks[7] = FILL;
  marks[8] = CROSS;
  marks[3] = FILL;
  return {
    pictureId: 'leaf',
    size: 5,
    marks,
    elapsedMs: 84_000,
    hintsUsed: 2,
    daily: null,
    finished: false,
  };
};

describe('encodeProgress', () => {
  it('writes one short string, with runs collapsed', () => {
    const text = encodeProgress(sample());
    expect(text.startsWith('1;leaf;5;')).toBe(true);
    expect(text).toContain('3.1#1x');
    expect(text).not.toContain('\n');
  });

  it('marks a daily puzzle and a finished one', () => {
    const text = encodeProgress({ ...sample(), daily: '2026-10-25', finished: true });
    expect(text.endsWith(';2026-10-25;1')).toBe(true);
    expect(encodeProgress(sample()).endsWith(';-;0')).toBe(true);
  });
});

describe('decodeProgress', () => {
  it('round-trips marks exactly', () => {
    const original = sample();
    const restored = decodeProgress(encodeProgress(original));
    expect(restored).not.toBeNull();
    expect(restored?.pictureId).toBe(original.pictureId);
    expect(restored?.elapsedMs).toBe(original.elapsedMs);
    expect(restored?.hintsUsed).toBe(2);
    expect(Array.from(restored?.marks ?? [])).toEqual(Array.from(original.marks));
  });

  it('keeps an untouched board untouched', () => {
    const puzzle = puzzleByPictureId('tree');
    if (!puzzle) throw new Error('the tree picture is part of the library');
    const marks = new Uint8Array(puzzle.rows * puzzle.cols);
    const restored = decodeProgress(encodeProgress({ ...sample(), pictureId: 'tree', size: 10, marks }));
    expect(Array.from(restored?.marks ?? [])).toEqual(Array.from(marks));
    expect(restored?.marks?.every((mark) => mark === BLANK)).toBe(true);
  });

  it('treats anything unexpected as no save at all', () => {
    expect(decodeProgress(null)).toBeNull();
    expect(decodeProgress('')).toBeNull();
    expect(decodeProgress('nonsense')).toBeNull();
    expect(decodeProgress('1;leaf;5;25.;1;0;-;0')).not.toBeNull(); // a blank board is a board
    expect(decodeProgress('2;leaf;5;25.;1;0;-;0')).toBeNull(); // unknown version
    expect(decodeProgress('1;ghost;5;25.;1;0;-;0')).toBeNull(); // no such picture
    expect(decodeProgress('1;leaf;7;25.;1;0;-;0')).toBeNull(); // size disagrees
    expect(decodeProgress('1;leaf;5;25;1;0;-;0')).toBeNull(); // no run characters
    expect(decodeProgress('1;leaf;5;26.;1;0;-;0')).toBeNull(); // too many cells
    expect(decodeProgress('1;leaf;5;25.;oops;0;-;0')).toBeNull(); // not a number
    expect(decodeProgress('1;leaf;5;25.')).toBeNull(); // truncated
  });
});

describe('storage', () => {
  it('writes, reads and clears', () => {
    const storage = memoryStorage();
    writeProgress(sample(), storage);
    expect(storage.dump.has(PROGRESS_KEY)).toBe(true);
    expect(readProgress(storage)?.pictureId).toBe('leaf');
    clearProgress(storage);
    expect(readProgress(storage)).toBeNull();
  });

  it('does not throw when storage itself throws', () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => writeProgress(sample(), hostile)).not.toThrow();
    expect(readProgress(hostile)).toBeNull();
    expect(() => clearProgress(hostile)).not.toThrow();
  });

  it('starts from nothing when there is no storage', () => {
    expect(readProgress(null)).toBeNull();
    expect(() => writeProgress(sample(), null)).not.toThrow();
    expect(() => clearProgress(null)).not.toThrow();
  });

  it('only ever names pictures that exist', () => {
    expect(pictureById(sample().pictureId)).not.toBeNull();
  });
});
