import { turnSentence } from '@puzzlebloom/frog-road-engine';
import { CreatureGlyph } from '@puzzlebloom/ui';
import { useFrogRoad } from './useFrogRoad';
import './frog-road.css';

/**
 * The visible header is a back button, a dice pair and a turn counter, which is
 * the right interface and the wrong document: a crawler would find no heading at
 * all. So the heading is real and not drawn.
 */
function GameHeading() {
  return <h1 className="sr-only">Frog Road for kids</h1>;
}

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

/** The road, as a strip of squares with the car on one of them. */
function Road({ state }: { state: ReturnType<typeof useFrogRoad>['state'] }) {
  return (
    <ul className="pb-road__strip" aria-label="The road">
      {state.squares.map((square) => {
        const here = square.index === state.position;
        return (
          <li
            key={square.index}
            className={`pb-road__sq${square.sign === '+' ? ' is-plus' : ' is-minus'}${here ? ' is-here' : ''}`}
            aria-label={`Square ${square.index}, ${square.sign === '+' ? 'frogs get on' : 'frogs get off'}`}
          >
            <span className="pb-road__sign" aria-hidden="true">
              {square.sign}
            </span>
            {here ? (
              <span className="pb-road__car" role="img" aria-label="The car is here">
                🚗
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Frogs aboard, drawn as frogs — the count is content, not decoration. */
function Aboard({ count }: { count: number }) {
  return (
    <div className="pb-road__aboard">
      <p className="pb-road__aboard-label">
        Frogs aboard: <strong>{count}</strong>
      </p>
      <div className="pb-road__aboard-frogs" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: frogs are indistinguishable units rendered from a count; the index is positional only
          <span key={i} className="pb-road__frog">
            <CreatureGlyph digit={4} size={18} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function FrogRoadGame({ onExit }: Props) {
  const { state, rolled, lastSentence, roll, confirm, restart } = useFrogRoad();
  const turn = Math.min(state.turn, state.totalTurns);

  return (
    <div className="pb-play pb-road">
      <GameHeading />
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit}>
            ← Garden
          </button>
        ) : null}
        <p className="pb-road__turn">
          Turn {turn} of {state.totalTurns}
        </p>
        <Aboard count={state.frogsAboard} />
      </header>

      <Road state={state} />

      <div className="pb-road__controls">
        {state.finished ? (
          <div className="pb-road__recap" role="status">
            <h2>The ride is over</h2>
            <p className="pb-road__final">
              <strong>{state.frogsAboard}</strong> frog{state.frogsAboard === 1 ? '' : 's'} made it to the
              end.
            </p>
            <ul className="pb-road__log">
              {state.log.map((entry) => (
                <li key={entry.turn}>{turnSentence(entry)}</li>
              ))}
            </ul>
            <div className="pb-road__recap-actions">
              <button type="button" className="pb-btn pb-btn--loud" onClick={restart}>
                Another road
              </button>
              {onExit ? (
                <button type="button" className="pb-btn" onClick={onExit}>
                  Back to the garden
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="pb-road__dice" aria-live="polite">
              {rolled ? (
                <>
                  <span className="pb-road__die">Move {rolled.steps}</span>
                  <span className="pb-road__die">
                    {rolled.frogs} frog{rolled.frogs === 1 ? '' : 's'}
                  </span>
                </>
              ) : (
                <span className="pb-road__die pb-road__die--empty">Roll to see the two numbers</span>
              )}
            </div>
            <div className="pb-road__actions">
              <button type="button" className="pb-btn pb-btn--loud" onClick={roll} disabled={rolled !== null}>
                Roll
              </button>
              <button
                type="button"
                className="pb-btn pb-btn--secondary"
                onClick={confirm}
                disabled={rolled === null}
              >
                Go
              </button>
            </div>
            {lastSentence ? <p className="pb-road__last">{lastSentence}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
