import {
  createEnglish,
  hasMoves,
  hopsFrom,
  isSolved,
  seedCount,
  select,
  undo,
} from '@puzzlebloom/peg-engine';
import { Button, chime, Icon } from '@puzzlebloom/ui';
import { useState } from 'react';
import './peg.css';

interface Props {
  onExit?: () => void;
}

export function PegPondGame({ onExit }: Props) {
  const [state, setState] = useState(createEnglish);
  const lands = state.selected === null ? [] : hopsFrom(state, state.selected);
  const stuck = !hasMoves(state) && !isSolved(state);
  const solved = isSolved(state);

  const onHole = (index: number) => {
    const next = select(state, index);
    if (next !== state) chime(next.history.length > state.history.length ? 0.55 : 0.25);
    setState(next);
  };

  return (
    <div className="pb-play pb-peg">
      <h1 className="sr-only">Peg Pond for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Peg Pond</span>
          <span className="pb-play__clock">{seedCount(state)} seeds</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot hop seeds */}
        <div className="pb-peg-board" role="grid" aria-label="Lily pad pond, English board">
          {state.holes.map((hole, index) => (
            // biome-ignore lint/a11y/useSemanticElements: a pad is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the index is the pad coordinate
              key={index}
              type="button"
              role="gridcell"
              className={`pb-peg-hole is-${hole}${state.selected === index ? ' is-selected' : ''}${lands.includes(index) ? ' is-land' : ''}`}
              disabled={hole === 'none'}
              aria-label={hole === 'seed' ? 'Seed' : hole === 'empty' ? 'Empty pad' : 'Off the pond'}
              onClick={() => onHole(index)}
            />
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Tap a seed, then an empty pad two hops away. The seed in between leaves the pond. Undo whenever
            you like.
          </p>
          {stuck ? (
            <p className="pb-calm-note">No hops left. Undo a little, or start the pond again.</p>
          ) : null}
          <Button
            variant="quiet"
            size="sm"
            block
            iconLeft="undo"
            onClick={() => setState((s) => undo(s))}
            disabled={state.history.length === 0}
          >
            Undo the last hop
          </Button>
          <Button
            variant="quiet"
            size="sm"
            block
            iconLeft="sparkle"
            onClick={() => setState(createEnglish())}
          >
            A new pond
          </Button>
        </aside>
      </div>
      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-peg-win">
          <div className="pb-win__card">
            <h2 id="pb-peg-win" className="pb-win__title">
              One seed on the pond
            </h2>
            <p className="pb-win__sub">That is the whole of peg solitaire, quietly done.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => setState(createEnglish())}>
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
