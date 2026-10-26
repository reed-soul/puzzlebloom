import { createTic, play, softMove } from '@puzzlebloom/tic-tac-engine';
import { Button, CreatureGlyph, chime, Icon } from '@puzzlebloom/ui';
import { useEffect, useState } from 'react';
import './tic-tac.css';

interface Props {
  onExit?: () => void;
}

export function TriMarksGame({ onExit }: Props) {
  const [state, setState] = useState(createTic);

  useEffect(() => {
    if (state.winner !== 0 || state.turn !== 2) return;
    const id = window.setTimeout(() => {
      setState((s) => {
        if (s.winner !== 0 || s.turn !== 2) return s;
        const move = softMove(s);
        const next = play(s, move);
        chime(next.winner !== 0 ? 0.75 : 0.4);
        return next;
      });
    }, 380);
    return () => window.clearTimeout(id);
  }, [state.turn, state.winner]);

  const onCell = (index: number) => {
    if (state.winner !== 0 || state.turn !== 1) return;
    const next = play(state, index);
    if (next === state) return;
    chime(next.winner !== 0 ? 0.75 : 0.32);
    setState(next);
  };

  return (
    <div className="pb-play pb-tri">
      <h1 className="sr-only">Tri-marks for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Tri-marks</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot take turns */}
        <div
          className="pb-tri-board"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
          role="grid"
          aria-label="Tri-marks, three by three"
        >
          {state.board.map((mark, index) => (
            // biome-ignore lint/a11y/useSemanticElements: a mark is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the index is the cell
              key={index}
              type="button"
              role="gridcell"
              className="pb-tri-cell"
              aria-label={mark === 0 ? 'Empty' : mark === 1 ? 'Sun' : 'Sky'}
              onClick={() => onCell(index)}
              disabled={mark !== 0 || state.winner !== 0 || state.turn !== 1}
            >
              {mark === 0 ? null : <CreatureGlyph digit={mark === 1 ? 1 : 6} size={44} />}
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">Three of yours in a line — across, down or diagonal. You go first.</p>
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => setState(createTic())}>
            Another round
          </Button>
        </aside>
      </div>
      {state.winner !== 0 ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-tri-win">
          <div className="pb-win__card">
            <h2 id="pb-tri-win" className="pb-win__title">
              {state.winner === 'draw'
                ? 'A drawn garden'
                : state.winner === 1
                  ? 'Three suns in a line'
                  : 'The sky lined up three'}
            </h2>
            <p className="pb-win__sub">Another round is one tap away.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => setState(createTic())}>
                Another round
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
