import { BLANK, type Size } from '@puzzlebloom/nonogram-engine';
import { Button, Chip, Icon, Segmented, useModalFocus } from '@puzzlebloom/ui';
import { useCallback, useEffect, useRef } from 'react';
import { Board } from './Board';
import { ClueStrip } from './Clues';
import { HintSheet } from './HintSheet';
import { Reveal } from './Reveal';
import { type PlayMode, useNonogram } from './useNonogram';
import './nonogram.css';
import './controls.css';

const MODES: Array<{ value: PlayMode; label: string; hint: string }> = [
  { value: 'fill', label: 'Fill', hint: 'Tap to fill, drag to fill a whole line' },
  { value: 'cross', label: 'Cross', hint: 'Tap to rule out, drag to cross a whole line' },
];

const SIZES: Array<{ value: '5' | '10'; label: string; hint: string }> = [
  { value: '5', label: 'Small', hint: '5 by 5. Wide runs, one line at a time.' },
  { value: '10', label: 'Medium', hint: '10 by 10. Longer runs, and the gaps matter.' },
];

const sizeLabel = (size: Size) => (size === 5 ? 'Small 5×5' : 'Medium 10×10');

/**
 * The page had no heading at all: the outline started at a size label, and a
 * crawler had nothing to call the page. The visible header is a back button and
 * a clock, which is the right interface and the wrong document — so the heading
 * is real but not drawn.
 */
function GameHeading() {
  return <h1 className="sr-only">Nonogram for kids</h1>;
}

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

export function NonogramGame({ onExit }: Props) {
  const game = useNonogram();
  const {
    status,
    puzzle,
    marks,
    mode,
    focusIndex,
    hint,
    paused,
    solved,
    isDaily,
    clock,
    hintsUsed,
    filled,
    canUndo,
    setMode,
    focusCell,
    paint,
    markCell,
    startStroke,
    continueStroke,
    endStroke,
    undo,
    clear,
    askHint,
    applyHint,
    dismissHint,
    pause,
    resume,
    newPuzzle,
    playDaily,
  } = game;

  const winRef = useRef<HTMLDivElement>(null);
  const pauseRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (status !== 'ready' || paused || solved) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if ((event.metaKey || event.ctrlKey) && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === 'Escape') {
        if (hint) dismissHint();
        return;
      }
      if (event.key === 'h' || event.key === 'H') {
        askHint();
        return;
      }
      if (event.key === 'u' || event.key === 'U') {
        undo();
        return;
      }

      // Everything below acts on the square that has focus, so it only makes
      // sense while a square has focus. Without this, pressing space on the
      // Hint button would fill a square as well as opening the hint.
      if (!target?.dataset.index) return;

      if (event.key === ' ' || event.key === 'Enter') {
        // Preventing the default also stops the browser turning this press into
        // a click on the button, which would toggle the square a second time.
        event.preventDefault();
        markCell(focusIndex, 'fill');
        return;
      }
      if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        markCell(focusIndex, 'cross');
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        paint(focusIndex, BLANK);
      }
    },
    [askHint, dismissHint, focusIndex, hint, markCell, paint, paused, solved, status, undo],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Both overlays are dialogs, so both own focus while they are up: the board
  // behind them is covered and takes no input, and the only way out of each is
  // a button inside it. The focus handover deliberately lives in the shared hook
  // rather than here — moving focus from this component meant it happened before
  // the browser finished focusing the square that had just been pressed, so a
  // mouse solve ended with focus behind the modal and a keyboard solve did not.
  //
  // `!solved` on the curtain is not cosmetic: two open dialogs would each pull
  // focus into the other. The clock is already stopped once the picture is done,
  // so there is nothing left to pause.
  useModalFocus(pauseRef, paused && !solved);
  useModalFocus(winRef, solved);

  if (status === 'loading' || !puzzle) {
    return (
      // `pb-play` is here for the prerenderer, which waits for it and captures
      // the skeleton on purpose: a snapshot of a full board would be replaced by
      // a fresh one the moment React mounts, and a visitor would see it flicker.
      <div className="pb-play pb-nono pb-nono--loading">
        <GameHeading />
        <div className="pb-nono-skeleton" aria-hidden="true" />
        <p className="pb-nono__note">
          <Icon name="sparkle" size={16} /> Counting out the clues…
        </p>
      </div>
    );
  }

  const hintCells = new Set(hint?.focus ?? []);
  const sizeValue = puzzle.rows === 10 ? '10' : '5';

  return (
    <div className={`pb-play pb-nono pb-nono--${puzzle.rows === 10 ? 'medium' : 'small'}`}>
      <GameHeading />
      <header className="pb-play__bar">
        <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="pb-play__meta">
          <span className="pb-play__level">{sizeLabel(puzzle.rows === 10 ? 10 : 5)}</span>
          {isDaily ? <Chip tone="accent">Today’s</Chip> : null}
          <span className="pb-play__clock">
            <Icon name="clock" size={16} />
            {/* `role="timer"` is what makes the aria-label legal here, and it is
                the reason a clock ticking every half second is not announced
                every half second. */}
            <span role="timer" aria-label={`Time ${clock}`}>
              {clock}
            </span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={paused ? 'play' : 'pause'}
          onClick={() => (paused ? resume() : pause())}
          aria-label={paused ? 'Resume' : 'Pause'}
        />
      </header>

      <div className="pb-play__body pb-nono__body">
        <div className="pb-nono__stage">
          <div className="pb-nono__frame">
            <div className="pb-nono__corner" aria-hidden="true" />
            <ClueStrip axis="column" puzzle={puzzle} marks={marks} />
            <ClueStrip axis="row" puzzle={puzzle} marks={marks} />
            <Board
              puzzle={puzzle}
              marks={marks}
              focusIndex={focusIndex}
              hintCells={hintCells}
              onFocusCell={focusCell}
              onStrokeStart={startStroke}
              onStrokeMove={continueStroke}
              onStrokeEnd={endStroke}
              onActivate={(index) => markCell(index)}
            />
          </div>
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
              <p>Paused. The picture is still there.</p>
              <Button variant="primary" size="md" iconLeft="play" onClick={resume}>
                Carry on
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="pb-play__side">
          <div className="pb-nono__modes">
            <p className="pb-nono__legend" aria-hidden="true">
              Marking
            </p>
            <Segmented
              label="Marking"
              size="sm"
              value={mode}
              options={MODES}
              onChange={(value) => setMode(value)}
            />
            <p className="pb-nono__hintline">
              {mode === 'fill'
                ? 'Press and drag to fill a run. Shift and click, or a right click, crosses a square without leaving this mode.'
                : 'Press and drag to cross a line out. Crossing is how you record a square you have ruled out.'}
            </p>
          </div>

          <div className="pb-tools">
            <button type="button" className="pb-tool" onClick={undo} disabled={!canUndo} aria-label="Undo">
              <Icon name="undo" size={20} />
              <span>Undo</span>
            </button>
            <button
              type="button"
              className="pb-tool"
              onClick={clear}
              disabled={filled === 0 || solved}
              aria-label="Clear every square"
            >
              <Icon name="erase" size={20} />
              <span>Clear</span>
            </button>
            <button
              type="button"
              className="pb-tool"
              onClick={askHint}
              disabled={solved}
              aria-label="Ask for a hint"
            >
              <Icon name="bulb" size={20} />
              <span>Hint</span>
            </button>
          </div>

          <div className="pb-levels">
            <p className="pb-levels__label">New picture</p>
            <Segmented
              label="Size"
              size="sm"
              value={sizeValue}
              options={SIZES}
              onChange={(value) => newPuzzle(Number(value) as Size)}
            />
            <Button variant="quiet" size="sm" block onClick={playDaily} iconLeft="sun">
              Play today’s picture
            </Button>
          </div>
        </aside>
      </div>

      {hint && !paused && !solved ? (
        <HintSheet hint={hint} onApply={applyHint} onDismiss={dismissHint} />
      ) : null}

      {solved ? (
        // No Escape handler, on purpose: a finished picture has no "cancel", and
        // a modal a child can dismiss with one key is a modal they can lose the
        // result to. The two buttons are the exits.
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-nono-win-title">
          <div className="pb-win__card" ref={winRef} tabIndex={-1}>
            <Reveal puzzle={puzzle} />
            <h2 id="pb-nono-win-title" className="pb-win__title">
              {puzzle.name} appeared
            </h2>
            <p className="pb-win__sub">
              {sizeLabel(puzzle.rows === 10 ? 10 : 5)}, finished in {clock}
              {hintsUsed > 0 ? ` with ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}` : ', no hints'}.
            </p>
            <div className="pb-win__actions">
              <Button
                variant="primary"
                size="md"
                iconLeft="play"
                onClick={() => newPuzzle(puzzle.rows === 10 ? 10 : 5)}
              >
                Another one
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
