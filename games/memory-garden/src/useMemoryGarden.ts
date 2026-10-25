/**
 * The Memory Garden screen's whole state, in one hook.
 *
 * Four decisions shape this file.
 *
 * 1. There is no countdown, and that is a feature with a test behind it rather
 *    than an omission. The engine keeps a missed pair face up until the next
 *    press, so this hook never schedules anything on the player's behalf: no
 *    timeout, no interval that covers cards, nothing that could take the board
 *    away while someone is still looking at it. The only timer here repaints the
 *    clock.
 *
 * 2. `seen` is derived, never stored. A hint may only mention a card the player
 *    has turned over, and the board already knows which those are: the log holds
 *    every card that has been turned and covered, and the face-up cards are the
 *    ones currently in hand. A second list kept alongside the board would be a
 *    second thing that could drift out of step with it.
 *
 * 3. Changing size or asking for another board starts immediately, with no
 *    "are you sure". The save exists, but a round is two to six minutes and the
 *    board is the least precious thing in it — a confirmation dialogue would
 *    cost more than the round.
 *
 * 4. Only hints that were actually given are counted. A refusal — "nothing to
 *    remind you of yet" — is not a reminder, and charging for one would make an
 *    early press look like a mistake.
 */

import {
  type Board,
  boardFrom,
  clearProgress,
  columnsFor,
  creatureName,
  dailyDeal,
  deal,
  type Hint,
  type Level,
  localDateKey,
  nextHint,
  nextSeed,
  PAIRS_BY_LEVEL,
  readProgress,
  type SavedProgress,
  seedFrom,
  seenIn,
  type TurnResult,
  turn,
  writeProgress,
} from '@puzzlebloom/memory-garden-engine';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Clock, createClock, formatClock } from './clock';

export type GameStatus = 'loading' | 'ready';

/** Wide enough for six columns of nine-pair cards without them going letterbox. */
const WIDE_QUERY = '(min-width: 600px)';

export interface MemoryController {
  status: GameStatus;
  level: Level;
  board: Board | null;
  /** Columns the grid is drawn in. The hint reads the same number. */
  columns: number;
  clock: string;
  hintsUsed: number;
  hint: Hint | null;
  /** A hint was asked for and there was nothing honest to say. */
  nothingToRemind: boolean;
  /** One sentence for the live region: what the last press turned over. */
  announcement: string;
  paused: boolean;
  solved: boolean;
  isDaily: boolean;
  flip: (index: number) => void;
  /** The latest kept pair (card indices + timestamp), for the celebration layer. */
  pairFlash: { a: number; b: number; at: number } | null;
  askHint: () => void;
  dismissHint: () => void;
  pause: () => void;
  resume: () => void;
  anotherBoard: () => void;
  chooseLevel: (level: Level) => void;
  playDaily: () => void;
}

const capitalise = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * What a screen reader hears after a press.
 *
 * Three sentences and no statistics: the card's number, what is on it, and
 * whether the pair was kept. Read the whole board out on every press and the
 * announcement becomes a wall the player waits behind; say nothing and the game
 * is silent.
 */
function announceFor(result: TurnResult): string {
  const { board, event } = result;
  if (event === 'first') {
    const index = board.open[0];
    return `Card ${index + 1} shows ${creatureName(board.creatures[index])}.`;
  }
  const last = board.log[board.log.length - 1];
  if (!last) return '';
  const first = creatureName(board.creatures[last.a]);
  if (last.matched) return `${capitalise(first)}, kept.`;
  return `${capitalise(first)} and ${creatureName(board.creatures[last.b])} do not match.`;
}

export function useMemoryGarden(): MemoryController {
  const [status, setStatus] = useState<GameStatus>('loading');
  const [level, setLevel] = useState<Level>('small');
  const [board, setBoard] = useState<Board | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState<Hint | null>(null);
  const [nothingToRemind, setNothingToRemind] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [paused, setPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [isDaily, setIsDaily] = useState(false);
  const [wide, setWide] = useState(false);

  const boardRef = useRef<Board | null>(null);
  const levelRef = useRef<Level>('small');
  const seedRef = useRef(0);
  const dailyRef = useRef<string | null>(null);
  const hintsUsedRef = useRef(0);
  const clockRef = useRef<Clock>(createClock());
  const startedRef = useRef(false);

  const persist = useCallback((finished: boolean) => {
    const current = boardRef.current;
    if (!current) return;
    writeProgress({
      level: levelRef.current,
      seed: seedRef.current,
      faces: current.faces,
      log: current.log,
      elapsedMs: clockRef.current.elapsedMs,
      hintsUsed: hintsUsedRef.current,
      daily: dailyRef.current,
      finished,
    });
  }, []);

  /**
   * The single way a board starts. A fresh deal and a restored save arrive here,
   * so there is one place that resets the clock, the counters and the live
   * region — and no way to begin a round with half of the previous one still
   * attached.
   */
  const begin = useCallback(
    (nextLevel: Level, seed: number, saved: SavedProgress | null, daily: string | null) => {
      const fresh = deal(PAIRS_BY_LEVEL[nextLevel], seed);
      const restored = saved ? boardFrom(saved) : null;
      const start = restored ?? fresh;

      boardRef.current = start;
      levelRef.current = nextLevel;
      seedRef.current = seed;
      dailyRef.current = daily;
      hintsUsedRef.current = saved?.hintsUsed ?? 0;

      setBoard(start);
      setLevel(nextLevel);
      setHintsUsed(hintsUsedRef.current);
      setHint(null);
      setNothingToRemind(false);
      setAnnouncement('');
      setPaused(false);
      setSolved(false);
      setIsDaily(Boolean(daily));

      clockRef.current.reset(saved?.elapsedMs ?? 0);
      clockRef.current.start();
      setElapsed(saved?.elapsedMs ?? 0);
      setStatus('ready');

      // Written now rather than on the first press, so that reloading before the
      // first card has been turned restores the board on screen instead of
      // dealing a different one.
      persist(false);
    },
    [persist],
  );

  const flip = useCallback(
    (index: number) => {
      const current = boardRef.current;
      if (!current || paused || solved) return;
      const result = turn(current, index);
      if (result.event === 'ignored') return;

      boardRef.current = result.board;
      setBoard(result.board);
      setHint(null);
      setNothingToRemind(false);
      setAnnouncement(announceFor(result));

      if (result.event === 'won') {
        clockRef.current.pause();
        setElapsed(clockRef.current.elapsedMs);
        setSolved(true);
        persist(true);
        return;
      }
      persist(false);
    },
    [paused, persist, solved],
  );

  // ── Pair celebrations: when a turn keeps a pair, the juice layer fires at
  // both cards' positions. Derived from the same log the announcement reads,
  // so screen readers and sparks always tell the same story.
  const [pairFlash, setPairFlash] = useState<{ a: number; b: number; at: number } | null>(null);
  const flipRef = useRef(flip);
  flipRef.current = flip;
  const flipWithJuice = useCallback((index: number) => {
    const before = boardRef.current;
    flipRef.current(index);
    const after = boardRef.current;
    if (!before || !after) return;
    const last = after.log[after.log.length - 1];
    const prevCount = before.log.length;
    if (last && after.log.length > prevCount && last.matched) {
      setPairFlash({ a: last.a, b: last.b, at: performance.now() });
    }
  }, []);

  const askHint = useCallback(() => {
    const current = boardRef.current;
    if (!current || paused || solved) return;
    const next = nextHint(current, seenIn(current), columnsFor(current.pairs, wide));
    if (!next) {
      setHint(null);
      setNothingToRemind(true);
      return;
    }
    hintsUsedRef.current += 1;
    setHintsUsed(hintsUsedRef.current);
    setHint(next);
    setNothingToRemind(false);
    persist(false);
  }, [paused, persist, solved, wide]);

  const dismissHint = useCallback(() => {
    setHint(null);
    setNothingToRemind(false);
  }, []);

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

  const anotherBoard = useCallback(() => {
    const seed = nextSeed(seedRef.current);
    clearProgress();
    begin(levelRef.current, seed, null, null);
  }, [begin]);

  const chooseLevel = useCallback(
    (next: Level) => {
      if (next === levelRef.current) return;
      const seed = nextSeed(seedRef.current);
      clearProgress();
      begin(next, seed, null, null);
    },
    [begin],
  );

  const playDaily = useCallback(() => {
    // One reading of the date, so the board and the day it is filed under cannot
    // land on opposite sides of midnight.
    const today = localDateKey();
    const daily = dailyDeal(today);
    clearProgress();
    begin(daily.level, daily.seed, null, today);
  }, [begin]);

  // Resume the round that was interrupted, or deal the day's first board. The
  // guard is a ref because React's development build runs effects twice on
  // purpose, and dealing on both runs would restart the clock under the player.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const saved = readProgress();
    if (saved && !saved.finished) {
      begin(saved.level, saved.seed, saved, saved.daily);
      return;
    }
    begin('small', seedFrom(localDateKey()), null, null);
  }, [begin]);

  // The column count is decided here and handed to both the stylesheet and the
  // hint, because a hint that says "the second row" has to agree with the grid
  // the player is looking at. Below 600px a nine-pair board is three columns of
  // six rows; above it, six columns, which keeps the cards from stretching.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(WIDE_QUERY);
    setWide(query.matches);
    const onChange = () => setWide(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // The interval exists only to repaint the clock.
  useEffect(() => {
    if (status !== 'ready' || paused || solved) return;
    const id = window.setInterval(() => setElapsed(clockRef.current.elapsedMs), 500);
    return () => window.clearInterval(id);
  }, [paused, solved, status]);

  // Walking away from the tab stops the clock and covers the cards. A memory
  // game that kept counting while the player was in another room would put a
  // number on the win panel they did not spend.
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

  return {
    status,
    level,
    board,
    columns: columnsFor(board?.pairs ?? PAIRS_BY_LEVEL[level], wide),
    clock: formatClock(elapsed),
    hintsUsed,
    hint,
    nothingToRemind,
    announcement,
    paused,
    solved,
    isDaily,
    flip: flipWithJuice,
    pairFlash,
    askHint,
    dismissHint,
    pause,
    resume,
    anotherBoard,
    chooseLevel,
    playDaily,
  };
}
