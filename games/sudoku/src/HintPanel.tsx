import type { HintResult } from '@puzzlebloom/sudoku-engine';
import { Button, Chip, Icon } from '@puzzlebloom/ui';

interface HintPanelProps {
  hint: HintResult;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Where the teaching happens.
 *
 * Every hint is a sentence about *why*, generated from the same technique
 * ladder that graded the puzzle, so it can never be wrong and never has to
 * reveal an answer it did not deduce. "Show me" is deliberately a second,
 * separate tap: reading the reason is the exercise, and a player who only
 * wants progress can still get it.
 */
export function HintPanel({ hint, onApply, onDismiss }: HintPanelProps) {
  const isStep = hint.kind === 'step' && Boolean(hint.step);

  return (
    <div className={`pb-hint pb-hint--${hint.kind}`} role="status" aria-live="polite">
      <div className="pb-hint__head">
        <Icon name={hint.kind === 'mistake' ? 'erase' : 'bulb'} size={20} />
        <Chip tone={hint.kind === 'mistake' ? 'neutral' : 'accent'}>
          {hint.kind === 'mistake' ? 'Check this' : (hint.step?.label ?? 'A nudge')}
        </Chip>
      </div>
      <p className="pb-hint__text">{hint.message}</p>
      <div className="pb-hint__actions">
        {isStep ? (
          <Button variant="primary" size="sm" onClick={onApply}>
            Show me
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
