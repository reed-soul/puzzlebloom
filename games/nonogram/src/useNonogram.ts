/**
 * The Nonogram screen's whole state, in one hook.
 *
 * Three decisions shape this file.
 *
 * 1. Marks live in a `Uint8Array` held in a ref and mirrored into state. A
 *    drag paints twenty cells a second, and cloning a hundred-cell array per
 *    event would be fine but pointless; the ref is the truth and the state
 *    value is the snapshot React renders from, so a re-render can never show a
 *    half-applied stroke.
 *
 * 2. A stroke is one undo step, not one cell. Dragging across a row and then
 *    pressing undo should take you back to before the drag — anything else
 *    makes undo useless at exactly the moment it is needed.
 *
 * 3. Nothing here penalises a mistake. A wrong square is not marked wrong, no
 *    counter goes up. The picture either matches or it does not, and the hint
 *    is the only voice allowed to say otherwise.
 */

import {
  BLANK,
  blankMarks,
  CROSS,
  clearProgress,
  dailyPuzzle,
  FILL,
  type Hint,
  isMark,
  localDateKey,
  type Mark,
  nextHint,
  type Puzzle,
  pictureComplete,
  puzzleByPictureId,
  puzzlesOfSize,
  readProgress,
  type Size,
  writeProgress,
} from '@puzzlebloom/nonogram-engine';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Clock, createClock, formatClock } from './clock';

/** Deep enough to undo a whole puzzle without holding on to anything large. */
const MAX_HISTORY = 80;

export type PlayMode = 'fill' | 'cross';
export type GameStatus = 'loading' | 'ready';

export interface NonogramController {
  status: GameStatus;
  puzzle: Puzzle | null;
  marks: Uint8Array;
  size: Size;
  mode: PlayMode;
  focusIndex: number;
  hint: Hint | null;
  paused: boolean;
  solved: boolean;
  isDaily: boolean;
  dailyDate: string | null;
  clock: string;
  hintsUsed: number;
  filled: number;
  canUndo: boolean;
  setMode: (mode: PlayMode) => void;
  toggleMode: () => void;
  focusCell: (index: number) => void;
  paint: (index: number, mark: Mark) => void;
  markCell: (index: number, action?: PlayMode) => void;
  startStroke: (index: number, action?: PlayMode) => void;
  continueStroke: (index: number) => void;
  endStroke: () => void;
  undo: () => void;
  clear: () => void;
  askHint: () => void;
  applyHint: () => void;
  dismissHint: () => void;
  pause: () => void;
  resume: () => void;
  newPuzzle: (size?: Size) => void;
  playDaily: () => void;
}

export function useNonogram(): NonogramController {
  const [status, setStatus] = useState<GameStatus>('loading');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [marks, setMarks] = useState<Uint8Array>(() => new Uint8Array(0));
  const [size, setSize] = useState<Size>(5);
  const [mode, setMode] = useState<PlayMode>('fill');
  const [focusIndex, setFocusIndex] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [paused, setPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyDate, setDailyDate] = useState<string | null>(null);

  const puzzleRef = useRef<Puzzle | null>(null);
  const marksRef = useRef<Uint8Array>(new Uint8Array(0));
  const historyRef = useRef<Uint8Array[]>([]);
  const clockRef = useRef<Clock>(createClock());
  const strokeRef = useRef<{ target: Mark } | null>(null);
  const hintsUsedRef = useRef(0);
  const dailyRef = useRef<string | null>(null);

  const persist = useCallback((finished: boolean) => {
    const current = puzzleRef.current;
    if (!current) return;
    writeProgress({
      pictureId: current.pictureId,
      size: current.rows === 10 ? 10 : 5,
      marks: marksRef.current,
      elapsedMs: clockRef.current.elapsedMs,
      hintsUsed: hintsUsedRef.current,
      daily: dailyRef.current,
      finished,
    });
  }, []);

  /**
   * The single write path. Every change to a mark goes through here, which is
   * what makes "the picture is finished" impossible to miss: there is one place
   * a board can become complete, and it is this one.
   */
  const commit = useCallback(
    (change: (next: Uint8Array) => boolean) => {
      const next = Uint8Array.from(marksRef.current);
      if (!change(next)) return;
      marksRef.current = next;
      setMarks(next);

      const current = puzzleRef.current;
      if (current && pictureComplete(next, current)) {
        clockRef.current.pause();
        setElapsed(clockRef.current.elapsedMs);
        setSolved(true);
        setHint(null);
        persist(true);
        return;
      }
      persist(false);
    },
    [persist],
  );

  const remember = useCallback(() => {
    historyRef.current.push(Uint8Array.from(marksRef.current));
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
  }, []);

  /**
   * The one place a mark changes.
   *
   * `record` exists because a stroke is one undo step, not one cell: the snapshot
   * is taken when the gesture starts and every cell under the finger joins that
   * same snapshot. Without it, undoing a drag would take twenty presses and the
   * button would be useless at exactly the moment it is wanted.
   */
  const applyMark = useCallback(
    (index: number, mark: Mark, record: boolean) => {
      if (!isMark(mark) || paused || solved) return;
      if (index < 0 || index >= marksRef.current.length) return;
      if (marksRef.current[index] === mark) return;
      if (record) remember();
      commit((next) => {
        next[index] = mark;
        return true;
      });
      setHint(null);
    },
    [commit, paused, remember, solved],
  );

  const paint = useCallback((index: number, mark: Mark) => applyMark(index, mark, true), [applyMark]);

  /**
   * A tap, a keypress or a hint: one cell, decided by the current mode. Pressing
   * fill on a filled cell clears it, because the second press is how you undo a
   * finger that landed in the wrong place.
   */
  const markCell = useCallback(
    (index: number, action?: PlayMode) => {
      const wanted: Mark = (action ?? mode) === 'cross' ? CROSS : FILL;
      paint(index, marksRef.current[index] === wanted ? BLANK : wanted);
    },
    [mode, paint],
  );

  /**
   * The promise of a drag: the action is decided by the first cell and kept for
   * the rest of the gesture. Without this, dragging across a row flips each
   * cell it passes and the row becomes a mess that has to be cleared.
   */
  const startStroke = useCallback(
    (index: number, action?: PlayMode) => {
      if (paused || solved) return;
      const wanted: Mark = (action ?? mode) === 'cross' ? CROSS : FILL;
      const target: Mark = marksRef.current[index] === wanted ? BLANK : wanted;
      strokeRef.current = { target };
      applyMark(index, target, true);
    },
    [applyMark, mode, paused, solved],
  );

  const continueStroke = useCallback(
    (index: number) => {
      const stroke = strokeRef.current;
      if (!stroke) return;
      applyMark(index, stroke.target, false);
    },
    [applyMark],
  );

  const endStroke = useCallback(() => {
    strokeRef.current = null;
  }, []);

  const undo = useCallback(() => {
    if (solved || paused) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    marksRef.current = previous;
    setMarks(previous);
    setHint(null);
    persist(false);
  }, [paused, persist, solved]);

  const clear = useCallback(() => {
    if (solved || paused) return;
    if (!marksRef.current.some((mark) => mark !== BLANK)) return;
    remember();
    commit((next) => {
      next.fill(BLANK);
      return true;
    });
    setHint(null);
  }, [commit, paused, remember, solved]);

  const askHint = useCallback(() => {
    const current = puzzleRef.current;
    if (!current || paused || solved) return;
    setHint(nextHint(current, marksRef.current));
  }, [paused, solved]);

  const applyHint = useCallback(() => {
    const cell = hint?.cell ?? null;
    const mark = hint?.mark ?? null;
    if (cell === null || mark === null) {
      setHint(null);
      return;
    }
    hintsUsedRef.current += 1;
    setHintsUsed(hintsUsedRef.current);
    remember();
    commit((next) => {
      next[cell] = mark;
      return true;
    });
    setFocusIndex(cell);
    setHint(null);
  }, [commit, hint, remember]);

  const dismissHint = useCallback(() => setHint(null), []);

  const pause = useCallback(() => {
    clockRef.current.pause();
    setElapsed(clockRef.current.elapsedMs);
    setPaused(true);
    persist(false);
  }, [persist]);

  const resume = useCallback(() => {
    if (solved) return;
    clockRef.current.start();
    setPaused(false);
  }, [solved]);

  const begin = useCallback(
    (nextPuzzle: Puzzle, daily: string | null, resumeMs: number, savedMarks: Uint8Array | null) => {
      puzzleRef.current = nextPuzzle;
      const blank = savedMarks ?? blankMarks(nextPuzzle);
      marksRef.current = blank;
      setMarks(blank);
      historyRef.current = [];
      hintsUsedRef.current = 0;
      setHintsUsed(0);
      strokeRef.current = null;
      dailyRef.current = daily;
      setIsDaily(Boolean(daily));
      setDailyDate(daily);
      setSize(nextPuzzle.rows === 10 ? 10 : 5);
      setPuzzle(nextPuzzle);
      setSolved(false);
      setHint(null);
      setPaused(false);
      setFocusIndex(0);
      clockRef.current.reset(resumeMs);
      clockRef.current.start();
      setElapsed(resumeMs);
      setStatus('ready');
    },
    [],
  );

  const start = useCallback(
    (nextSize: Size, daily: string | null) => {
      // Ordinary puzzles walk the picture list one step at a time, which is why
      // "another one" never deals the picture already on screen.
      const current = puzzleRef.current;
      const order = puzzlesOfSize(nextSize);
      const here = current ? order.findIndex((item) => item.pictureId === current.pictureId) : -1;
      const nextPuzzle = daily ? dailyPuzzle(daily, nextSize) : order[(here + 1) % order.length];
      begin(nextPuzzle, daily, 0, null);
    },
    [begin],
  );

  // Resume an unfinished picture, or deal a small one.
  useEffect(() => {
    if (puzzleRef.current) return;
    const saved = readProgress();
    if (saved && !saved.finished) {
      const restored = puzzleByPictureId(saved.pictureId);
      if (restored) {
        hintsUsedRef.current = saved.hintsUsed;
        begin(restored, saved.daily, saved.elapsedMs, saved.marks);
        setHintsUsed(saved.hintsUsed);
        return;
      }
    }
    start(saved?.size ?? 5, null);
  }, [begin, start]);

  // The interval exists only to repaint the clock.
  useEffect(() => {
    if (status !== 'ready' || paused || solved) return;
    const id = window.setInterval(() => setElapsed(clockRef.current.elapsedMs), 500);
    return () => window.clearInterval(id);
  }, [paused, solved, status]);

  // Walking away from the tab stops the clock. A picture can take a while.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !solved && status === 'ready') {
        clockRef.current.pause();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [solved, status]);

  const newPuzzle = useCallback(
    (nextSize: Size = puzzleRef.current?.rows === 10 ? 10 : 5) => {
      clearProgress();
      start(nextSize, null);
    },
    [start],
  );

  const playDaily = useCallback(() => {
    start(size, localDateKey());
  }, [size, start]);

  const filled = marks.reduce((total, mark) => (mark === FILL ? total + 1 : total), 0);

  return {
    status,
    puzzle,
    marks,
    size,
    mode,
    focusIndex,
    hint,
    paused,
    solved,
    isDaily,
    dailyDate,
    clock: formatClock(elapsed),
    hintsUsed,
    filled,
    canUndo: !solved && !paused && (puzzleRef.current ? historyRef.current.length > 0 : false),
    setMode,
    toggleMode: () => setMode((value) => (value === 'fill' ? 'cross' : 'fill')),
    focusCell: setFocusIndex,
    paint,
    markCell,
    startStroke,
    continueStroke,
    endStroke,
    undo,
    clear,
    askHint,
    applyHint,
    dismissHint,
    pause,
    resume,
    newPuzzle,
    playDaily,
  };
}
