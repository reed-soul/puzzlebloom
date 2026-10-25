/**
 * The drawings, and the reason the game needs no score.
 *
 * A puzzle here is never a random grid with holes cut out of it. It is one of
 * these pictures read backwards: the clues are derived from the drawing, so the
 * drawing is by construction a solution, it is the only solution, and finishing
 * the puzzle reveals a picture. That is the whole reward loop — the picture
 * appears — which is why nothing else in this game counts, times or grades the
 * player.
 *
 * The grids are written as text because a matrix of booleans is unreadable, and
 * these shapes are the one thing in this package a person has to be able to
 * check by eye. `definePicture` refuses a ragged grid at import time, so a
 * miscounted row is a failing test rather than a picture with a quiet gap in it.
 */

export interface Picture {
  /** Stable id. Doubles as the key in a saved game. */
  id: string;
  /** The name shown when the picture is finished. */
  name: string;
  /** How many rows the drawing has. Width is read from the first row. */
  rows: number;
  /** One string per row: `#` is filled, `.` is blank. */
  grid: string[];
}

function definePicture(id: string, name: string, grid: string[]): Picture {
  const width = grid[0]?.length ?? 0;
  if (grid.length === 0 || width === 0) {
    throw new Error(`Picture "${id}" has no cells`);
  }
  for (const [index, row] of grid.entries()) {
    if (row.length !== width) {
      throw new Error(`Picture "${id}" row ${index} is ${row.length} wide, want ${width}`);
    }
    if (!/^[#.]+$/.test(row)) {
      throw new Error(`Picture "${id}" row ${index} uses a character other than # or .`);
    }
  }
  return { id, name, rows: grid.length, grid };
}

/**
 * Five by five. Wide runs, few of them: a first puzzle should be solvable by
 * reading one line at a time and noticing the line that is almost full.
 */
const SMALL_GRIDS: Picture[] = [
  definePicture('leaf', 'Leaf', ['.....', '.###.', '#####', '.###.', '..#..']),
  definePicture('toadstool', 'Toadstool', ['.###.', '#####', '..#..', '.###.', '.###.']),
  definePicture('cat', 'Cat', ['#...#', '#####', '##.##', '#####', '#.#.#']),
  definePicture('fish', 'Fish', ['....#', '#####', '####.', '#####', '....#']),
];

/**
 * Ten by ten. The runs get longer and the gaps start to matter, which is the
 * actual new skill at this size — holding a line's numbers in mind while
 * counting where they cannot reach.
 */
const MEDIUM_GRIDS: Picture[] = [
  definePicture('moon', 'Crescent moon', [
    '...####...',
    '..###.....',
    '.###......',
    '.###......',
    '.###......',
    '.###......',
    '.###......',
    '.###......',
    '..###.....',
    '...####...',
  ]),
  definePicture('tulip', 'Tulip', [
    '...####...',
    '..######..',
    '..######..',
    '...####...',
    '....##....',
    '....##....',
    '....##....',
    '...####...',
    '..######..',
    '..........',
  ]),
  definePicture('fish-big', 'Fish', [
    '..........',
    '..........',
    '....##....',
    '..######..',
    '.#########',
    '.#########',
    '..######..',
    '....##....',
    '..........',
    '..........',
  ]),
  definePicture('tree', 'Tree', [
    '....##....',
    '...####...',
    '..######..',
    '.########.',
    '..######..',
    '.########.',
    '##########',
    '....##....',
    '....##....',
    '....##....',
  ]),
];

export type Size = 5 | 10;

export const PICTURES: readonly Picture[] = [...SMALL_GRIDS, ...MEDIUM_GRIDS];

export const SIZES: readonly Size[] = [5, 10];

export function picturesOfSize(size: Size): readonly Picture[] {
  return size === 5 ? SMALL_GRIDS : MEDIUM_GRIDS;
}

export function pictureById(id: string): Picture | null {
  return PICTURES.find((picture) => picture.id === id) ?? null;
}

/** Every picture here is square, but the type does not insist on it. */
export function pictureWidth(picture: Picture): number {
  return picture.grid[0].length;
}

/** 1 where the picture is filled, 0 elsewhere, reading order. */
export function solutionOf(picture: Picture): Uint8Array {
  const width = pictureWidth(picture);
  const cells = new Uint8Array(picture.rows * width);
  for (let row = 0; row < picture.rows; row++) {
    for (let col = 0; col < width; col++) {
      cells[row * width + col] = picture.grid[row][col] === '#' ? 1 : 0;
    }
  }
  return cells;
}
