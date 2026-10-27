import { type Dir, generateMaze, hint, isSolved, move } from '@puzzlebloom/maze-engine';
import { Button, chime, GardenCreature, Icon, Segmented } from '@puzzlebloom/ui';
import { useCallback, useEffect, useState } from 'react';
import './maze.css';

type Span = '6' | '8' | '10';

const SPANS: Array<{ value: Span; label: string; hint: string }> = [
  { value: '6', label: 'Short', hint: 'A small garden' },
  { value: '8', label: 'Winding', hint: 'A longer wander' },
  { value: '10', label: 'Deep', hint: 'A proper maze' },
];

interface Props {
  onExit?: () => void;
}

export function MazeGame({ onExit }: Props) {
  const [span, setSpan] = useState<Span>('8');
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState(() => generateMaze(8, 8, seed));
  const [nudge, setNudge] = useState<Dir | null>(null);

  const deal = useCallback((next: Span, nextSeed: number) => {
    const n = Number(next);
    setSpan(next);
    setSeed(nextSeed);
    setNudge(null);
    setState(generateMaze(n, n, nextSeed));
  }, []);

  const go = useCallback((dir: Dir) => {
    setState((s) => {
      const next = move(s, dir);
      if (next !== s) chime(isSolved(next) ? 0.85 : 0.28);
      return next;
    });
    setNudge(null);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'n',
        ArrowDown: 's',
        ArrowLeft: 'w',
        ArrowRight: 'e',
      };
      const dir = map[event.key];
      if (!dir) return;
      event.preventDefault();
      go(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const solved = isSolved(state);
  const n = state.width;

  return (
    <div className="pb-play pb-maze">
      <h1 className="sr-only">Maze Path for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Maze Path</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot walk hedges */}
        <div
          className="pb-maze-board"
          style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}
          role="grid"
          aria-label={`Garden maze, ${n} by ${n}`}
        >
          {state.cells.map((cell, index) => {
            const here = index === state.pos;
            const goal = index === state.goal;
            const style = {
              borderTop: cell.n
                ? '3px solid color-mix(in oklab, var(--pb-brand) 55%, var(--pb-ink))'
                : '3px solid transparent',
              borderRight: cell.e
                ? '3px solid color-mix(in oklab, var(--pb-brand) 55%, var(--pb-ink))'
                : '3px solid transparent',
              borderBottom: cell.s
                ? '3px solid color-mix(in oklab, var(--pb-brand) 55%, var(--pb-ink))'
                : '3px solid transparent',
              borderLeft: cell.w
                ? '3px solid color-mix(in oklab, var(--pb-brand) 55%, var(--pb-ink))'
                : '3px solid transparent',
            };
            return (
              // biome-ignore lint/a11y/useSemanticElements: a path square is a button in an ARIA grid, not a table cell
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: the index is the cell coordinate
                key={index}
                type="button"
                role="gridcell"
                className={`pb-maze-cell${here ? ' is-here' : ''}${goal ? ' is-goal' : ''}`}
                style={style}
                aria-label={here ? 'You are here' : goal ? 'The gate' : `Path ${index}`}
                onClick={() => {
                  const r = Math.floor(state.pos / n);
                  const c = state.pos % n;
                  const tr = Math.floor(index / n);
                  const tc = index % n;
                  if (tr === r - 1 && tc === c) go('n');
                  else if (tr === r + 1 && tc === c) go('s');
                  else if (tr === r && tc === c - 1) go('w');
                  else if (tr === r && tc === c + 1) go('e');
                }}
              >
                {here ? <GardenCreature name="sprout" /> : null}
                {goal && !here ? <GardenCreature name="crown" /> : null}
              </button>
            );
          })}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Walk the sprout to the crown. Tap a neighbouring square, use the arrows, or the pad below. Nothing
            here chases you.
          </p>
          {nudge ? <p className="pb-calm-note">Try stepping {label(nudge)}.</p> : null}
          {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would bring default border/padding this pad does not want */}
          <div className="pb-maze-pad" role="group" aria-label="Walk">
            <span />
            <button
              type="button"
              className="pb-maze-pad__btn is-n"
              aria-label="North"
              onClick={() => go('n')}
            >
              <Icon name="arrowRight" size={24} />
            </button>
            <span />
            <button type="button" className="pb-maze-pad__btn is-w" aria-label="West" onClick={() => go('w')}>
              <Icon name="arrowRight" size={24} />
            </button>
            <span className="pb-maze-pad__here" aria-hidden="true">
              <GardenCreature name="sprout" />
            </span>
            <button type="button" className="pb-maze-pad__btn is-e" aria-label="East" onClick={() => go('e')}>
              <Icon name="arrowRight" size={24} />
            </button>
            <span />
            <button
              type="button"
              className="pb-maze-pad__btn is-s"
              aria-label="South"
              onClick={() => go('s')}
            >
              <Icon name="arrowRight" size={24} />
            </button>
            <span />
          </div>
          <Segmented
            label="Garden size"
            value={span}
            options={SPANS}
            onChange={(v) => deal(v, seed + 1)}
            size="sm"
          />
          <Button
            variant="quiet"
            size="sm"
            block
            iconLeft="bulb"
            onClick={() => setNudge(hint(state))}
            disabled={solved}
          >
            A little hint
          </Button>
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(span, seed + 1)}>
            Another garden
          </Button>
        </aside>
      </div>
      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-maze-win">
          <div className="pb-win__card">
            <h2 id="pb-maze-win" className="pb-win__title">
              The gate opens
            </h2>
            <p className="pb-win__sub">You found the way through the hedges.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => deal(span, seed + 1)}>
                Another garden
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

function label(dir: Dir): string {
  if (dir === 'n') return 'north';
  if (dir === 's') return 'south';
  if (dir === 'e') return 'east';
  return 'west';
}
