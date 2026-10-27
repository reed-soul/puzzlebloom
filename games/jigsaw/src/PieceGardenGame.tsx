import { createJigsaw, isSolved, type Size, tap } from '@puzzlebloom/jigsaw-engine';
import { Button, chime, Icon, Segmented } from '@puzzlebloom/ui';
import { useState } from 'react';
import './jigsaw.css';

interface Props {
  onExit?: () => void;
}

/**
 * One painted garden, sliced by translating a single image so every piece is a
 * true fragment of the same jar. The source is Bloom Drop's scene, not a new
 * drawing, so the puzzle stays in the garden's art world.
 */
function GardenSlice({ index, n }: { index: number; n: number }) {
  const col = index % n;
  const row = Math.floor(index / n);
  return (
    <span className="pb-piece-art">
      <img
        src="/art/bloom/jar-scene.webp"
        alt=""
        draggable={false}
        style={{
          width: `${n * 100}%`,
          height: `${n * 100}%`,
          transform: `translate(${(-col / n) * 100}%, ${(-row / n) * 100}%)`,
        }}
      />
    </span>
  );
}

export function PieceGardenGame({ onExit }: Props) {
  const [size, setSize] = useState<Size>(3);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState(() => createJigsaw(3, seed));

  const deal = (nextSize: Size, nextSeed: number) => {
    setSize(nextSize);
    setSeed(nextSeed);
    setState(createJigsaw(nextSize, nextSeed));
  };

  const onSlot = (slot: number) => {
    const next = tap(state, slot);
    if (next.swaps > state.swaps) chime(isSolved(next) ? 0.85 : 0.4);
    setState(next);
  };

  const solved = isSolved(state);

  return (
    <div className="pb-play pb-piece">
      <h1 className="sr-only">Piece Garden for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Piece Garden</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot swap pieces */}
        <div
          className="pb-piece-board"
          style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}
          role="grid"
          aria-label={`Picture pieces, ${state.size} by ${state.size}`}
        >
          {state.pieces.map((picture, slot) => (
            // biome-ignore lint/a11y/useSemanticElements: a piece is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the slot is the board coordinate
              key={slot}
              type="button"
              role="gridcell"
              className={`pb-piece-slot${state.selected === slot ? ' is-selected' : ''}`}
              aria-label={`Piece ${picture + 1}`}
              onClick={() => onSlot(slot)}
            >
              <GardenSlice index={picture} n={state.size} />
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Tap one piece, then another. They swap. Keep going until the painted jar sits still.
          </p>
          <Segmented
            label="Pieces"
            value={String(size)}
            options={[
              { value: '2', label: '4', hint: 'Four pieces' },
              { value: '3', label: '9', hint: 'Nine pieces' },
              { value: '4', label: '16', hint: 'Sixteen pieces' },
            ]}
            onChange={(v) => deal(Number(v) as Size, seed + 1)}
            size="sm"
          />
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(size, seed + 1)}>
            Another cut
          </Button>
        </aside>
      </div>
      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-piece-win">
          <div className="pb-win__card">
            <h2 id="pb-piece-win" className="pb-win__title">
              The garden is whole
            </h2>
            <p className="pb-win__sub">{state.swaps} swaps, and the picture sat still.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => deal(size, seed + 1)}>
                Another cut
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
