import {
  CELLS,
  type Complaint,
  columnHeight,
  type Diff,
  heightAt,
  MAX_HEIGHT,
  maskBit,
  maskRows,
  SIZE,
} from '@puzzlebloom/shadows-engine';
import { Segmented } from '@puzzlebloom/ui';
import { useTheme } from '@puzzlebloom/ui/theme';
import { type CSSProperties, useRef } from 'react';
import { ShadowScene } from './ShadowScene';
import { type StackMode, useShadows } from './useShadows';
import './shadows.css';

/**
 * Stone Shadows.
 *
 * The screen is one figure drawn twice. The canvas is the pleasant view of it;
 * the plot below is the real control surface — sixteen buttons, each one a
 * column, reachable by Tab and by arrow keys, and the only way in for anyone
 * who is not using a mouse. When the canvas cannot start, the plot is what is
 * left, and it is the whole game.
 *
 * The three plans are drawn as plain cells rather than in the 3D view because
 * a projection is a *flat* thing: rendering it into the same perspective as
 * the stones would make the one part of the puzzle that is exact compare
 * itself against something slanted.
 */

const plural = (count: number, one: string, many: string): string =>
  count === 0 ? `no ${many}` : count === 1 ? `one ${one}` : `${count} ${many}`;

/** What a panel is waiting for, in words rather than a count of pixels. */
function verdict(diff: Diff): string {
  if (diff.extra === 0 && diff.missing === 0) return 'agrees';
  if (diff.extra === 0) return `${diff.missing} short`;
  if (diff.missing === 0) return `${diff.extra} too many`;
  return `${diff.extra} too many, ${diff.missing} short`;
}

/**
 * One of the three plans.
 *
 * Rows are drawn bottom-up: bit row 0 is the ground, and a plan on a wall has
 * the ground at the bottom. The top view uses the same flip so that rank 3 —
 * the far side of the plot — sits at the top, which is where a child standing
 * at the near edge would draw it.
 *
 * The cells themselves are `aria-hidden`: sixteen binary squares read aloud one
 * at a time is noise, not information. What a screen reader gets instead is the
 * same figure in the form it is actually used — how tall each column is, or
 * which squares the plan covers.
 */
function Plan({
  title,
  mask,
  diff,
  describe,
}: {
  title: string;
  mask: number;
  diff: Diff;
  describe: string;
}) {
  const rows = [...maskRows(mask)].reverse();
  const clear = diff.extra === 0 && diff.missing === 0;
  return (
    <figure className={`pb-shd__plan${clear ? ' is-clear' : ''}`}>
      <figcaption className="pb-shd__plan-title">{title}</figcaption>
      <div className="pb-shd__plan-grid" aria-hidden="true">
        {rows.map((row, rowIndex) =>
          row.map((filled, columnIndex) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: the grid is a fixed four-by-four and nothing reorders
              key={`${rowIndex}-${columnIndex}`}
              className={filled ? 'is-filled' : 'is-empty'}
            />
          )),
        )}
      </div>
      <p className="pb-shd__plan-verdict">{verdict(diff)}</p>
      <p className="sr-only">
        {title}: {describe}. {verdict(diff)}.
      </p>
    </figure>
  );
}

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four'] as const;

/** `front` and `side` are bar charts; say them as one. */
const columnsPhrase = (mask: number, noun: string): string =>
  Array.from(
    { length: SIZE },
    (_, line) => `${noun} ${line + 1} ${NUMBER_WORDS[columnHeight(mask, line)]}`,
  ).join(', ');

/** The footprint as a list of squares, which is the only honest way to say it. */
const footprintPhrase = (mask: number): string => {
  const squares: string[] = [];
  for (let rank = 0; rank < SIZE; rank += 1) {
    for (let file = 0; file < SIZE; file += 1) {
      if (maskBit(mask, rank, file)) squares.push(`row ${rank + 1} column ${file + 1}`);
    }
  }
  return squares.length === 0 ? 'no stones at all' : squares.join(', ');
};

/** The hint as a sentence. Describes what is wrong; never moves a stone. */
function phrase(hint: Complaint): string {
  switch (hint.kind) {
    case 'loose-stone':
      return `Row ${hint.rank + 1}, column ${hint.file + 1}: a stone is standing where the plan has none at all.`;
    case 'gap':
      return `Row ${hint.rank + 1}, column ${hint.file + 1}: the plan has a stone there and the plot is empty.`;
    case 'too-tall':
      return hint.panel === 'front'
        ? `Seen from the front, column ${hint.line + 1} is ${hint.by} too tall.`
        : `Seen from the side, row ${hint.line + 1} is ${hint.by} too tall.`;
    case 'too-short':
      return hint.panel === 'front'
        ? `Seen from the front, column ${hint.line + 1} is ${hint.by} short.`
        : `Seen from the side, row ${hint.line + 1} is ${hint.by} short.`;
  }
}

/**
 * The sixteen columns, as buttons.
 *
 * Drawn with the far rank at the top, which is the same way round as the
 * camera — so "up" on this grid is the far side of the plot, and an arrow key
 * that moves up the screen moves the focus one rank further away.
 */
function Plot({ game }: { game: ReturnType<typeof useShadows> }) {
  const grid = useRef<HTMLFieldSetElement | null>(null);

  const move = (cell: number, delta: number): void => {
    const next = cell + delta;
    if (next < 0 || next >= CELLS) return;
    // Only horizontal moves may cross a rank, so a sideways step at the edge
    // stops rather than wrapping into the row above.
    if (Math.abs(delta) === 1 && Math.floor(next / SIZE) !== Math.floor(cell / SIZE)) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
  };

  return (
    <fieldset className="pb-shd__plot" ref={grid}>
      <legend className="sr-only">The plot, seen from above</legend>
      {Array.from({ length: CELLS }, (_, offset) => CELLS - 1 - offset).map((cell) => {
        const rank = Math.floor(cell / SIZE);
        const file = cell % SIZE;
        const height = heightAt(game.heights, rank, file);
        return (
          <button
            key={cell}
            type="button"
            data-cell={cell}
            className={`pb-shd__cell${height > 0 ? ' has-stones' : ''}`}
            style={{ '--pb-shd-height': `${(height / MAX_HEIGHT) * 100}%` } as CSSProperties}
            aria-label={`Row ${rank + 1}, column ${file + 1}: ${plural(height, 'stone', 'stones')}`}
            onClick={() => game.tap(cell)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowUp') move(cell, SIZE);
              else if (event.key === 'ArrowDown') move(cell, -SIZE);
              else if (event.key === 'ArrowLeft') move(cell, -1);
              else if (event.key === 'ArrowRight') move(cell, 1);
              else return;
              event.preventDefault();
            }}
          />
        );
      })}
    </fieldset>
  );
}

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

export function ShadowsGame({ onExit }: Props) {
  const game = useShadows();
  const { theme } = useTheme();
  const { front, side, top } = game.report;
  const agreeing = [front, side, top].filter((panel) => panel.extra === 0 && panel.missing === 0).length;

  return (
    <div className={`pb-play pb-shd${game.solved ? ' is-solved' : ''}`}>
      {/* The visible bar is a back button, a level name and a stone count — the
          right interface and the wrong document. So the heading is real. */}
      <h1 className="sr-only">Stone shadows: stack stones until three shadows agree</h1>

      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-btn pb-btn--quiet" onClick={onExit}>
            ← Garden
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">{game.level.name}</span>
          <span className="pb-shd__stones">
            {plural(game.stones, 'stone', 'stones')} · plot {game.levelIndex + 1} of {game.levelCount}
          </span>
        </div>
      </header>

      <p className="pb-shd__lede">
        Three lanterns cast one plot of stones onto three walls. The walls are drawn; the stones are not.
        Stand stones on the plot until every wall agrees. The front wall cannot tell how far back a stone
        stands, and the side wall cannot tell which column it is in — only all three together pin it down.
      </p>

      <div className="pb-shd__stage">
        <ShadowScene heights={game.heights} colors={theme.colors} onTap={game.tap} />

        <div className="pb-shd__plans">
          <Plan
            title="From the front"
            mask={game.level.target.front}
            diff={front}
            describe={columnsPhrase(game.level.target.front, 'column')}
          />
          <Plan
            title="From the side"
            mask={game.level.target.side}
            diff={side}
            describe={columnsPhrase(game.level.target.side, 'row')}
          />
          <Plan
            title="From above"
            mask={game.level.target.top}
            diff={top}
            describe={`stones on ${footprintPhrase(game.level.target.top)}`}
          />
        </div>

        <Plot game={game} />
      </div>

      <p className="pb-shd__status" aria-live="polite">
        {game.solved
          ? 'All three shadows agree.'
          : agreeing === 0
            ? 'None of the three shadows agrees yet.'
            : agreeing === 1
              ? 'One of the three shadows agrees.'
              : `Two of the three shadows agree.`}
      </p>

      {/* Before the controls, not after: it is the answer to the puzzle, and an
          answer that lands below the fold reads as nothing having happened. */}
      {game.solved ? (
        <p className="pb-shd__done">
          The lanterns agree. Any arrangement that throws these three shadows would have done — there is more
          than one right answer, and this is one of them.
        </p>
      ) : null}

      <div className="pb-shd__controls">
        <Segmented<StackMode>
          label="What a tap does"
          value={game.mode}
          size="sm"
          options={[
            { value: 'place', label: 'Place a stone', hint: 'Add a stone to the column you tap' },
            { value: 'lift', label: 'Lift a stone', hint: 'Take the top stone off the column you tap' },
          ]}
          onChange={game.chooseMode}
        />
        <div className="pb-shd__actions">
          <button
            type="button"
            className="pb-btn pb-btn--secondary"
            onClick={game.askForHint}
            disabled={game.solved}
          >
            Hint
          </button>
          <button
            type="button"
            className="pb-btn pb-btn--secondary"
            onClick={game.restart}
            disabled={game.stones === 0}
          >
            Clear the plot
          </button>
          {game.solved ? (
            <button type="button" className="pb-btn pb-btn--loud" onClick={game.nextLevel}>
              Next plot
            </button>
          ) : null}
        </div>
      </div>

      {game.hint ? (
        <p className="pb-shd__hint" aria-live="polite">
          {phrase(game.hint)}
        </p>
      ) : null}
    </div>
  );
}
