import { CreatureGlyph } from '@puzzlebloom/ui';

interface KeypadProps {
  remaining: Record<number, number>;
  creatures: boolean;
  disabled: boolean;
  onDigit: (digit: number) => void;
}

/**
 * The number row.
 *
 * Each key shows how many of that digit are still unplaced. That counter is
 * doing teaching work, not decoration: a key reading "0" is how a child
 * discovers that all nine of something are already down, which is the first
 * deduction in Sudoku and the one no hint should ever have to explain twice.
 */
export function Keypad({ remaining, creatures, disabled, onDigit }: KeypadProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring default border/padding this grid does not want; role="group" is the point of the element
    <div className="pb-keypad" role="group" aria-label="Digits">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
        const left = remaining[digit] ?? 0;
        return (
          <button
            key={digit}
            type="button"
            className={`pb-key${left === 0 ? ' is-spent' : ''}`}
            disabled={disabled}
            onClick={() => onDigit(digit)}
            aria-label={`Place ${digit}, ${left} left`}
          >
            {creatures ? (
              <CreatureGlyph digit={digit} size={28} ghost={left === 0} />
            ) : (
              <span className="pb-key__digit">{digit}</span>
            )}
            <span className="pb-key__count" aria-hidden="true">
              {left === 0 ? '—' : left}
            </span>
          </button>
        );
      })}
    </div>
  );
}
