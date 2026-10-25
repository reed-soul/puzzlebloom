/**
 * Clues: a line of cells, read as the lengths of its filled runs.
 *
 * A clue is a list of run lengths. An empty line is `[0]`, not `[]`, because
 * that is how it is printed next to the grid and how a player reads it — a `0`
 * says "nothing here", which is a fact, while an empty list looks like missing
 * data.
 */

export type Clue = number[];

/** The clue of a line with no filled cells. Shared, so the identity is stable. */
export const EMPTY_CLUE: Clue = [0];

/**
 * Accepts booleans or 0/1 numbers because the two callers differ: the picture
 * reader has cells, the solver has states it has already narrowed to one value.
 */
export function lineToClue(cells: ReadonlyArray<boolean | number>): Clue {
  const runs: number[] = [];
  let run = 0;
  for (const cell of cells) {
    if (cell) {
      run += 1;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);
  return runs.length > 0 ? runs : EMPTY_CLUE;
}

/** Drops the `0` and any stray zero, leaving the run lengths the DP works on. */
export function clueRuns(clue: Clue): number[] {
  return clue.filter((run) => run > 0);
}

/** How many cells the line must fill, whatever the arrangement. */
export function clueLength(clue: Clue): number {
  let total = 0;
  for (const run of clue) total += Math.max(run, 0);
  return total;
}

/** The narrowest the clue can be drawn: runs plus at least one gap between. */
export function clueSpan(clue: Clue): number {
  const runs = clueRuns(clue);
  if (runs.length === 0) return 0;
  return clueLength(runs) + runs.length - 1;
}

/** The clue as it is printed beside the grid: `1 2`, or `0` for an empty line. */
export function clueText(clue: Clue): string {
  const runs = clueRuns(clue);
  return runs.length === 0 ? '0' : runs.join(' ');
}
