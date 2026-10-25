import {
  type BoardState,
  createBoard,
  playTurn,
  rollDice,
  turnSentence,
} from '@puzzlebloom/frog-road-engine';
import { chime } from '@puzzlebloom/ui';
import { useCallback, useRef, useState } from 'react';

/**
 * The Frog Road screen's state.
 *
 * The two dice roll together on one press, because two separate buttons would
 * let a child skip holding both numbers — and holding "move 4, but 2 frogs" at
 * once, then applying the square's sign to the *second* number, is the entire
 * skill this game exists to practise. The press is a claim; the car moves and
 * the frogs move only after it.
 *
 * The dice values are kept in state between the roll and the read, so the
 * screen can show what was rolled before the child commits — the numbers are
 * the content here, not decoration, and the research is explicit that hiding
 * them is what makes a maths board game stop teaching.
 */
export function useFrogRoad() {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState<BoardState>(() => createBoard(seed));
  const [boardSeed, setBoardSeed] = useState(seed);
  if (boardSeed !== seed) {
    setBoardSeed(seed);
    setState(createBoard(seed));
  }

  const [rolled, setRolled] = useState<{ steps: number; frogs: number } | null>(null);
  const [lastSentence, setLastSentence] = useState<string | null>(null);

  // ── Riding high: consecutive turns that *gained* frogs. It is not "correct"
  // (the dice decide the sign, not the child) — it is luck celebrated, which
  // is the right thing to cheer in a game whose arithmetic has no wrong
  // answers, only different ones. The count rides along for the UI to cheer.
  const [ridingHigh, setRidingHigh] = useState(0);
  const prevAboard = useRef(0);

  const roll = useCallback(() => {
    if (state.finished) return;
    // The roll itself gets a soft tick: the dice are the heartbeat of a turn.
    chime(0.3, 0.05);
    setRolled(rollDice());
  }, [state.finished]);

  const confirm = useCallback(() => {
    if (!rolled || state.finished) return;
    setState((s) => {
      const next = playTurn(s, rolled.steps, rolled.frogs);
      const entry = next.log[next.log.length - 1];
      setLastSentence(turnSentence(entry));
      // Gaining frogs rides high; landing with a clamp (fewer aboard than
      // asked off) still counts — the arithmetic worked, just against a small
      // bus. Losing passengers resets the run.
      if (entry.after > prevAboard.current) {
        setRidingHigh((n) => n + 1);
        chime(0.6 + Math.min(entry.frogs, 4) * 0.06);
      } else if (entry.after < prevAboard.current) {
        setRidingHigh(0);
        chime(0.35, 0.06);
      }
      prevAboard.current = entry.after;
      return next;
    });
    setRolled(null);
  }, [rolled, state.finished]);

  const restart = useCallback(() => {
    setSeed(1 + Math.floor(Math.random() * 10000));
    setRolled(null);
    setLastSentence(null);
    setRidingHigh(0);
    prevAboard.current = 0;
  }, []);

  return {
    state,
    rolled,
    lastSentence,
    ridingHigh,
    roll,
    confirm,
    restart,
  } as const;
}
