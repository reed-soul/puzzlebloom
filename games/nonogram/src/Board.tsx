import { CROSS, clueText, colOf, FILL, type Mark, type Puzzle, rowOf } from '@puzzlebloom/nonogram-engine';
import { memo, useRef } from 'react';
import type { PlayMode } from './useNonogram';

interface BoardProps {
  puzzle: Puzzle;
  marks: Uint8Array;
  focusIndex: number;
  hintCells: Set<number>;
  onFocusCell: (index: number) => void;
  onStrokeStart: (index: number, action?: PlayMode) => void;
  onStrokeMove: (index: number) => void;
  onStrokeEnd: () => void;
  /** A press synthesised by the keyboard, which arrives as a click with detail 0. */
  onActivate: (index: number) => void;
}

const ARROWS: Record<string, { row: number; col: number }> = {
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
};

interface CellProps {
  index: number;
  row: number;
  col: number;
  rows: number;
  cols: number;
  mark: Mark;
  rowClue: string;
  colClue: string;
  tabbable: boolean;
  isHint: boolean;
  onFocusCell: (index: number) => void;
  onActivate: (index: number) => void;
}

const Cell = memo(function Cell({
  index,
  row,
  col,
  rows,
  cols,
  mark,
  rowClue,
  colClue,
  tabbable,
  isHint,
  onFocusCell,
  onActivate,
}: CellProps) {
  const state = mark === FILL ? 'filled' : mark === CROSS ? 'crossed out' : 'blank';
  const classes = ['pb-nono-cell'];
  if (mark === FILL) classes.push('is-filled');
  if (mark === CROSS) classes.push('is-crossed');
  if (isHint) classes.push('is-hint');
  if (row === 0) classes.push('is-first-row');
  if (col === 0) classes.push('is-first-col');
  if (col === cols - 1) classes.push('is-last-col');
  if (row === rows - 1) classes.push('is-last-row');
  // Ten wide is the size where losing your place mid-count becomes the actual
  // difficulty, so the middle rule is drawn heavier.
  if (cols > 5 && col === cols / 2 - 1) classes.push('is-mid-col');
  if (rows > 5 && row === rows / 2 - 1) classes.push('is-mid-row');

  return (
    // biome-ignore lint/a11y/useSemanticElements: a square is an interactive button inside an ARIA grid, not a table cell; a <td> cannot be painted by dragging or played with the arrow keys
    <button
      type="button"
      role="gridcell"
      data-index={index}
      tabIndex={tabbable ? 0 : -1}
      // The cells sit directly under the grid rather than inside `row`
      // containers — a hundred wrapper elements to satisfy one nesting rule is
      // not a trade this board makes. The explicit indices are what lets a
      // screen reader still work out where a cell is.
      aria-rowindex={row + 1}
      aria-colindex={col + 1}
      aria-label={`Row ${row + 1} (${rowClue}), column ${col + 1} (${colClue}): ${state}.`}
      className={classes.join(' ')}
      onFocus={() => onFocusCell(index)}
      onClick={(event) => {
        // Pointer presses are handled on pointerdown, where a drag starts. Only
        // a press that came from the keyboard reaches this point.
        if (event.detail === 0) onActivate(index);
      }}
    >
      {mark === FILL ? <span className="pb-nono-cell__fill" /> : null}
      {mark === CROSS ? <span className="pb-nono-cell__cross" /> : null}
    </button>
  );
});

export function Board({
  puzzle,
  marks,
  focusIndex,
  hintCells,
  onFocusCell,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onActivate,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  /**
   * Which square a point is over.
   *
   * Worked out from the board's own rectangle rather than from the element under
   * the finger, because a drag holds pointer capture: once the gesture starts,
   * every move event is delivered to the board itself and the element under the
   * pointer is no longer discoverable. Dividing by the rectangle also means a
   * drag that wanders into the 1px gaps keeps painting the cell it is nearest.
   */
  const indexAt = (clientX: number, clientY: number): number | null => {
    const node = boardRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * puzzle.cols);
    const row = Math.floor(((clientY - rect.top) / rect.height) * puzzle.rows);
    if (col < 0 || row < 0 || col >= puzzle.cols || row >= puzzle.rows) return null;
    return row * puzzle.cols + col;
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot be played by dragging
    <div
      ref={boardRef}
      className="pb-nono-board"
      role="grid"
      aria-label={`Nonogram board, ${puzzle.rows} by ${puzzle.cols}`}
      aria-rowcount={puzzle.rows}
      aria-colcount={puzzle.cols}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const index = indexAt(event.clientX, event.clientY);
        if (index === null) return;
        onFocusCell(index);
        if (event.shiftKey) {
          onStrokeStart(index, 'cross');
          onStrokeEnd();
          return;
        }
        dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        onStrokeStart(index);
      }}
      onPointerMove={(event) => {
        if (dragging.current === null) return;
        const index = indexAt(event.clientX, event.clientY);
        if (index !== null) onStrokeMove(index);
      }}
      onPointerUp={() => {
        if (dragging.current === null) return;
        dragging.current = null;
        onStrokeEnd();
      }}
      onPointerCancel={() => {
        if (dragging.current === null) return;
        dragging.current = null;
        onStrokeEnd();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        const index = indexAt(event.clientX, event.clientY);
        if (index === null) return;
        onStrokeStart(index, 'cross');
        onStrokeEnd();
      }}
      onKeyDown={(event) => {
        const step = ARROWS[event.key];
        if (!step) return;
        event.preventDefault();
        const row = rowOf(focusIndex, puzzle.cols);
        const col = colOf(focusIndex, puzzle.cols);
        const nextRow = Math.min(puzzle.rows - 1, Math.max(0, row + step.row));
        const nextCol = Math.min(puzzle.cols - 1, Math.max(0, col + step.col));
        const next = nextRow * puzzle.cols + nextCol;
        if (next === focusIndex) return;
        onFocusCell(next);
        // Focus has to follow the arrow, or the next keypress goes nowhere: the
        // selected square is a visual state, and only the browser knows which
        // element actually has focus.
        boardRef.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
      }}
    >
      {Array.from({ length: puzzle.rows * puzzle.cols }, (_, index) => {
        const row = rowOf(index, puzzle.cols);
        const col = colOf(index, puzzle.cols);
        return (
          <Cell
            // biome-ignore lint/suspicious/noArrayIndexKey: the index is the coordinate, which is the identity
            key={index}
            index={index}
            row={row}
            col={col}
            rows={puzzle.rows}
            cols={puzzle.cols}
            mark={(marks[index] ?? 0) as Mark}
            rowClue={clueText(puzzle.rowClues[row])}
            colClue={clueText(puzzle.colClues[col])}
            tabbable={index === focusIndex}
            isHint={hintCells.has(index)}
            onFocusCell={onFocusCell}
            onActivate={onActivate}
          />
        );
      })}
    </div>
  );
}
