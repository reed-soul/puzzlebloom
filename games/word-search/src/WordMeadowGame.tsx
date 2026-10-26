import { Button, chime, Icon } from '@puzzlebloom/ui';
import { createMeadow, isSolved, select } from '@puzzlebloom/word-search-engine';
import { useState } from 'react';
import './word-search.css';

interface Props {
  onExit?: () => void;
}

export function WordMeadowGame({ onExit }: Props) {
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState(() => createMeadow(seed));
  const [pick, setPick] = useState<number | null>(null);

  const deal = (nextSeed: number) => {
    setSeed(nextSeed);
    setState(createMeadow(nextSeed));
    setPick(null);
  };

  const onCell = (index: number) => {
    if (isSolved(state)) return;
    if (pick === null) {
      setPick(index);
      return;
    }
    const next = select(state, pick, index);
    if (next.found.length > state.found.length) chime(0.7);
    setState(next);
    setPick(null);
  };

  const solved = isSolved(state);
  const foundCells = new Set(
    state.placements
      .filter((placement) => state.found.includes(placement.word))
      .flatMap((placement) => placement.cells),
  );

  return (
    <div className="pb-play pb-words">
      <h1 className="sr-only">Word Meadow for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Word Meadow</span>
          <span className="pb-play__clock">
            {state.found.length} of {state.words.length}
          </span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot select a span */}
        <div
          className="pb-words-board"
          style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}
          role="grid"
          aria-label={`Letter meadow, ${state.size} by ${state.size}`}
        >
          {state.grid.map((ch, index) => (
            // biome-ignore lint/a11y/useSemanticElements: a letter is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the index is the cell coordinate
              key={index}
              type="button"
              role="gridcell"
              className={`pb-words-cell${pick === index ? ' is-selected' : ''}${foundCells.has(index) ? ' is-found' : ''}`}
              onClick={() => onCell(index)}
            >
              {ch}
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Tap the first letter of a word, then the last. Across, down or diagonal.
          </p>
          <div className="pb-words-list">
            {state.words.map((word) => (
              <span key={word} className={state.found.includes(word) ? 'is-found' : ''}>
                {word}
              </span>
            ))}
          </div>
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(seed + 1)}>
            Another meadow
          </Button>
        </aside>
      </div>
      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-words-win">
          <div className="pb-win__card">
            <h2 id="pb-words-win" className="pb-win__title">
              Every word found
            </h2>
            <p className="pb-win__sub">The meadow has nothing left to hide.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => deal(seed + 1)}>
                Another meadow
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
