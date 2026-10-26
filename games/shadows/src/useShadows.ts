import {
  type Complaint,
  complaints,
  emptyPlot,
  type Heights,
  LEVELS,
  type Level,
  lower,
  matches,
  type Report,
  raise,
  report,
  stoneCount,
} from '@puzzlebloom/shadows-engine';
import { useCallback, useMemo, useState } from 'react';

/** Which way a tap on the plot goes: a stone on, or the top stone off. */
export type StackMode = 'place' | 'lift';

export interface ShadowsGame {
  level: Level;
  levelIndex: number;
  levelCount: number;
  heights: Heights;
  mode: StackMode;
  stones: number;
  report: Report;
  solved: boolean;
  /** The one thing worth saying about the plot right now, or nothing. */
  hint: Complaint | null;
  chooseMode: (mode: StackMode) => void;
  tap: (cell: number) => void;
  askForHint: () => void;
  forgetHint: () => void;
  restart: () => void;
  nextLevel: () => void;
}

/**
 * The whole of the game's state, and the only place that knows it is holding a
 * level index rather than a level.
 *
 * Nothing here touches the DOM, a camera or a canvas: the engine says what the
 * plot casts, this says what the player did, and the screen decides what that
 * looks like. The three are separate because the middle one is the only one
 * worth testing at this size — and it is three fields.
 */
export function useShadows(): ShadowsGame {
  const [levelIndex, setLevelIndex] = useState(0);
  const [heights, setHeights] = useState<Heights>(emptyPlot);
  const [mode, setMode] = useState<StackMode>('place');
  const [hint, setHint] = useState<Complaint | null>(null);

  const level = LEVELS[levelIndex];
  const solved = matches(heights, level.target);
  const standing = useMemo(() => report(heights, level.target), [heights, level]);

  /**
   * One handler for both directions, decided by the mode rather than by which
   * button was pressed. A separate "lift" handler would have to be repeated on
   * the plot grid, the canvas and anything else that can point at a column, and
   * the three copies would drift the first time one of them gained a rule.
   */
  const tap = useCallback(
    (cell: number) => {
      if (solved) return; // the shadows already agree; leave the figure alone
      setHeights((current) => (mode === 'lift' ? lower(current, cell) : raise(current, cell)));
      setHint(null);
    },
    [mode, solved],
  );

  const restart = useCallback(() => {
    setHeights(emptyPlot());
    setHint(null);
  }, []);

  const nextLevel = useCallback(() => {
    setLevelIndex((current) => (current + 1) % LEVELS.length);
    setHeights(emptyPlot());
    setHint(null);
    setMode('place');
  }, []);

  return {
    level,
    levelIndex,
    levelCount: LEVELS.length,
    heights,
    mode,
    stones: stoneCount(heights),
    report: standing,
    solved,
    hint,
    chooseMode: setMode,
    tap,
    // Read on demand rather than derived on every render: a hint is a thing you
    // ask for, and one that appeared by itself would be the game telling a
    // child they are wrong while they are still thinking.
    askForHint: () => setHint(complaints(heights, level.target)[0] ?? null),
    forgetHint: () => setHint(null),
    restart,
    nextLevel,
  };
}
