import type { SudokuGame } from '@puzzlebloom/sudoku-engine';
import { colOf, PEERS, rowOf } from '@puzzlebloom/sudoku-engine';
import { CreatureGlyph } from '@puzzlebloom/ui';
import { memo } from 'react';
import type { Celebration } from './useSudoku';

interface BoardProps {
  game: SudokuGame;
  selection: number | null;
  conflicts: Set<number>;
  wrong: Set<number>;
  creatures: boolean;
  focus: number[] | null;
  celebration: Celebration | null;
  onSelect: (cell: number) => void;
}

const Cell = memo(function Cell({
  index,
  value,
  given,
  notes,
  isSelected,
  isPeer,
  isSame,
  isWrong,
  isConflict,
  isFocus,
  creatures,
  onSelect,
}: {
  index: number;
  value: number;
  given: boolean;
  notes: number;
  isSelected: boolean;
  isPeer: boolean;
  isSame: boolean;
  isWrong: boolean;
  isConflict: boolean;
  isFocus: boolean;
  creatures: boolean;
  onSelect: (cell: number) => void;
}) {
  const row = rowOf(index);
  const col = colOf(index);

  const classes = ['pb-cell'];
  if (given) classes.push('is-given');
  if (isSelected) classes.push('is-selected');
  else if (isSame) classes.push('is-same');
  else if (isPeer) classes.push('is-peer');
  if (isWrong || isConflict) classes.push('is-wrong');
  if (isFocus) classes.push('is-focus');
  if (col === 2 || col === 5) classes.push('is-box-right');
  if (row === 2 || row === 5) classes.push('is-box-bottom');

  const label = value
    ? `Row ${row + 1}, column ${col + 1}: ${value}${given ? ', given' : ''}`
    : `Row ${row + 1}, column ${col + 1}: empty${notes ? ', has notes' : ''}`;

  return (
    // biome-ignore lint/a11y/useSemanticElements: a sudoku cell is an interactive button inside an ARIA grid, not a <td>; table semantics would be wrong for a keyboard-playable widget
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      aria-selected={isSelected}
      className={classes.join(' ')}
      // Tabbing onto the board must start from the cell you tabbed to. Without
      // this, `selection` is still null when the first arrow arrives and the
      // arrow handler falls back to the centre of the board — so a keyboard
      // user pressing Down in the top-left corner landed on row 6.
      onFocus={() => onSelect(index)}
      onClick={() => onSelect(index)}
    >
      {value ? (
        <span className="pb-cell__mark">{creatures ? <CreatureGlyph digit={value} size={30} /> : value}</span>
      ) : notes ? (
        <span className="pb-cell__notes" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <span key={digit} className="pb-cell__note">
              {(notes >> (digit - 1)) & 1 ? (
                creatures ? (
                  <CreatureGlyph digit={digit} size={11} ghost />
                ) : (
                  digit
                )
              ) : (
                ''
              )}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
});

/**
 * The reward for finishing a line.
 *
 * Drawn in an SVG layered over the grid with a 9×9 viewBox, so one unit is one
 * cell and no measurement is needed. `pathLength="100"` decouples the dash
 * animation from the real perimeter, which means a row, a column and a box all
 * sweep at the same speed even though they are wildly different lengths.
 *
 * The element is keyed on the celebration id, so re-completing the same row
 * after an undo replays the sweep instead of doing nothing.
 */
function LineSweep({ celebration }: { celebration: Celebration }) {
  return (
    <svg className="pb-board__sweep" viewBox="0 0 9 9" aria-hidden="true">
      {celebration.lines.map(({ kind, index }) => {
        const box =
          kind === 'row'
            ? { x: 0, y: index, w: 9, h: 1 }
            : kind === 'col'
              ? { x: index, y: 0, w: 1, h: 9 }
              : { x: (index % 3) * 3, y: Math.floor(index / 3) * 3, w: 3, h: 3 };
        return (
          <rect
            key={kind}
            x={box.x + 0.07}
            y={box.y + 0.07}
            width={box.w - 0.14}
            height={box.h - 0.14}
            rx={0.2}
            pathLength={100}
          />
        );
      })}
    </svg>
  );
}

export function Board({
  game,
  selection,
  conflicts,
  wrong,
  creatures,
  focus,
  celebration,
  onSelect,
}: BoardProps) {
  const selectedValue = selection !== null ? game.values[selection] : 0;
  const peers = selection !== null ? new Set(PEERS[selection]) : new Set<number>();
  const focusSet = new Set(focus ?? []);

  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot be played with a keyboard
    <div className="pb-board" role="grid" aria-label="Sudoku board" aria-rowcount={9} aria-colcount={9}>
      {Array.from({ length: 81 }, (_, index) => {
        const value = game.values[index];
        return (
          <Cell
            // biome-ignore lint/suspicious/noArrayIndexKey: the cell index *is* the identity here — it is the coordinate
            key={index}
            index={index}
            value={value}
            given={game.puzzle[index] !== 0}
            notes={game.notes[index]}
            isSelected={selection === index}
            isPeer={peers.has(index)}
            isSame={Boolean(selectedValue) && value === selectedValue && selection !== index}
            isWrong={wrong.has(index)}
            isConflict={conflicts.has(index)}
            isFocus={focusSet.has(index)}
            creatures={creatures}
            onSelect={onSelect}
          />
        );
      })}
      {celebration ? <LineSweep key={celebration.id} celebration={celebration} /> : null}
    </div>
  );
}
