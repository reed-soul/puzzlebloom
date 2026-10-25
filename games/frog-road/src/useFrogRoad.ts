import {
  type BoardState,
  createBoard,
  playTurn,
  rollDice,
  turnSentence,
} from '@puzzlebloom/frog-road-engine';
import { useCallback, useState } from 'react';

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

  const roll = useCallback(() => {
    if (state.finished) return;
    setRolled(rollDice());
  }, [state.finished]);

  const confirm = useCallback(() => {
    if (!rolled || state.finished) return;
    setState((s) => {
      const next = playTurn(s, rolled.steps, rolled.frogs);
      setLastSentence(turnSentence(next.log[next.log.length - 1]));
      return next;
    });
    setRolled(null);
  }, [rolled, state.finished]);

  const restart = useCallback(() => {
    setSeed(1 + Math.floor(Math.random() * 10000));
    setRolled(null);
    setLastSentence(null);
  }, []);

  return {
    state,
    rolled,
    lastSentence,
    roll,
    confirm,
    restart,
  } as const;
}
