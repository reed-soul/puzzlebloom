import type { Hint } from '@puzzlebloom/tangram-engine';
import { Button, Chip, Icon } from '@puzzlebloom/ui';

interface HintSheetProps {
  hint: Hint;
  onDismiss: () => void;
}

/**
 * What the game says when a player asks.
 *
 * There is no second button. A nonogram hint can be applied because there is a
 * square and a mark to apply; here the sentence can only be *read*, and a
 * button that placed a piece for the player would be the game solving itself.
 * The one action is closing it.
 */
const LABELS: Record<Hint['kind'], string> = {
  complete: 'Nothing left',
  unplaced: 'Still in the tray',
  double: 'On top of each other',
  spill: 'Over the edge',
  bare: 'A gap',
};

export function HintSheet({ hint, onDismiss }: HintSheetProps) {
  const done = hint.kind === 'complete';
  return (
    <div className={`pb-hint pb-hint--${hint.kind}`} role="status" aria-live="polite">
      <div className="pb-hint__head">
        <Icon name={done ? 'check' : 'bulb'} size={20} />
        <Chip tone={done ? 'brand' : 'neutral'}>{LABELS[hint.kind]}</Chip>
      </div>
      <p className="pb-hint__text">{hint.message}</p>
      <div className="pb-hint__actions">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
