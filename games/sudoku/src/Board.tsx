import { memo } from 'react';
import { PEERS, rowOf, colOf } from '@puzzlebloom/sudoku-engine';
import { CreatureGlyph } from '@puzzlebloom/ui';
import type { SudokuGame } from '@puzzlebloom/sudoku-engine';

interface BoardProps {
  game: SudokuGame;
  selection: number | null;
  conflicts: Set<number>;
  wrong: Set<number>;
  creatures: boolean;
  focus: number[] | null;
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
    <button
      type="button"
      role="gridcell"
      aria-label={label}
      aria-selected={isSelected}
      className={classes.join(' ')}
      onClick={() => onSelect(index)}
    >
      {value ? (
        creatures ? (
          <CreatureGlyph digit={value} size={30} />
        ) : (
          <span className="pb-cell__digit">{value}</span>
        )
      ) : notes ? (
        <span className="pb-cell__notes" aria-hidden="true">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <span key={digit} className="pb-cell__note">
              {(notes >> (digit - 1)) & 1 ? (creatures ? <CreatureGlyph digit={digit} size={11} ghost /> : digit) : ''}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
});

export function Board({ game, selection, conflicts, wrong, creatures, focus, onSelect }: BoardProps) {
  const selectedValue = selection !== null ? game.values[selection] : 0;
  const peers = selection !== null ? new Set(PEERS[selection]) : new Set<number>();
  const focusSet = new Set(focus ?? []);

  return (
    <div className="pb-board" role="grid" aria-label="Sudoku board" aria-rowcount={9} aria-colcount={9}>
      {Array.from({ length: 81 }, (_, index) => {
        const value = game.values[index];
        return (
          <Cell
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
    </div>
  );
}
