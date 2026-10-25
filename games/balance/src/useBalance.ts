import {
  addFrog,
  addTile,
  type BalanceLevel,
  type BalanceState,
  clearPan,
  createBalance,
  equationOf,
  generatePuzzle,
  leftTotal,
  panTotal,
  removeFrog,
  removeTopTile,
  tilt,
  weigh,
} from '@puzzlebloom/balance-engine';
import { useCallback, useMemo, useState } from 'react';

/**
 * The Number Balance screen's state.
 *
 * The weigh is a button and not an automatic check, on purpose. A scale that
 * settles as you stack tells you the answer before you have committed to one,
 * and the whole game is the moment of deciding "this is equal" and being right.
 * The child presses weigh the way they would push down on a pan: as a claim.
 */

export type BalanceStatus = 'playing' | 'solved';

export function useBalance(initialLevel: BalanceLevel = 1) {
  const [round, setRound] = useState(() => ({
    level: initialLevel,
    seed: 1 + Math.floor(Math.random() * 10000),
  }));

  // One state, one source: the round (level + seed) derives the puzzle, the
  // puzzle starts the balance. Mutations that stay inside a puzzle only touch
  // `state`; anything that changes the puzzle replaces the round.
  const [state, setState] = useState<BalanceState>(() =>
    createBalance(generatePuzzle(round.level, round.seed)),
  );
  const [puzzleRound, setPuzzleRound] = useState(round);
  if (puzzleRound !== round) {
    setPuzzleRound(round);
    setState(createBalance(generatePuzzle(round.level, round.seed)));
  }

  const puzzle = state.puzzle;
  const { level } = round;
  const angle = useMemo(() => tilt(state), [state]);
  const leftSum = leftTotal(puzzle);
  const rightSum = panTotal(state.right);

  const placeTile = useCallback((value: number) => setState((s) => addTile(s, value)), []);
  const dropFrog = useCallback(() => setState((s) => addFrog(s)), []);
  const liftFrog = useCallback(() => setState((s) => removeFrog(s)), []);
  const liftTile = useCallback(() => setState((s) => removeTopTile(s)), []);
  const resetPan = useCallback(() => setState((s) => clearPan(s)), []);
  const doWeigh = useCallback(() => setState((s) => weigh(s)), []);

  const nextPuzzle = useCallback(() => {
    setRound((r) => ({ ...r, seed: r.seed + 1 + Math.floor(Math.random() * 7) }));
  }, []);

  const chooseLevel = useCallback((next: BalanceLevel) => {
    setRound({ level: next, seed: 1 + Math.floor(Math.random() * 10000) });
  }, []);

  const tilesOffered = useMemo(() => {
    // Which numeral tiles the tray offers: small ones at level one, larger
    // later. Never the target itself at level one — a single matching tile
    // would skip the counting entirely.
    const base = level === 1 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return base.filter((n) => !(level === 1 && n === leftSum));
  }, [level, leftSum]);

  return {
    level,
    puzzle,
    state,
    angle,
    leftSum,
    rightSum,
    status: state.solved ? 'solved' : 'playing',
    equation: state.solved ? equationOf(state) : null,
    tilesOffered,
    placeTile,
    dropFrog,
    liftFrog,
    liftTile,
    resetPan,
    doWeigh,
    nextPuzzle,
    chooseLevel,
  } as const;
}
