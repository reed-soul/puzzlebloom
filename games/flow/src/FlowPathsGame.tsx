import { begin, createFlow, endDrag, extend, isComplete, PUZZLES } from '@puzzlebloom/flow-engine';
import { Button, chime, Icon, Segmented } from '@puzzlebloom/ui';
import { type PointerEvent, useState } from 'react';
import './flow.css';

const PALETTE = [
  'var(--pb-brand)',
  'var(--pb-accent)',
  'var(--pb-sky)',
  'color-mix(in oklab, var(--pb-success) 70%, var(--pb-surface))',
  'color-mix(in oklab, var(--pb-danger) 45%, var(--pb-surface))',
];

interface Props {
  onExit?: () => void;
}

export function FlowPathsGame({ onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [state, setState] = useState(() => createFlow(0));
  const size = state.puzzle.size;
  const complete = isComplete(state);

  const deal = (next: number) => {
    setIndex(next);
    setState(createFlow(next));
  };

  const cellFromPoint = (event: PointerEvent<HTMLDivElement>): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const c = Math.floor((x / rect.width) * size);
    const r = Math.floor((y / rect.height) * size);
    if (r < 0 || c < 0 || r >= size || c >= size) return null;
    return r * size + c;
  };

  const colorOf = (cell: number): number | null => {
    for (const [key, path] of Object.entries(state.paths)) {
      if (path.includes(cell)) return Number(key);
    }
    return null;
  };

  const finishDrag = () => {
    setState((s) => {
      const next = endDrag(s);
      if (isComplete(next) && !isComplete(s)) chime(0.85);
      return next;
    });
  };

  return (
    <div className="pb-play pb-flow">
      <h1 className="sr-only">Flow Paths for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Flow Paths</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring default border/padding this board does not want */}
        <div
          className="pb-flow-board"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          role="group"
          aria-label={`Colour paths, ${size} by ${size}`}
          onPointerDown={(event) => {
            const cell = cellFromPoint(event);
            if (cell === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setState((s) => begin(s, cell));
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return;
            const cell = cellFromPoint(event);
            if (cell === null) return;
            setState((s) => extend(s, cell));
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          {Array.from({ length: size * size }, (_, cell) => {
            const color = colorOf(cell);
            const term = state.puzzle.pairs.some((p) => p.a === cell || p.b === cell);
            const termColor = state.puzzle.pairs.find((p) => p.a === cell || p.b === cell)?.color;
            const paint = color ?? termColor ?? null;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: the index is the cell coordinate
                key={cell}
                className={`pb-flow-cell${term ? ' is-end' : ''}${color !== null ? ' is-path' : ''}`}
                style={{
                  color: paint !== null ? PALETTE[paint] : undefined,
                  background: paint !== null && !term ? PALETTE[paint] : undefined,
                }}
              />
            );
          })}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Drag from a coloured end to its matching end. Paths may not cross, and they should fill the
            garden.
          </p>
          <Segmented
            label="Puzzle"
            value={String(index)}
            options={PUZZLES.map((_, i) => ({
              value: String(i),
              label: `${i + 1}`,
              hint: `${PUZZLES[i].size}×${PUZZLES[i].size}`,
            }))}
            onChange={(v) => deal(Number(v))}
            size="sm"
          />
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(index)}>
            Clear the paths
          </Button>
        </aside>
      </div>
      {complete ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-flow-win">
          <div className="pb-win__card">
            <h2 id="pb-flow-win" className="pb-win__title">
              Every path found its friend
            </h2>
            <p className="pb-win__sub">The colours filled the garden without crossing.</p>
            <div className="pb-win__actions">
              <Button
                variant="primary"
                size="md"
                iconLeft="play"
                onClick={() => deal((index + 1) % PUZZLES.length)}
              >
                Next path
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
