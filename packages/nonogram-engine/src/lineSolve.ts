/**
 * What one line can prove on its own.
 *
 * Given a line of cells the player has marked and the clue printed beside it,
 * this answers two questions: which cells are filled in *every* arrangement
 * that fits, and which are blank in every arrangement. Those are the only two
 * claims a hint is allowed to make, so they have to be exact rather than
 * plausible.
 *
 * The method is a position DP — `forward[j][i]` is "the first i cells can hold
 * the first j runs" — and its mirror image from the right. A cell is fillable
 * if some placement of some run covers it with both sides consistent. That is
 * O(n·k) per line instead of the 2ⁿ of enumeration, which matters because a
 * 10-wide line is the *small* size here: the same function has to stay honest
 * on a 15-wide one, and a brute force that only just fits is a trap for
 * whoever grows the grid next.
 *
 * `solveLineByExhaustion` below is the reference implementation. It is wrong
 * for anything wider than a dozen cells and it exists to be compared against:
 * the unit tests run several hundred random lines through both and fail on any
 * disagreement. That is the only evidence that a hint cannot lie.
 */

import { type Clue, clueRuns } from './clues';

/** A line cell as the deduction sees it. `unknown` is "nothing marked yet". */
export type LineCell = 'filled' | 'empty' | 'unknown';

export interface LineDeduction {
  /** Indices that are filled in every arrangement that fits the clue. */
  filled: number[];
  /** Indices that are blank in every arrangement that fits the clue. */
  empty: number[];
  /** False when no arrangement fits: the line as marked is impossible. */
  consistent: boolean;
}

const UNKNOWN_RESULT: LineDeduction = { filled: [], empty: [], consistent: false };

/**
 * The DP itself.
 *
 * `forward[j][i]`: cells [0, i) are accounted for by runs 0..j-1, and cell i-1
 * (if any) has been decided. Two ways to extend it: leave cell i-1 blank, or
 * end run j-1 at cell i-1. The second requires the cell before the run to be
 * blank, which is what keeps two runs from touching.
 *
 * `backward[j][i]` is the same statement read from the right: cells [i, n) can
 * be accounted for by runs j..k-1, with cell i free to start a run.
 */
export function solveLine(cells: readonly LineCell[], clue: Clue): LineDeduction {
  const n = cells.length;
  if (n === 0) return UNKNOWN_RESULT;

  const runs = clueRuns(clue);
  const k = runs.length;

  const canFill: boolean[] = new Array(n);
  const canBlank: boolean[] = new Array(n);
  const fillPrefix: number[] = new Array(n + 1);
  fillPrefix[0] = 0;
  for (let i = 0; i < n; i++) {
    canFill[i] = cells[i] !== 'empty';
    canBlank[i] = cells[i] !== 'filled';
    fillPrefix[i + 1] = fillPrefix[i] + (canFill[i] ? 1 : 0);
  }

  const allFillable = (from: number, to: number): boolean =>
    from >= 0 && to <= n && fillPrefix[to] - fillPrefix[from] === to - from;

  // forward[j][i], j in 0..k, i in 0..n
  const forward: boolean[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(false));
  forward[0][0] = true;
  for (let j = 0; j <= k; j++) {
    for (let i = 0; i <= n; i++) {
      let ok = forward[j][i];
      // Spend this cell on nothing.
      if (!ok && i > 0 && forward[j][i - 1] && canBlank[i - 1]) ok = true;
      // End run j-1 on this cell.
      if (!ok && j > 0) {
        const length = runs[j - 1];
        const start = i - length;
        if (start >= 0 && allFillable(start, i)) {
          if (start === 0) ok = j - 1 === 0;
          else ok = canBlank[start - 1] && forward[j - 1][start - 1];
        }
      }
      forward[j][i] = ok;
    }
  }

  if (!forward[k][n]) return { filled: [], empty: [], consistent: false };

  // backward[j][i], filled right to left and bottom to top.
  const backward: boolean[][] = Array.from({ length: k + 1 }, () => new Array(n + 1).fill(false));
  backward[k][n] = true;
  for (let j = k; j >= 0; j--) {
    for (let i = n; i >= 0; i--) {
      let ok = backward[j][i];
      if (!ok && i < n && canBlank[i] && backward[j][i + 1]) ok = true;
      if (!ok && j < k) {
        const end = i + runs[j];
        if (end <= n && allFillable(i, end)) {
          if (end === n) ok = j + 1 === k;
          else ok = canBlank[end] && backward[j + 1][end + 1];
        }
      }
      backward[j][i] = ok;
    }
  }

  /**
   * Cells [0, i) settled and cell i-1 left blank, so run j may start at i.
   *
   * The blank cell is the load-bearing part: `forward[j][i]` alone is also true
   * when a run *ends* at i-1, and a run that ends at i-1 cannot be followed
   * immediately by another one — that would be a single longer run.
   */
  const startable = (j: number, i: number): boolean =>
    i === 0 ? j === 0 : forward[j][i - 1] && canBlank[i - 1];

  /** The cells after a run starting at `start` can absorb the remaining runs. */
  const tailOk = (j: number, start: number): boolean => {
    const end = start + runs[j];
    if (end === n) return j + 1 === k;
    return canBlank[end] && backward[j + 1][end + 1];
  };

  const fillable: boolean[] = new Array(n).fill(false);
  const blankable: boolean[] = new Array(n).fill(false);

  for (let j = 0; j < k; j++) {
    const length = runs[j];
    for (let start = 0; start + length <= n; start++) {
      if (!startable(j, start) || !allFillable(start, start + length) || !tailOk(j, start)) continue;
      for (let t = start; t < start + length; t++) fillable[t] = true;
    }
  }

  // A cell is blank in some arrangement exactly when the runs before it end at
  // or before it and the runs after it start at or after it: one split point,
  // looked up from both sides. The neighbours do not need a `canBlank` test —
  // each side is already placed inside its own half — but the cell itself does:
  // it is only blank if being blank is allowed.
  for (let t = 0; t < n; t++) {
    if (!canBlank[t]) continue;
    for (let j = 0; j <= k; j++) {
      if (forward[j][t] && backward[j][t + 1]) {
        blankable[t] = true;
        break;
      }
    }
  }

  const filled: number[] = [];
  const empty: number[] = [];
  for (let t = 0; t < n; t++) {
    if (fillable[t] && !blankable[t]) filled.push(t);
    else if (!fillable[t] && blankable[t]) empty.push(t);
  }

  return { filled, empty, consistent: true };
}

/**
 * Every arrangement, counted the slow way. The oracle, not the engine.
 *
 * Two to the n, so it is only usable on short lines — which is exactly why the
 * engine cannot use it and why the tests can. It also reports arrangements
 * that no clue-consistent reasoning would ever consider, so agreement between
 * the two is real evidence rather than two versions of the same mistake.
 */
export function solveLineByExhaustion(cells: readonly LineCell[], clue: Clue): LineDeduction {
  const n = cells.length;
  if (n === 0) return UNKNOWN_RESULT;

  const runs = clueRuns(clue);
  const target = runs.join(',');
  const fillable: boolean[] = new Array(n).fill(false);
  const blankable: boolean[] = new Array(n).fill(false);
  let arrangements = 0;

  const line: number[] = new Array(n).fill(0);
  const walk = (index: number): void => {
    if (index === n) {
      if (readClue(line) !== target) return;
      arrangements += 1;
      for (let t = 0; t < n; t++) {
        if (line[t]) fillable[t] = true;
        else blankable[t] = true;
      }
      return;
    }
    const state = cells[index];
    if (state !== 'empty') {
      line[index] = 1;
      walk(index + 1);
    }
    if (state !== 'filled') {
      line[index] = 0;
      walk(index + 1);
    }
  };
  walk(0);

  if (arrangements === 0) return { filled: [], empty: [], consistent: false };

  const filled: number[] = [];
  const empty: number[] = [];
  for (let t = 0; t < n; t++) {
    if (fillable[t] && !blankable[t]) filled.push(t);
    else if (!fillable[t] && blankable[t]) empty.push(t);
  }
  return { filled, empty, consistent: true };
}

/** Run lengths of a 0/1 line, as a comparable string. */
function readClue(line: readonly number[]): string {
  const runs: number[] = [];
  let run = 0;
  for (const cell of line) {
    if (cell) run += 1;
    else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);
  return runs.join(',');
}
