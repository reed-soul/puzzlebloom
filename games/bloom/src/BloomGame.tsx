import { JAR, TIERS } from '@puzzlebloom/bloom-engine';
import { type CSSProperties, useRef } from 'react';
import { BloomCanvas, useHtmlInCanvasProbe } from './BloomCanvas';
import { useBloom } from './useBloom';
import './bloom.css';

/**
 * The visible header is a back button and a score, which is the right
 * interface and the wrong document. So the heading is real and not drawn.
 */
function GameHeading() {
  return <h1 className="sr-only">Bloom Drop for kids</h1>;
}

interface Props {
  /** Provided by the site shell, so the game never imports the router. */
  onExit?: () => void;
}

/**
 * The DOM rendering path: absolutely positioned circles, one div per bloom.
 * This is the complete game where HTML-in-Canvas is absent, and it is also
 * the a11y DOM for the canvas path (whose fallback content these divs mirror
 * in structure). Scale comes from one CSS variable so both paths size alike.
 */
function BloomDOM({ state }: { state: ReturnType<typeof useBloom>['state'] }) {
  const scale = 'calc(var(--pb-bloom-scale, 1))';
  return (
    <>
      {state.blooms.map((b) => {
        const r = TIERS[b.tier].radius;
        const style = {
          left: `calc(${b.x}px * ${scale} - 50%)`,
          top: `calc(${b.y}px * ${scale} - 50%)`,
          width: `calc(${r * 2}px * ${scale})`,
          height: `calc(${r * 2}px * ${scale})`,
        } as CSSProperties;
        return (
          <span key={b.id} className={`pb-bloom__tier pb-bloom__tier--${b.tier}`} style={style}>
            <span className="pb-bloom__face" />
          </span>
        );
      })}
      {/* The aim preview: same tier image, floating at the pending x. */}
      <span
        className={`pb-bloom__tier pb-bloom__tier--${state.pending.tier} pb-bloom__tier--pending`}
        style={
          {
            left: `calc(${state.pending.x}px * ${scale} - 50%)`,
            top: `calc(${state.pending.y}px * ${scale} - 50%)`,
            width: `calc(${TIERS[state.pending.tier].radius * 2}px * ${scale})`,
            height: `calc(${TIERS[state.pending.tier].radius * 2}px * ${scale})`,
          } as CSSProperties
        }
      >
        <span className="pb-bloom__face" />
      </span>
    </>
  );
}

export function BloomGame({ onExit }: Props) {
  const { state, aim, drop, restart } = useBloom();
  const stageRef = useRef<HTMLDivElement>(null);
  // One probe, two consumers: the canvas layer mounts only when the API is
  // there, and the DOM layer hides only then too — never both, never neither.
  const canvasPath = useHtmlInCanvasProbe();

  // Pointer input: move to aim, release to drop. `onPointerDown` also aims,
  // so a tap anywhere is "put it there" — the whole surface is the control.
  const pointerX = (event: React.PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return ((event.clientX - rect.left) / rect.width) * JAR.width;
  };

  return (
    <div className={`pb-play pb-bloom${state.over ? ' is-over' : ''}`}>
      <GameHeading />
      <header className="pb-play__bar">
        {onExit ? (
          <button type="button" className="pb-back" onClick={onExit}>
            ← Garden
          </button>
        ) : null}
        <p className="pb-bloom__score" aria-live="off">
          Score <strong>{state.score}</strong>
        </p>
        <p className="pb-bloom__best">Best bloom: {TIERS[state.bestTier].name}</p>
      </header>

      <div
        ref={stageRef}
        className="pb-bloom__stage"
        style={
          {
            // Length ÷ length = a number, the only division CSS allows inside
            // min() here; length ÷ number is invalid and the whole expression
            // collapses (this is exactly the bug that shipped the stage at
            // 6×3px). Cap at 1 so desktops keep the natural size.
            '--pb-bloom-scale': 'min(100vw / 340px, 82vh / 440px, 1)',
          } as CSSProperties
        }
        onPointerMove={(e) => aim(pointerX(e))}
        onPointerDown={(e) => aim(pointerX(e))}
        onPointerUp={(e) => {
          aim(pointerX(e));
          drop();
        }}
        role="application"
        aria-label="Drop blooms: move to aim, release to drop. Arrow keys aim, space drops."
      >
        <BloomCanvas state={state} />
        <div className="pb-bloom__dom-stage" hidden={canvasPath}>
          <BloomDOM state={state} />
        </div>

        {state.over ? (
          <div className="pb-bloom__over" role="status">
            <div className="pb-bloom__over-card">
              <h2>The jar is full</h2>
              <p>
                <strong>{state.score}</strong> points, best bloom a{' '}
                <strong>{TIERS[state.bestTier].name}</strong>.
              </p>
              <p className="pb-bloom__over-note">Every garden ends. Another one is a tap away.</p>
              <div className="pb-bloom__over-actions">
                <button type="button" className="pb-btn pb-btn--loud" onClick={restart}>
                  A new jar
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

      <p className="pb-bloom__hint">Move to aim · release to drop · two of a kind grow into one</p>
    </div>
  );
}
