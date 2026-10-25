import { describe, expect, it } from 'vitest';
import {
  clearProgress,
  decodeProgress,
  encodeProgress,
  type Figure,
  figureById,
  PIECE_IDS,
  PROGRESS_KEY,
  readProgress,
  type SavedProgress,
  type StorageLike,
  writeProgress,
} from '../src/index';

const box = figureById('box') as Figure;

const saved = (overrides: Partial<SavedProgress> = {}): SavedProgress => ({
  figureId: 'box',
  placements: box.pieces,
  elapsedMs: 92_400,
  hintsUsed: 2,
  daily: null,
  finished: false,
  ...overrides,
});

function memoryStorage(): StorageLike & { readonly size: () => number } {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
    size: () => items.size,
  };
}

describe('encode and decode', () => {
  it('round-trips everything it says it stores', () => {
    const restored = decodeProgress(encodeProgress(saved({ daily: '2026-03-04' })));
    if (!restored) throw new Error('did not decode');
    expect(restored.figureId).toBe('box');
    expect(restored.elapsedMs).toBe(92_400);
    expect(restored.hintsUsed).toBe(2);
    expect(restored.daily).toBe('2026-03-04');
    expect(restored.finished).toBe(false);
    // The save keeps the figure's authoring order, which is not the same as
    // PIECE_IDS, so match by id rather than by position in the array.
    expect(restored.placements.map((piece) => piece.id).sort()).toEqual([...PIECE_IDS].sort());
    for (const piece of restored.placements) {
      const original = box.pieces.find((candidate) => candidate.id === piece.id);
      if (!original) throw new Error(`no ${piece.id} in the figure`);
      expect(piece.cx).toBeCloseTo(original.cx, 3);
      expect(piece.cy).toBeCloseTo(original.cy, 3);
      expect(piece.rotation).toBe(original.rotation);
      expect(piece.flipped).toBe(original.flipped);
    }
  });

  it('reads like something a person could squint at', () => {
    const text = encodeProgress(saved());
    expect(text.startsWith('1|box|-|92400|2|0|')).toBe(true);
    expect(text).toContain('large-1:');
    expect(text).toContain(';');
  });

  it('treats rubbish as no save at all, never as an error', () => {
    for (const rubbish of ['', 'x', '1|nope|-|0|0|0|', '1|box|-|0|0|0|', '2|box|-|0|0|0|large-1:1,1,0,0']) {
      expect(decodeProgress(rubbish)).toBeNull();
    }
    expect(decodeProgress(null)).toBeNull();
    expect(decodeProgress(42)).toBeNull();
  });

  it('refuses a rotation that is not a step', () => {
    const text = encodeProgress(saved());
    const broken = text.replace(/large-1:([\d.-]+),([\d.-]+),\d,/, 'large-1:$1,$2,9,');
    expect(broken).not.toBe(text);
    expect(decodeProgress(broken)).toBeNull();
  });

  it('refuses a figure it has never heard of', () => {
    expect(decodeProgress(encodeProgress(saved()).replace('|box|', '|castle|'))).toBeNull();
  });
});

describe('storage', () => {
  it('writes, reads and clears', () => {
    const storage = memoryStorage();
    writeProgress(saved({ figureId: 'bench' }), storage);
    expect(storage.size()).toBe(1);
    expect(readProgress(storage)?.figureId).toBe('bench');
    clearProgress(storage);
    expect(readProgress(storage)).toBeNull();
  });

  it('survives a storage that throws', () => {
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
    expect(() => writeProgress(saved(), hostile)).not.toThrow();
    expect(readProgress(hostile)).toBeNull();
    expect(() => clearProgress(hostile)).not.toThrow();
  });

  it('uses the namespaced key the parents page promises to clear', () => {
    expect(PROGRESS_KEY.startsWith('pb.')).toBe(true);
    expect(PROGRESS_KEY).toBe('pb.tangram.progress.v1');
  });
});
