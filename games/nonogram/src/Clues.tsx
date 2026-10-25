import { clueRuns, lineSettled, type Puzzle } from '@puzzlebloom/nonogram-engine';

interface ClueStripProps {
  axis: 'row' | 'column';
  puzzle: Puzzle;
  marks: Uint8Array;
}

/**
 * The numbers beside the grid.
 *
 * A finished line goes brand-coloured. It is the only feedback this game gives
 * while playing, and it is deliberately about the line rather than the player:
 * it says "there is nothing left to work out here", not "well done". A line
 * whose picture is empty is finished before the player touches it, which is
 * true and useful — it tells them not to spend time on it.
 *
 * The strip is hidden from assistive technology because every number in it is
 * already in the label of every square in that line, where it is needed at the
 * moment of deciding rather than as a separate table to memorise.
 */
export function ClueStrip({ axis, puzzle, marks }: ClueStripProps) {
  const count = axis === 'row' ? puzzle.rows : puzzle.cols;
  const clues = axis === 'row' ? puzzle.rowClues : puzzle.colClues;

  return (
    <div className={`pb-nono-clues pb-nono-clues--${axis}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => {
        const runs = clueRuns(clues[index]);
        const done = lineSettled(marks, puzzle, axis, index);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the index is the row or column number, which is what the strip is indexed by
          <div key={index} className={`pb-nono-clue${done ? ' is-done' : ''}`}>
            {(runs.length > 0 ? runs : [0]).map((run, position) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: two runs can be the same length, so position is the only identity a run has
                key={`${position}-${run}`}
                className={`pb-nono-clue__run${run === 0 ? ' is-none' : ''}`}
              >
                {run}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
