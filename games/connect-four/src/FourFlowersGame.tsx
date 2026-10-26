import { COLS, createFour, drop, ROWS, softMove } from '@puzzlebloom/connect-four-engine';
import { Button, chime, Icon } from '@puzzlebloom/ui';
import { useEffect, useState } from 'react';
import './connect-four.css';

interface Props {
  onExit?: () => void;
}

export function FourFlowersGame({ onExit }: Props) {
  const [state, setState] = useState(createFour);

  useEffect(() => {
    if (state.winner || state.turn !== 2) return;
    const id = window.setTimeout(() => {
      setState((s) => {
        if (s.winner || s.turn !== 2) return s;
        const col = softMove(s);
        const next = drop(s, col);
        chime(next.winner ? 0.8 : 0.4);
        return next;
      });
    }, 420);
    return () => window.clearTimeout(id);
  }, [state.turn, state.winner]);

  const play = (col: number) => {
    if (state.winner || state.turn !== 1) return;
    const next = drop(state, col);
    if (next === state) return;
    chime(next.winner ? 0.8 : 0.32);
    setState(next);
  };

  return (
    <div className="pb-play pb-four">
      <h1 className="sr-only">Four Flowers for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Four Flowers</span>
          <span className="pb-play__clock">{state.turn === 1 ? 'Your sun' : 'Sky is thinking'}</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot drop a flower */}
        <div className="pb-four-board" role="grid" aria-label="Four flowers bed, seven columns">
          {Array.from({ length: COLS }, (_, col) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the column index is the column on a fixed bed
              key={col}
              type="button"
              className="pb-four-col"
              aria-label={`Drop in column ${col + 1}`}
              disabled={Boolean(state.winner) || state.turn !== 1}
              onClick={() => play(col)}
            >
              {Array.from({ length: ROWS }, (_, display) => {
                const row = ROWS - 1 - display;
                const cell = state.board[col][row];
                return (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: row is the slot in a fixed column
                    key={display}
                    className={`pb-four-slot${cell === 1 ? ' is-sun' : ''}${cell === 2 ? ' is-moon' : ''}`}
                  />
                );
              })}
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Tap a column and a sun flower drops to the lowest empty pad. Four of yours in a line, any way,
            finishes the bed.
          </p>
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => setState(createFour())}>
            A new bed
          </Button>
        </aside>
      </div>
      {state.winner ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-four-win">
          <div className="pb-win__card">
            <h2 id="pb-four-win" className="pb-win__title">
              {state.winner === 'draw'
                ? 'The bed is full'
                : state.winner === 1
                  ? 'Four suns in a line'
                  : 'The sky lined up four'}
            </h2>
            <p className="pb-win__sub">Another bed is always waiting.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => setState(createFour())}>
                Another bed
              </Button>
              {onExit ? (
                <Button variant="secondary" size="md" iconLeft="arrowLeft" onClick={onExit}>
                  Back to the garden
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
