import { counts, createReversi, legalMoves, place, softMove } from '@puzzlebloom/reversi-engine';
import { Button, chime, Icon } from '@puzzlebloom/ui';
import { useEffect, useState } from 'react';
import './reversi.css';

interface Props {
  onExit?: () => void;
}

export function LilyPadsGame({ onExit }: Props) {
  const [state, setState] = useState(createReversi);
  const legal = legalMoves(state);
  const score = counts(state);

  useEffect(() => {
    if (state.winner !== 0 || state.turn !== 2) return;
    const id = window.setTimeout(() => {
      setState((s) => {
        if (s.winner !== 0 || s.turn !== 2) return s;
        const move = softMove(s);
        if (move < 0) return s;
        const next = place(s, move);
        chime(next.winner !== 0 ? 0.8 : 0.42);
        return next;
      });
    }, 420);
    return () => window.clearTimeout(id);
  }, [state.turn, state.winner]);

  const onPad = (index: number) => {
    if (state.winner !== 0 || state.turn !== 1) return;
    const next = place(state, index);
    if (next === state) return;
    chime(next.winner !== 0 ? 0.8 : 0.32);
    setState(next);
  };

  return (
    <div className="pb-play pb-lily">
      <h1 className="sr-only">Lily Pads for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Lily Pads</span>
          <span className="pb-play__clock">
            Sun {score.sun} · Sky {score.moon}
          </span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot flip stones */}
        <div className="pb-lily-board" role="grid" aria-label="Lily pad pond, eight by eight">
          {state.board.map((stone, index) => (
            // biome-ignore lint/a11y/useSemanticElements: a pad is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the index is the pad
              key={index}
              type="button"
              role="gridcell"
              className={`pb-lily-pad${legal.includes(index) ? ' is-legal' : ''}`}
              aria-label={stone === 0 ? 'Empty pad' : stone === 1 ? 'Sun stone' : 'Sky stone'}
              onClick={() => onPad(index)}
              disabled={state.turn !== 1 || state.winner !== 0}
            >
              {stone === 0 ? null : (
                <span className={`pb-lily-stone${stone === 1 ? ' is-sun' : ' is-moon'}`} />
              )}
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Place a sun stone so it traps sky stones in a straight line. They flip. Hint pads glow.
          </p>
          <Button
            variant="quiet"
            size="sm"
            block
            iconLeft="sparkle"
            onClick={() => setState(createReversi())}
          >
            A new pond
          </Button>
        </aside>
      </div>
      {state.winner !== 0 ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-lily-win">
          <div className="pb-win__card">
            <h2 id="pb-lily-win" className="pb-win__title">
              {state.winner === 'draw'
                ? 'The pond is even'
                : state.winner === 1
                  ? 'More sun than sky'
                  : 'More sky than sun'}
            </h2>
            <p className="pb-win__sub">
              Sun {score.sun}, sky {score.moon}.
            </p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => setState(createReversi())}>
                Another pond
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
