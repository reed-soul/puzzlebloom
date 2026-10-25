import { CreatureGlyph, Segmented } from '@puzzlebloom/ui';
import { type CSSProperties, useEffect } from 'react';
import { BalanceCanvas } from './BalanceCanvas';
import { balanceManifest } from './manifest';
import { useBalance } from './useBalance';
import { useHtmlInCanvas } from './useHtmlInCanvas';
import './balance.css';

/**
 * The visible header is a back button, a level and a target, which is the
 * right interface and the wrong document: a crawler would find no heading at
 * all. So the heading is real and not drawn.
 */
function GameHeading() {
  return <h1 className="sr-only">Number balance for kids</h1>;
}

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

/** The beam and its two pans. One DOM tree, rotated by one CSS variable. */
function Beam({
  angle,
  leftTiles,
  rightTiles,
  rightFrogs,
}: {
  angle: number;
  leftTiles: number[];
  rightTiles: number[];
  rightFrogs: number;
}) {
  return (
    <div className="pb-bal__stage">
      <div className="pb-bal__beam" style={{ '--pb-bal-angle': `${angle}deg` } as CSSProperties}>
        {/* Left pan: the puzzle's numerals, fixed. */}
        <div className="pb-bal__pan pb-bal__pan--left">
          {leftTiles.map((tile, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the left pan never reorders — tiles are placed by the puzzle and lifted only from the right, so the index is a slot's identity
            <span key={`${tile}-${i}`} className="pb-bal__tile pb-bal__tile--given">
              {tile}
            </span>
          ))}
        </div>
        <div className="pb-bal__fulcrum" aria-hidden="true" />
        {/* Right pan: what the child is building. */}
        <div className="pb-bal__pan pb-bal__pan--right">
          {rightTiles.map((tile, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: tiles stack and only the top unstacks, so a slot's index is its identity
            <span key={`${tile}-${i}`} className="pb-bal__tile">
              {tile}
            </span>
          ))}
          {Array.from({ length: rightFrogs }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: frogs are indistinguishable units that only append or drop from the end
            <span key={`frog-${i}`} className="pb-bal__frog">
              <CreatureGlyph digit={4} size={22} />
            </span>
          ))}
        </div>
      </div>
      <div className="pb-bal__base" aria-hidden="true" />
    </div>
  );
}

export function BalanceGame({ onExit }: Props) {
  const game = useBalance();
  const { puzzle, angle, leftSum, rightSum, status, equation } = game;
  // Progressive enhancement: the canvas beam when the engine can draw DOM into
  // a canvas, the CSS beam otherwise. The DOM stays the complete game either
  // way — see ADR-009.
  const canvasBeam = useHtmlInCanvas();

  // Announce the outcome politely. aria-live rather than an alert, because a
  // wrong weigh is information, not an error, and information gets phrased
  // as what to try rather than what was done wrong.
  useEffect(() => {
    if (status === 'solved') return; // the win panel speaks for itself
  }, [status]);

  const heavier = leftSum > rightSum ? 'left' : rightSum > leftSum ? 'right' : 'level';
  const verdict =
    status === 'solved'
      ? 'Balanced!'
      : game.state.weighed
        ? heavier === 'left'
          ? 'The numeral side is heavier — count on more frogs.'
          : heavier === 'right'
            ? 'Too many — take a frog off.'
            : 'Level!'
        : 'Add frogs or tiles, then weigh.';

  return (
    <div className={`pb-play pb-balance${status === 'solved' ? ' is-solved' : ''}`}>
      <GameHeading />
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit}>
            ← Garden
          </button>
        ) : null}
        <Segmented
          label="Level"
          value={String(game.level)}
          options={[
            { value: '1', label: 'Level 1', hint: 'One numeral' },
            { value: '2', label: 'Level 2', hint: 'Two numerals' },
            { value: '3', label: 'Level 3', hint: 'Two, one small' },
          ]}
          onChange={(v) => game.chooseLevel(Number(v) as 1 | 2 | 3)}
          size="sm"
        />
        <p className="pb-bal__target" aria-live="polite">
          {verdict}
        </p>
      </header>

      {canvasBeam ? (
        <BalanceCanvas
          targetAngle={angle}
          leftTiles={puzzle.left}
          rightTiles={game.state.right.tiles}
          rightFrogs={game.state.right.frogs}
        />
      ) : (
        <Beam
          angle={angle}
          leftTiles={puzzle.left}
          rightTiles={game.state.right.tiles}
          rightFrogs={game.state.right.frogs}
        />
      )}

      <div className="pb-bal__controls">
        <div className="pb-bal__tray">
          <p className="pb-bal__tray-label">Number tiles</p>
          {game.tilesOffered.map((n) => (
            <button key={n} type="button" className="pb-bal__tile-btn" onClick={() => game.placeTile(n)}>
              {n}
            </button>
          ))}
        </div>
        <div className="pb-bal__frogs">
          <p className="pb-bal__tray-label">Frogs (worth 1 each)</p>
          <div className="pb-bal__frog-btns">
            <button type="button" className="pb-btn pb-btn--secondary" onClick={game.dropFrog}>
              + Frog
            </button>
            <button
              type="button"
              className="pb-btn pb-btn--secondary"
              onClick={game.liftFrog}
              disabled={game.state.right.frogs === 0}
            >
              − Frog
            </button>
          </div>
        </div>
        <div className="pb-bal__actions">
          <button type="button" className="pb-btn pb-btn--loud" onClick={game.doWeigh}>
            Weigh
          </button>
          <button type="button" className="pb-btn" onClick={game.resetPan} disabled={status === 'solved'}>
            Empty the pan
          </button>
          {game.state.right.tiles.length > 0 ? (
            <button type="button" className="pb-bal__linkish" onClick={game.liftTile}>
              Take top tile off
            </button>
          ) : null}
        </div>
      </div>

      {status === 'solved' ? (
        <div className="pb-bal__win" role="status">
          <div className="pb-bal__win-card">
            <h2>It balances!</h2>
            <p className="pb-bal__equation">{equation}</p>
            <p className="pb-bal__win-note">
              Both sides hold the same number. That is all the equals sign ever meant.
            </p>
            <div className="pb-bal__win-actions">
              <button type="button" className="pb-btn pb-btn--loud" onClick={game.nextPuzzle}>
                Next puzzle
              </button>
              {onExit ? (
                <button type="button" className="pb-btn" onClick={onExit}>
                  Back to the garden
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { balanceManifest };
