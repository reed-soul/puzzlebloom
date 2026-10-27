import { canSlide, createPuzzle, isSolved, type Size, slide } from '@puzzlebloom/sliding-engine';
import { Button, bloomCreature, chime, GardenCreature, Icon, Segmented } from '@puzzlebloom/ui';
import { useCallback, useState } from 'react';
import './sliding.css';

const SIZES: Array<{ value: Size; label: string; hint: string }> = [
  { value: 3, label: '3×3', hint: 'Eight tiles' },
  { value: 4, label: '4×4', hint: 'Fifteen tiles' },
];

interface Props {
  onExit?: () => void;
}

export function SlidingGame({ onExit }: Props) {
  const [size, setSize] = useState<Size>(3);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState(() => createPuzzle(3, seed));

  const deal = useCallback((nextSize: Size, nextSeed: number) => {
    setSize(nextSize);
    setSeed(nextSeed);
    setState(createPuzzle(nextSize, nextSeed));
  }, []);

  const onSlide = (index: number) => {
    if (!canSlide(state, index) || isSolved(state)) return;
    const next = slide(state, index);
    setState(next);
    chime(isSolved(next) ? 0.8 : 0.35);
  };

  const solved = isSolved(state);

  return (
    <div className="pb-play pb-slide">
      <h1 className="sr-only">Sliding Garden for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Sliding Garden</span>
          <span className="pb-play__clock">{state.moves} slides</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot slide tiles */}
        <div
          className="pb-slide-board"
          style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}
          role="grid"
          aria-label={`Sliding puzzle, ${state.size} by ${state.size}`}
        >
          {state.tiles.map((tile, index) => (
            // biome-ignore lint/a11y/useSemanticElements: a tile is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the index is the slot on a fixed board
              key={index}
              type="button"
              role="gridcell"
              className={`pb-slide-cell${tile === 0 ? ' is-empty' : ''}`}
              onClick={() => onSlide(index)}
              disabled={tile === 0 || solved}
              aria-label={tile === 0 ? 'Empty square' : `Tile ${tile}`}
            >
              {tile === 0 ? null : (
                <>
                  <GardenCreature name={bloomCreature(tile - 1)} />
                  {state.size === 4 ? <span className="pb-slide-num">{tile}</span> : null}
                </>
              )}
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Tap a friend next to the empty square. Keep sliding until every creature is home.
          </p>
          <Segmented
            label="Board size"
            value={String(size)}
            options={SIZES.map((s) => ({ ...s, value: String(s.value) }))}
            onChange={(v) => deal(Number(v) as Size, seed + 1)}
            size="sm"
          />
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(size, seed + 1)}>
            Another scramble
          </Button>
        </aside>
      </div>
      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-slide-win">
          <div className="pb-win__card">
            <h2 id="pb-slide-win" className="pb-win__title">
              The picture sits still
            </h2>
            <p className="pb-win__sub">That took {state.moves} slides.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => deal(size, seed + 1)}>
                Another scramble
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
