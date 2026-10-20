/**
 * The Sudoku screen's whole state, in one hook.
 *
 * Two decisions shape this file.
 *
 * 1. The engine mutates a plain object, so React state holds that object by
 *    reference and a `version` counter drives re-renders. Cloning the game on
 *    every keystroke would copy 81-cell typed arrays and the undo stack several
 *    times a second, and undo would stop being total.
 *
 * 2. Nothing here is a "game over". A wrong digit tints the cell, says so once,
 *    and waits to be cleared. Losing is not a mechanic on a site built for a
 *    six-year-old's first puzzle.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createGame,
  createTimer,
  decode,
  encode,
  formatDuration,
  generate,
  generateDaily,
  isGiven,
  isSolved as boardIsSolved,
  mistakes as findMistakes,
  findConflicts,
  nextHint,
  requestPuzzle,
  setValue,
  toggleNote,
  clearCell,
  undo as undoMove,
  redo as redoMove,
  applyEliminations,
  recordMistake,
  remaining as remainingOf,
  localDateKey,
  type DifficultyId,
  type HintResult,
  type LoadedPuzzle,
  type SudokuGame,
} from '@puzzlebloom/sudoku-engine';

const SAVE_KEY = 'pb:sudoku:save:v1';
const STATS_KEY = 'pb:sudoku:stats:v1';
const CREATURE_KEY = 'pb:sudoku:creatures:v1';

export interface PlayStats {
  cleared: number;
  byDifficulty: Record<string, number>;
  bestMs: Record<string, number>;
}

const EMPTY_STATS: PlayStats = { cleared: 0, byDifficulty: {}, bestMs: {} };

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage full or blocked. Losing a save is survivable; throwing is not. */
  }
};

const inPlainWords = (text: string): string => {
  const replaced = text.replace(/\br(\d)c(\d)\b/g, 'row $1, column $2');
  return replaced.charAt(0).toUpperCase() + replaced.slice(1);
};

/**
 * The engine writes cell references as r4c7 because that is what solving
 * literature uses. A nine-year-old reads "row 4, column 7". Same fact, one
 * rewrite, and every hint and explanation goes through it.
 */
const humanise = (hint: HintResult): HintResult => ({
  ...hint,
  message: inPlainWords(hint.message),
  step: hint.step ? { ...hint.step, explain: inPlainWords(hint.step.explain) } : undefined,
});

export type GameStatus = 'loading' | 'ready';

export function useSudoku() {
  const [status, setStatus] = useState<GameStatus>('loading');
  const [, setVersion] = useState(0);
  const gameRef = useRef<SudokuGame | null>(null);
  const timerRef = useRef(createTimer());
  const requestRef = useRef(0);

  const [selection, setSelection] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [hint, setHint] = useState<HintResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [creatures, setCreatures] = useState<boolean>(
    () => readJson<boolean>(CREATURE_KEY, false),
  );
  const statsRef = useRef<PlayStats>(readJson<PlayStats>(STATS_KEY, EMPTY_STATS));
  const [stats, setStats] = useState<PlayStats>(statsRef.current);

  const bump = useCallback(() => setVersion((v: number) => v + 1), []);

  const persist = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    writeJson(SAVE_KEY, { ...encode(game), elapsedMs: Math.round(timerRef.current.elapsedMs) });
  }, []);

  const recordWin = useCallback((game: SudokuGame) => {
    const ms = Math.round(timerRef.current.elapsedMs);
    const prev = statsRef.current;
    const best = prev.bestMs[game.difficulty];
    const next: PlayStats = {
      cleared: prev.cleared + 1,
      byDifficulty: {
        ...prev.byDifficulty,
        [game.difficulty]: (prev.byDifficulty[game.difficulty] ?? 0) + 1,
      },
      bestMs: { ...prev.bestMs, [game.difficulty]: best ? Math.min(best, ms) : ms },
    };
    statsRef.current = next;
    setStats(next);
    writeJson(STATS_KEY, next);
  }, []);

  const settle = useCallback(
    (game: SudokuGame) => {
      if (boardIsSolved(game)) {
        game.solvedAt = Date.now();
        timerRef.current.pause();
        setElapsed(timerRef.current.elapsedMs);
        setSolved(true);
        recordWin(game);
      }
      bump();
      persist();
    },
    [bump, persist, recordWin],
  );

  const start = useCallback(
    async (difficulty: DifficultyId, daily: string | null) => {
      const ticket = ++requestRef.current;
      setStatus('loading');
      setSolved(false);
      setHint(null);
      setSelection(null);
      setPaused(false);

      let payload: LoadedPuzzle;
      try {
        payload = (await requestPuzzle({ difficulty, daily })) as unknown as LoadedPuzzle;
      } catch {
        // The worker is an optimisation. If it cannot start, generate here.
        const result = daily ? generateDaily(daily, difficulty) : generate({ difficulty });
        payload = { ...result, daily } as unknown as LoadedPuzzle;
      }
      if (ticket !== requestRef.current) return; // a newer request won

      const game = createGame({
        puzzle: payload.puzzle,
        solution: payload.solution,
        difficulty: payload.difficulty,
        seed: payload.seed,
        daily: daily ?? null,
      }) as SudokuGame;
      gameRef.current = game;
      timerRef.current.reset(0);
      timerRef.current.start();
      setElapsed(0);
      setStatus('ready');
      bump();
      persist();
    },
    [bump, persist],
  );

  // Resume an unfinished board, or deal a fresh easy one.
  useEffect(() => {
    if (gameRef.current) return;
    let saved: SudokuGame | null = null;
    try {
      const raw = readJson<unknown>(SAVE_KEY, null);
      saved = raw ? (decode(raw) as SudokuGame | null) : null;
    } catch {
      saved = null;
    }

    if (saved && !boardIsSolved(saved)) {
      gameRef.current = saved;
      timerRef.current.reset(saved.elapsedMs ?? 0);
      timerRef.current.start();
      setElapsed(saved.elapsedMs ?? 0);
      setStatus('ready');
      bump();
      return;
    }
    void start('easy', null);
  }, [bump, start]);

  // The interval only exists to repaint the clock.
  useEffect(() => {
    if (status !== 'ready' || paused || solved) return;
    const id = window.setInterval(() => setElapsed(timerRef.current.elapsedMs), 500);
    return () => window.clearInterval(id);
  }, [status, paused, solved]);

  // Walking away from the tab pauses the clock. Kids leave mid-puzzle.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !solved && status === 'ready') {
        timerRef.current.pause();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [solved, status]);

  const select = useCallback((cell: number | null) => setSelection(cell), []);

  const place = useCallback(
    (digit: number) => {
      const game = gameRef.current;
      if (!game || paused || solved || selection === null) return;
      if (isGiven(game, selection)) return;

      if (notesMode) {
        toggleNote(game, selection, digit);
      } else {
        setValue(game, selection, digit);
        if (findMistakes(game).has(selection)) recordMistake(game);
      }
      setHint(null);
      settle(game);
    },
    [notesMode, paused, selection, settle, solved],
  );

  const erase = useCallback(() => {
    const game = gameRef.current;
    if (!game || paused || solved || selection === null) return;
    clearCell(game, selection);
    setHint(null);
    settle(game);
  }, [paused, selection, settle, solved]);

  const undo = useCallback(() => {
    const game = gameRef.current;
    if (!game || paused) return;
    undoMove(game);
    setHint(null);
    settle(game);
  }, [paused, settle]);

  const redo = useCallback(() => {
    const game = gameRef.current;
    if (!game || paused) return;
    redoMove(game);
    settle(game);
  }, [paused, settle]);

  const askHint = useCallback(() => {
    const game = gameRef.current;
    if (!game || paused || solved) return;
    setHint(humanise(nextHint(game) as HintResult));
  }, [paused, solved]);

  const applyHint = useCallback(() => {
    const game = gameRef.current;
    if (!game || !hint || hint.kind !== 'step' || !hint.step) return;
    for (const item of hint.step.placements) setValue(game, item.cell, item.digit);
    if (hint.step.eliminations.length) applyEliminations(game, hint.step.eliminations);
    game.hintsUsed += 1;
    if (hint.step.target !== null) setSelection(hint.step.target);
    setHint(null);
    settle(game);
  }, [hint, settle]);

  const dismissHint = useCallback(() => setHint(null), []);

  const toggleNotes = useCallback(() => setNotesMode((value) => !value), []);

  const pause = useCallback(() => {
    timerRef.current.pause();
    setElapsed(timerRef.current.elapsedMs);
    setPaused(true);
    persist();
  }, [persist]);

  const resume = useCallback(() => {
    if (solved) return;
    timerRef.current.start();
    setPaused(false);
  }, [solved]);

  const toggleCreatures = useCallback(() => {
    setCreatures((value: boolean) => {
      writeJson(CREATURE_KEY, !value);
      return !value;
    });
  }, []);

  const newPuzzle = useCallback(
    (difficulty: DifficultyId = gameRef.current?.difficulty ?? 'easy') => {
      void start(difficulty, null);
    },
    [start],
  );

  const playDaily = useCallback(() => {
    void start('medium', localDateKey());
  }, [start]);

  const resetProgress = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(STATS_KEY);
    } catch {
      /* ignore */
    }
    statsRef.current = EMPTY_STATS;
    setStats(EMPTY_STATS);
    gameRef.current = null;
    void start('easy', null);
  }, [start]);

  const game = gameRef.current;
  const conflicts = game ? findConflicts(game.values) : new Set<number>();
  const wrong = game ? findMistakes(game) : new Set<number>();
  const remaining: Record<number, number> = {};
  if (game) for (let d = 1; d <= 9; d++) remaining[d] = remainingOf(game, d);

  return {
    status,
    game,
    difficulty: game?.difficulty ?? 'easy',
    isDaily: Boolean(game?.daily),
    dailyDate: game?.daily ?? null,
    selection,
    notesMode,
    hint,
    paused,
    solved,
    elapsedMs: elapsed,
    clock: formatDuration(elapsed),
    conflicts,
    wrong,
    remaining,
    creatures,
    stats,
    hasUndo: game ? game.history.length > 0 : false,
    hasRedo: game ? game.future.length > 0 : false,
    canUndo: (game?.history.length ?? 0) > 0,
    canRedo: (game?.future.length ?? 0) > 0,
    selectionValue: selection !== null && game ? game.values[selection] : 0,
    select,
    place,
    erase,
    undo,
    redo,
    askHint,
    applyHint,
    dismissHint,
    toggleNotes,
    pause,
    resume,
    toggleCreatures,
    newPuzzle,
    playDaily,
    resetProgress,
  };
}

export type SudokuController = ReturnType<typeof useSudoku>;
