import { FIGURES } from '@puzzlebloom/tangram-engine';
import { Button, Chip, Icon, useModalFocus } from '@puzzlebloom/ui';
import { useCallback, useEffect, useRef } from 'react';
import { Board, FigureReveal } from './Board';
import { HintSheet } from './HintSheet';
import { useTangram } from './useTangram';
import './tangram.css';
import './controls.css';

/**
 * The visible header is a back button, a figure name and a clock, which is the
 * right interface and the wrong document: a crawler would find no heading at
 * all. So the heading is real and not drawn.
 */
function GameHeading() {
  return <h1 className="sr-only">Tangram for kids</h1>;
}

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

export function TangramGame({ onExit }: Props) {
  const game = useTangram();
  const {
    status,
    figure,
    layout,
    placements,
    selected,
    dragging,
    hint,
    paused,
    solved,
    isDaily,
    clock,
    hintsUsed,
    placed,
    canUndo,
    select,
    beginDrag,
    dragTo,
    endDrag,
    nudge,
    rotate,
    flip,
    undo,
    askHint,
    dismissHint,
    pause,
    resume,
    nextFigure,
    chooseFigure,
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
      // Rotate and flip are unshifted letters rather than a chord, because they
      // are pressed between drags with the same hand that is dragging.
      if (event.key === 'r' || event.key === 'R') {
        rotate();
        return;
      }
      if (event.key === 'f' || event.key === 'F') {
        flip();
        return;
      }
      if (event.key === 'h' || event.key === 'H') {
        askHint();
      }
    },
    [askHint, dismissHint, flip, hint, paused, rotate, solved, status, undo],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // Both overlays own focus while they are up: the board behind them is covered
  // and takes no input, and the only way out of each is a button inside it. The
  // handover lives in the shared hook because doing it here meant it ran before
  // the browser had finished focusing whatever had just been pressed.
  //
  // `!solved` on the curtain is not cosmetic: two open dialogs would each pull
  // focus into the other, and the clock is already stopped once the shape is
  // complete, so there is nothing left to pause.
  useModalFocus(pauseRef, paused && !solved);
  useModalFocus(winRef, solved);

  if (status === 'loading' || !figure || !layout) {
    return (
      // `pb-play` is here for the prerenderer, which waits for it and captures
      // the skeleton on purpose: a snapshot of a finished board would be
      // replaced by a fresh one the moment React mounts, and a visitor would
      // see it flicker.
      <div className="pb-play pb-tangram pb-tangram--loading">
        <GameHeading />
        <div className="pb-tangram-skeleton" aria-hidden="true" />
        <p className="pb-tangram__note">
          <Icon name="sparkle" size={16} /> Cutting the seven pieces…
        </p>
      </div>
    );
  }

  return (
    <div className={`pb-play pb-tangram${solved ? ' is-solved' : ''}`}>
      <GameHeading />
      <header className="pb-play__bar">
        <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="pb-play__meta">
          <span className="pb-play__level">{figure.name}</span>
          {isDaily ? <Chip tone="accent">Today’s</Chip> : null}
          <span className="pb-tangram__placed">
            {placed} of {placements.length} placed
          </span>
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

      <div className="pb-play__body pb-tangram__body">
        <div className="pb-tangram__stage">
          <Board
            figure={figure}
            layout={layout}
            placements={placements}
            selected={selected}
            dragging={dragging}
            solved={solved}
            onSelect={select}
            onBeginDrag={beginDrag}
            onDragTo={dragTo}
            onEndDrag={endDrag}
            onNudge={nudge}
          />
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
              <p>Paused. The shape is still there.</p>
              <Button variant="primary" size="md" iconLeft="play" onClick={resume}>
                Carry on
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="pb-play__side">
          <div className="pb-tangram__tools">
            <div className="pb-tools">
              <button type="button" className="pb-tool" onClick={undo} disabled={!canUndo} aria-label="Undo">
                <Icon name="undo" size={20} />
                <span>Undo</span>
              </button>
              <button
                type="button"
                className="pb-tool"
                onClick={rotate}
                disabled={!selected || solved}
                aria-label={`Turn ${selected ? 'the selected piece' : 'a piece'} forty-five degrees`}
              >
                <Icon name="rotate" size={20} />
                <span>Turn</span>
              </button>
              <button
                type="button"
                className="pb-tool"
                onClick={flip}
                disabled={!selected || solved}
                aria-label="Mirror the selected piece"
              >
                <Icon name="flip" size={20} />
                <span>Flip</span>
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
            <p className="pb-tangram__hintline">
              Press a piece and drag it. Its corners click onto other corners when they are close. Turn turns
              the picked piece an eighth of a turn; Flip mirrors it.
            </p>
          </div>

          <div className="pb-tangram__levels">
            <label className="pb-tangram__pick">
              <span className="pb-tangram__pick-label">Shape</span>
              {/* A native select, because six named shapes do not fit a pill and
                  a native one brings its own keyboard and screen-reader
                  behaviour on every platform. */}
              <select
                className="pb-tangram__select"
                value={figure.id}
                onChange={(event) => chooseFigure(event.target.value)}
              >
                {FIGURES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="quiet" size="sm" block onClick={playDaily} iconLeft="sun">
              Play today’s shape
            </Button>
          </div>
        </aside>
      </div>

      {hint && !paused && !solved ? <HintSheet hint={hint} onDismiss={dismissHint} /> : null}

      {solved ? (
        // No Escape handler, on purpose, and it is a considered exception to the
        // rule that a dialog can be dismissed. A finished figure has no
        // "cancel": there is nothing to go back to, and a child who pressed the
        // key to close a menu would lose the one moment the game had been
        // building towards. The two buttons are the exits, and both of them lead
        // forwards — another figure, or the garden.
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-tangram-win-title">
          <div className="pb-win__card" ref={winRef} tabIndex={-1}>
            {/* The board behind the scrim is dimmed to the point of being a
                shape, so the reveal is repeated here at thumbnail size — the
                same seven polygons, in the same seven colours, from the author's
                placements. */}
            <FigureReveal figure={figure} bounds={layout.silhouette} />
            <h2 id="pb-tangram-win-title" className="pb-win__title">
              {figure.name} appeared
            </h2>
            <p className="pb-win__sub">
              Seven pieces, finished in {clock}
              {hintsUsed > 0 ? ` with ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''}` : ', no hints'}.
            </p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={nextFigure}>
                Another shape
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
