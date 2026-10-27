import { createLights, isSolved, press } from '@puzzlebloom/lights-out-engine';
import { Button, chime, GardenCreature, Icon, Segmented } from '@puzzlebloom/ui';
import { useState } from 'react';
import './lights-out.css';

type Span = '4' | '5';

interface Props {
  onExit?: () => void;
}

export function FireflyGame({ onExit }: Props) {
  const [span, setSpan] = useState<Span>('5');
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 10000));
  const [state, setState] = useState(() => createLights(5, seed));

  const deal = (next: Span, nextSeed: number) => {
    setSpan(next);
    setSeed(nextSeed);
    setState(createLights(Number(next), nextSeed));
  };

  const onPress = (index: number) => {
    if (isSolved(state)) return;
    const next = press(state, index);
    chime(isSolved(next) ? 0.85 : 0.3);
    setState(next);
  };

  const solved = isSolved(state);

  return (
    <div className="pb-play pb-firefly">
      <h1 className="sr-only">Firefly Lights for kids</h1>
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit} aria-label="Back to the garden">
            <Icon name="arrowLeft" size={20} />
          </button>
        ) : null}
        <div className="pb-play__meta">
          <span className="pb-play__level">Firefly Lights</span>
          <span className="pb-play__clock">{state.presses} taps</span>
        </div>
      </header>
      <div className="pb-play__body">
        {/* biome-ignore lint/a11y/useSemanticElements: ARIA grid is the sanctioned pattern for an interactive board; a <table> cannot be tapped as fireflies */}
        <div
          className="pb-firefly-board"
          style={{ gridTemplateColumns: `repeat(${state.size}, 1fr)` }}
          role="grid"
          aria-label={`Fireflies, ${state.size} by ${state.size}`}
        >
          {state.lit.map((on, index) => (
            // biome-ignore lint/a11y/useSemanticElements: a firefly is a button in an ARIA grid, not a table cell
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: the index is the firefly's pad
              key={index}
              type="button"
              role="gridcell"
              className={`pb-firefly-cell${on ? ' is-on' : ''}`}
              aria-label={on ? 'Lit firefly' : 'Dark firefly'}
              onClick={() => onPress(index)}
            >
              <GardenCreature name="sprout" />
            </button>
          ))}
        </div>
        <aside className="pb-play__side">
          <p className="pb-calm-note">
            Tap a glowing friend and it, and its four neighbours, swap light for dark. A quiet garden is the
            whole aim.
          </p>
          <Segmented
            label="Garden size"
            value={span}
            options={[
              { value: '4', label: '4×4', hint: 'A smaller bed' },
              { value: '5', label: '5×5', hint: 'The classic bed' },
            ]}
            onChange={(v) => deal(v, seed + 1)}
            size="sm"
          />
          <Button variant="quiet" size="sm" block iconLeft="sparkle" onClick={() => deal(span, seed + 1)}>
            Another bed
          </Button>
        </aside>
      </div>
      {solved ? (
        <div className="pb-win" role="dialog" aria-modal="true" aria-labelledby="pb-firefly-win">
          <div className="pb-win__card">
            <h2 id="pb-firefly-win" className="pb-win__title">
              The garden is quiet
            </h2>
            <p className="pb-win__sub">{state.presses} taps, and every firefly went dark.</p>
            <div className="pb-win__actions">
              <Button variant="primary" size="md" iconLeft="play" onClick={() => deal(span, seed + 1)}>
                Another bed
              </Button>
              {onExit ? (
                <Button variant="secondary" size="md" iconLeft="arrowLeft" onClick={onExit}>
                  Back to the garden
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
