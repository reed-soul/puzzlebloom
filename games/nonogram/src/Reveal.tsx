import type { Puzzle } from '@puzzlebloom/nonogram-engine';

/**
 * The picture, once it is finished.
 *
 * Same squares as the board and nothing else: no grid lines, no clue numbers,
 * no numbers in the squares. The point of the reveal is that a drawing appears
 * where a grid used to be, so every mark that was there to help you count is
 * taken away. It is drawn slightly larger than the board for the same reason —
 * this is the reward, and it should not look like the thing you were working on.
 *
 * The column count comes from the size class on the game root rather than from
 * an inline style, because the grid template has to be a literal `repeat()` and
 * the size is already on the tree.
 */
export function Reveal({ puzzle }: { puzzle: Puzzle }) {
  return (
    <div className="pb-nono-reveal" aria-hidden="true">
      <div className="pb-nono-reveal__grid">
        {Array.from(puzzle.solution, (cell, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the index is the coordinate, which is the identity
          <span key={index} className={cell ? 'is-lit' : ''} />
        ))}
      </div>
    </div>
  );
}
