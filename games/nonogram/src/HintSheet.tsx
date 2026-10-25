import { FILL, type Hint } from '@puzzlebloom/nonogram-engine';
import { Button, Chip, Icon } from '@puzzlebloom/ui';

interface HintSheetProps {
  hint: Hint;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Where the counting is explained.
 *
 * The sentence comes first and the button second, the same shape as the sudoku
 * hints, because the sentence is the teaching and the square is the shortcut.
 * A conflict gets no button: there is nothing to apply, and the useful thing to
 * say is which line to look at again.
 */
export function HintSheet({ hint, onApply, onDismiss }: HintSheetProps) {
  const isStep = hint.kind === 'step' && hint.cell !== null && hint.mark !== null;
  const label =
    hint.kind === 'conflict'
      ? 'Check this'
      : hint.kind === 'step'
        ? hint.mark === FILL
          ? 'One square to fill'
          : 'One square to cross'
        : 'A nudge';

  return (
    <div className={`pb-hint pb-hint--${hint.kind}`} role="status" aria-live="polite">
      <div className="pb-hint__head">
        <Icon name={hint.kind === 'conflict' ? 'erase' : 'bulb'} size={20} />
        <Chip tone={hint.kind === 'step' ? 'accent' : 'neutral'}>{label}</Chip>
      </div>
      <p className="pb-hint__text">{hint.message}</p>
      <div className="pb-hint__actions">
        {isStep ? (
          <Button variant="primary" size="sm" onClick={onApply}>
            Mark it
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
