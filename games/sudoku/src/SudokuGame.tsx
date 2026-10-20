import type { DifficultyId } from '@puzzlebloom/sudoku-engine';
import { Button, Chip, Icon, Segmented } from '@puzzlebloom/ui';
import { useCallback, useEffect } from 'react';
import { Board } from './Board';
import { HintPanel } from './HintPanel';
import { Keypad } from './Keypad';
import { useSudoku } from './useSudoku';
import './sudoku.css';
import './controls.css';

const LEVELS: Array<{ value: DifficultyId; label: string; hint: string }> = [
  { value: 'easy', label: 'Gentle', hint: 'Plenty of clues, singles only' },
  { value: 'medium', label: 'Curious', hint: 'Same logic, fewer clues' },
  { value: 'hard', label: 'Tricky', hint: 'Needs pairs and intersections' },
  { value: 'expert', label: 'Brainy', hint: 'Needs subsets and wings' },
];

const levelLabel = (id: DifficultyId) => LEVELS.find((level) => level.value === id)?.label ?? 'Gentle';

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

export function SudokuGame({ onExit }: Props) {
  const sudoku = useSudoku();
  const {
    game,
    status,
    selection,
    notesMode,
    hint,
    paused,
    solved,
    clock,
    conflicts,
    wrong,
    remaining,
    creatures,
    celebration,
    difficulty,
    isDaily,
    canUndo,
    canRedo,
    select,
    place,
    erase,
    undo,
    redo,
    askHint,
    applyHint,
    dismissHint,
    toggleNotes,
    pause,
    resume,
    toggleCreatures,
    newPuzzle,
    playDaily,
  } = sudoku;

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!game || paused || solved) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key >= '1' && event.key <= '9') {
        place(Number(event.key));
        event.preventDefault();
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        erase();
        event.preventDefault();
        return;
      }
      if (event.key === 'n' || event.key === 'N') {
        toggleNotes();
        return;
      }
      if (event.key === 'h' || event.key === 'H') {
        askHint();
        return;
      }
      if (event.key === 'Escape') {
        if (hint) dismissHint();
        else select(null);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
      const delta = moves[event.key];
      if (delta !== undefined) {
        event.preventDefault();
        const from = selection ?? 40;
        const next = from + delta;
        if (next >= 0 && next < 81) select(next);
      }
    },
    [
      askHint,
      dismissHint,
      erase,
      game,
      hint,
      paused,
      place,
      redo,
      select,
      selection,
      solved,
      toggleNotes,
      undo,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  if (status === 'loading' || !game) {
    return (
      <div className="pb-play pb-play--loading">
        <div className="pb-board pb-board--skeleton" aria-hidden="true" />
        <p className="pb-loading__note">
          <Icon name="sparkle" size={16} /> Laying out a fresh grid…
        </p>
      </div>
    );
  }

  const hintFocus = hint?.focus ?? hint?.cells ?? null;

  return (
    <div className="pb-play">
      <header className="pb-play__bar">
        <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="pb-play__meta">
          <span className="pb-play__level">{levelLabel(difficulty)}</span>
          {isDaily ? <Chip tone="accent">Today’s</Chip> : null}
          <span className="pb-play__clock">
            <Icon name="clock" size={16} />
            {/* `role="timer"` is what makes the aria-label legal here — a bare
                span would silently drop it — and it stays aria-live="off", so a
                clock ticking every half second is not announced every half
                second. */}
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

      <div className="pb-play__body">
        <div className="pb-board-wrap">
          <Board
            game={game}
            selection={selection}
            conflicts={conflicts}
            wrong={wrong}
            creatures={creatures}
            focus={hintFocus}
            celebration={celebration}
            onSelect={select}
          />
          {paused ? (
            <div className="pb-curtain" role="dialog" aria-label="Paused">
              <Icon name="pause" size={32} />
              <p>Paused. Take your time.</p>
              <Button variant="primary" size="md" iconLeft="play" onClick={resume}>
                Carry on
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="pb-play__side">
          <Keypad remaining={remaining} creatures={creatures} disabled={paused} onDigit={place} />

          <div className="pb-tools">
            <button type="button" className="pb-tool" onClick={undo} disabled={!canUndo} aria-label="Undo">
              <Icon name="undo" size={20} />
              <span>Undo</span>
            </button>
            <button type="button" className="pb-tool" onClick={redo} disabled={!canRedo} aria-label="Redo">
              <Icon name="redo" size={20} />
              <span>Redo</span>
            </button>
            <button type="button" className="pb-tool" onClick={erase} aria-label="Clear the selected cell">
              <Icon name="erase" size={20} />
              <span>Clear</span>
            </button>
            <button
              type="button"
              className={`pb-tool${notesMode ? ' is-on' : ''}`}
              onClick={toggleNotes}
              aria-pressed={notesMode}
              aria-label="Pencil marks"
            >
              <Icon name="pencil" size={20} />
              <span>Notes</span>
            </button>
            <button type="button" className="pb-tool" onClick={askHint} aria-label="Ask for a hint">
              <Icon name="bulb" size={20} />
              <span>Hint</span>
            </button>
            <button
              type="button"
              className={`pb-tool${creatures ? ' is-on' : ''}`}
              onClick={toggleCreatures}
              aria-pressed={creatures}
              aria-label="Switch between numerals and creatures"
            >
              <Icon name="heart" size={20} />
              <span>{creatures ? 'Creatures' : 'Numbers'}</span>
            </button>
          </div>

          <div className="pb-levels">
            <p className="pb-levels__label">New puzzle</p>
            <Segmented
              label="Difficulty"
              size="sm"
              value={difficulty}
              options={LEVELS}
              onChange={(value) => newPuzzle(value)}
            />
            <Button variant="quiet" size="sm" block onClick={playDaily} iconLeft="sun">
              Play today’s puzzle
            </Button>
          </div>
        </aside>
      </div>

      {hint && !paused && !solved ? (
        <HintPanel hint={hint} onApply={applyHint} onDismiss={dismissHint} />
      ) : null}

      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-win-title">
          <div className="pb-win__card">
            <span className="pb-win__icon">
              <Icon name="trophy" size={32} />
            </span>
            <h2 id="pb-win-title" className="pb-win__title">
              Every creature found its home
            </h2>
            <p className="pb-win__sub">
              {levelLabel(difficulty)} grid, finished in {clock}
              {game.hintsUsed ? ` with ${game.hintsUsed} hint${game.hintsUsed > 1 ? 's' : ''}` : ', no hints'}
              .
            </p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => newPuzzle(difficulty)}>
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
