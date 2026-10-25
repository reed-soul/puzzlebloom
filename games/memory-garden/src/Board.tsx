import { type Board as BoardState, creatureName } from '@puzzlebloom/memory-garden-engine';
import { type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, useRef, useState } from 'react';

/** The generated creature art per engine creature 1–9 — the same clay-matte
 *  family Bloom Drop wears (one style bible, two games), so the garden's
 *  characters stay one world. Names follow the engine's shapes. */
const ART: Record<number, string> = {
  1: 'bear',
  2: 'rabbit',
  3: 'horned',
  4: 'snail',
  5: 'sprout',
  6: 'spotted',
  7: 'cat',
  8: 'owl',
  9: 'crowned',
};

interface Props {
  board: BoardState;
  /** Decided by the hook, so a hint and the grid agree about which row is which. */
  columns: number;
  onFlip: (index: number) => void;
}

/**
 * The grid of cards.
 *
 * Every card is a real `<button>`, and that is not a shortcut around building a
 * grid widget: a button brings Enter, Space, the focus ring, the "button" role
 * and the press-and-hold behaviour of every platform with it. What a plain
 * button does not bring is a way to walk the grid, so one card at a time is
 * tabbable — the last one focused — and the arrow keys move between them. A
 * memory game played by pressing Tab eighteen times per turn is technically
 * keyboard accessible and practically not playable.
 *
 * The three labels are the whole state, said out loud: `Card 5, face down`,
 * `Card 5, the snail`, `Card 5, the snail, kept`. A screen reader user has no
 * way to see a card, so the label has to be enough to play from.
 */
export function Board({ board, columns, onFlip }: Props) {
  const [cursor, setCursor] = useState(0);
  const nodes = useRef<Array<HTMLButtonElement | null>>([]);
  const cards = board.faces.length;
  // A new board can be shorter than the one that was on screen.
  const active = cursor < cards ? cursor : 0;

  const move = (index: number) => {
    if (index < 0 || index >= cards) return;
    setCursor(index);
    nodes.current[index]?.focus();
  };

  const handleKey = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        move((index + 1) % cards);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        move((index - 1 + cards) % cards);
        return;
      case 'ArrowDown':
        // No wrap down the page: falling off the bottom of the grid and landing
        // back at the top would make the last row unreachable by feel.
        event.preventDefault();
        move(index + columns);
        return;
      case 'ArrowUp':
        event.preventDefault();
        move(index - columns);
        return;
      default:
        return;
    }
  };

  return (
    // A fieldset is the element ARIA maps to `group`, and a group is what this
    // is: a named set of controls. `aria-label` names it, since a `legend`
    // around eighteen cards would be a line of text above a board that already
    // has a heading.
    <fieldset
      className="pb-memory__grid"
      style={{ '--pb-memory-columns': columns } as CSSProperties}
      aria-label="The cards"
    >
      {board.faces.map((face, index) => {
        const name = creatureName(board.creatures[index]);
        const position = `Card ${index + 1}`;
        const label =
          face === 'down'
            ? `${position}, face down`
            : face === 'kept'
              ? `${position}, ${name}, kept`
              : `${position}, ${name}`;
        // A card has no id beyond where it lies: "card 5" is the fifth card and
        // stays the fifth card for the whole round, including across a reload.
        // The key is therefore position, spelled as an id so that it cannot be
        // mistaken for an ordinal that reorders.
        const id = `card-${index}`;

        return (
          <button
            key={id}
            ref={(node) => {
              nodes.current[index] = node;
            }}
            type="button"
            className={`pb-memory__card is-${face}`}
            tabIndex={index === active ? 0 : -1}
            aria-label={label}
            onFocus={() => setCursor(index)}
            onClick={() => onFlip(index)}
            onKeyDown={(event) => handleKey(event, index)}
          >
            <span className="pb-memory__card-inner" aria-hidden="true">
              {/* Two faces in one grid cell, back to back: the back is the
                  woven garden texture (a question mark on a card is a cartoon
                  this site does not make), the front is the creature's art. */}
              <span className="pb-memory__face pb-memory__back" />
              <span className="pb-memory__face pb-memory__front">
                {face === 'down' ? null : (
                  <img
                    src={`/art/memory/creature-${ART[board.creatures[index]]}.png`}
                    alt=""
                    draggable={false}
                    loading="eager"
                    decoding="sync"
                  />
                )}
              </span>
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
