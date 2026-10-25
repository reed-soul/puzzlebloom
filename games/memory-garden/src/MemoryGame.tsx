import { type Level, recap as summarise } from '@puzzlebloom/memory-garden-engine';
import { Button, Chip, Icon, Segmented, useModalFocus } from '@puzzlebloom/ui';
import { useCallback, useEffect, useRef } from 'react';
import { Board } from './Board';
import { PairJuice } from './PairJuice';
import { RecapPanel } from './Recap';
import { useMemoryGarden } from './useMemoryGarden';
import './memory-garden.css';

/**
 * The visible header is a back button, a board size and a clock, which is the
 * right interface and the wrong document: a crawler would find no heading at
 * all. So the heading is real and not drawn.
 */
function GameHeading() {
  return <h1 className="sr-only">Memory Garden for kids</h1>;
}

const LEVEL_TITLES: Record<Level, string> = {
  small: 'Six pairs',
  medium: 'Eight pairs',
  large: 'Nine pairs',
};

const SIZE_OPTIONS: Array<{ value: Level; label: string; hint: string }> = [
  { value: 'small', label: 'Small', hint: 'Six pairs, twelve cards' },
  { value: 'medium', label: 'Medium', hint: 'Eight pairs, sixteen cards' },
  { value: 'large', label: 'Large', hint: 'Nine pairs, eighteen cards' },
];

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

export function MemoryGame({ onExit }: Props) {
  const {
    status,
    level,
    board,
    columns,
    clock,
    hintsUsed,
    hint,
    nothingToRemind,
    announcement,
    paused,
    solved,
    isDaily,
    flip,
    pairFlash,
    askHint,
    dismissHint,
    pause,
    resume,
    anotherBoard,
    chooseLevel,
    playDaily,
  } = useMemoryGarden();

  const winRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (status !== 'ready' || paused || solved) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'h' || event.key === 'H') {
        askHint();
        return;
      }
      if (event.key === 'Escape' && (hint || nothingToRemind)) {
        dismissHint();
      }
    },
    [askHint, dismissHint, hint, nothingToRemind, paused, solved, status],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Both overlays own focus while they are up: the board behind them is covered
  // and takes no input, and the only way out of each is a button inside it.
  //
  // `!solved` on the curtain is not cosmetic: two open dialogs would each pull
  // focus into the other, and the clock is already stopped once the last pair is
  // kept, so there is nothing left to pause.
  useModalFocus(pauseRef, paused && !solved);
  useModalFocus(winRef, solved);

  if (status === 'loading' || !board) {
    return (
      // `pb-play` is here for the prerenderer, which waits for it and captures
      // the skeleton on purpose: a snapshot of a half-turned board would be
      // replaced the moment React mounts and a visitor would see it flicker.
      <div className="pb-play pb-memory pb-memory--loading">
        <GameHeading />
        <div className="pb-memory-skeleton" aria-hidden="true" />
        <p className="pb-memory__note">
          <Icon name="sparkle" size={16} /> Laying out the cards…
        </p>
      </div>
    );
  }

  const facts = solved ? summarise(board) : null;

  return (
    <div className={`pb-play pb-memory${solved ? ' is-solved' : ''}`}>
      <GameHeading />
      <header className="pb-play__bar">
        <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="pb-play__meta">
          <span className="pb-play__level">{LEVEL_TITLES[level]}</span>
          {isDaily ? <Chip tone="accent">Today’s</Chip> : null}
          <span className="pb-memory__count">
            {board.kept} of {board.pairs} kept
          </span>
          <span className="pb-play__clock">
            <Icon name="clock" size={16} />
            {/* `role="timer"` is what makes the label legal here, and it is the
                reason a clock ticking every half second is not announced every
                half second. */}
            <span role="timer" aria-label={`Time ${clock}`}>
              {clock}
            </span>
          </span>
        </div>
      </header>

      <div className="pb-play__body">
        <div className="pb-memory__stage">
          <Board board={board} columns={columns} onFlip={flip} />
          <PairJuice flash={pairFlash} />
          {paused ? (
            <div
              className="pb-curtain"
              role="dialog"
              aria-modal="true"
              aria-label="Paused"
              ref={pauseRef}
              tabIndex={-1}
            >
              <Icon name="pause" size={32} />
              <p>Paused. The cards are still there.</p>
              <Button variant="primary" size="md" iconLeft="play" onClick={resume}>
                Carry on
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="pb-play__side">
          <div className="pb-memory__tools">
            <div className="pb-tools">
              <button
                type="button"
                className="pb-tool"
                onClick={askHint}
                aria-label="Ask the garden what to turn"
              >
                <Icon name="bulb" size={20} />
                <span>Hint</span>
              </button>
              <button
                type="button"
                className="pb-tool"
                onClick={() => (paused ? resume() : pause())}
                aria-label={paused ? 'Resume' : 'Pause'}
              >
                <Icon name={paused ? 'play' : 'pause'} size={20} />
                <span>{paused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
            <p className="pb-memory__hintline">
              Two cards at a time. A pair that misses stays face up until you turn the next card, so there is
              no rush to read it.
            </p>
          </div>

          <div className="pb-memory__levels">
            <span className="pb-memory__pick-label">Board</span>
            <Segmented
              label="Board size"
              value={level}
              options={SIZE_OPTIONS}
              onChange={chooseLevel}
              size="sm"
            />
            <Button variant="quiet" size="sm" block onClick={playDaily} iconLeft="sun">
              Play today’s board
            </Button>
          </div>
        </aside>
      </div>

      {/* Only the last press is read out, and only as far as it goes: which card,
          what is on it, whether the pair was kept. Announcing the running totals
          on every press turns a calm game into a commentary. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* A pause covers the cards, and a sheet quoting one of them would sit on
          top of the curtain and defeat the pause. */}
      {(hint || nothingToRemind) && !paused && !solved ? (
        <div className="pb-hint" role="status" aria-live="polite">
          <div className="pb-hint__head">
            <Icon name="bulb" size={20} />
            <Chip>{hint ? 'A reminder' : 'Nothing yet'}</Chip>
          </div>
          <p className="pb-hint__text">
            {hint ? hint.message : 'Nothing to remind you of yet. Turn a card over, then ask again.'}
          </p>
          <div className="pb-hint__actions">
            <Button variant="ghost" size="sm" onClick={dismissHint}>
              Got it
            </Button>
          </div>
        </div>
      ) : null}

      {solved && facts ? (
        // No Escape handler, on purpose, and it is a considered exception to the
        // rule that a dialog can be dismissed. A finished round has no "cancel":
        // there is nothing to go back to, and a child who pressed the key to close
        // a menu would lose the one moment the game had been building towards.
        // The two buttons are the exits, and both of them lead forwards.
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-memory-win-title">
          <div className="pb-win__card" ref={winRef} tabIndex={-1}>
            <RecapPanel facts={facts} hintsUsed={hintsUsed} clock={clock} />
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={anotherBoard}>
                Another board
              </Button>
              <Button variant="secondary" size="md" iconLeft="arrowLeft" onClick={onExit}>
                Back to the garden
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
