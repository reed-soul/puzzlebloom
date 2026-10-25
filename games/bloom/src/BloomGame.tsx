import { JAR, TIERS } from '@puzzlebloom/bloom-engine';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { BloomCanvas, useHtmlInCanvasProbe } from './BloomCanvas';
import { MergeJuice } from './MergeJuice';
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
function BloomDOM({
  state,
  poppedId,
}: {
  state: ReturnType<typeof useBloom>['state'];
  poppedId: number | null;
}) {
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
          <span
            key={b.id}
            className={`pb-bloom__tier pb-bloom__tier--${b.tier}${b.id === poppedId ? ' is-popped' : ''}`}
            style={style}
          >
            <img
              src={`/art/bloom/creature-${TIERS[b.tier].name}.png`}
              alt=""
              draggable={false}
              loading="eager"
              decoding="sync"
            />
          </span>
        );
      })}
      {/* The aim preview: same creature art, floating at the pending x. */}
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
        <img
          src={`/art/bloom/creature-${TIERS[state.pending.tier].name}.png`}
          alt=""
          draggable={false}
          loading="eager"
          decoding="sync"
        />
      </span>
    </>
  );
}

export function BloomGame({ onExit }: Props) {
  const { state, aim, drop, restart, combo, celebration, pops } = useBloom();
  const stageRef = useRef<HTMLDivElement>(null);
  // One probe, two consumers: the canvas layer mounts only when the API is
  // there, and the DOM layer hides only then too — never both, never neither.
  const canvasPath = useHtmlInCanvasProbe();
  const comboAlive = combo.count >= 2 && performance.now() < combo.until;
  // The newest bloom pops (squash & spring back, game-feel style): track the
  // id of the last merge-born creature so its img gets the one-shot class.
  const [poppedId, setPoppedId] = useState<number | null>(null);
  const lastMergeId = useRef(0);
  useEffect(() => {
    if (state.merges.length === 0) return;
    // The merged child took state.seq - blooms.length + i … simplest: the
    // freshest id in the jar right after a merge is the popped one.
    const newest = Math.max(...state.blooms.map((b) => b.id));
    if (newest !== lastMergeId.current) {
      lastMergeId.current = newest;
      setPoppedId(newest);
      const clear = setTimeout(() => setPoppedId(null), 320);
      return () => clearTimeout(clear);
    }
  }, [state.merges, state.blooms]);

  // Pointer input: move to aim, release to drop. Aim follows the pointer
  // across the WHOLE window, not just the stage — a desktop player moves the
  // mouse toward the jar from wherever it was, and if the preview only
  // reacts inside the jar it reads as "PC can't play this" (a real report).
  // The stage still owns down/up: the drop is a claim about the jar.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      aim(((event.clientX - rect.left) / rect.width) * JAR.width);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [aim]);

  const pointerX = (event: React.PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return ((event.clientX - rect.left) / rect.width) * JAR.width;
  };

  // A press that began on the jar must drop even if the release happens
  // outside it — desktop players drag past the jar's edge constantly. The
  // engine clamps the aim, so an outside release still drops at the wall.
  const pressedRef = useRef(false);
  useEffect(() => {
    const onUp = (event: PointerEvent) => {
      if (!pressedRef.current) return;
      pressedRef.current = false;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      aim(((event.clientX - rect.left) / rect.width) * JAR.width);
      drop();
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [aim, drop]);

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
        onPointerDown={(e) => {
          pressedRef.current = true;
          aim(pointerX(e));
        }}
        role="application"
        aria-label="Drop blooms: move to aim, release to drop. Arrow keys aim, space drops."
      >
        <BloomCanvas state={state} />
        <div className="pb-bloom__dom-stage" hidden={canvasPath}>
          <BloomDOM state={state} poppedId={poppedId} />
        </div>
        <MergeJuice merges={state.merges} />

        {/* Score pops: each merge's points float up where it happened. */}
        <div className="pb-bloom__pops" aria-hidden="true">
          {pops.map((pop) => (
            <span
              key={pop.id}
              className="pb-bloom__pop"
              style={
                {
                  left: `calc(${pop.x}px * var(--pb-bloom-scale, 1))`,
                  top: `calc(${pop.y}px * var(--pb-bloom-scale, 1))`,
                } as CSSProperties
              }
            >
              {pop.text}
            </span>
          ))}
        </div>

        {comboAlive ? (
          <p className="pb-bloom__combo" aria-live="polite">
            {combo.count} in a row!
          </p>
        ) : null}

        {celebration ? (
          <div className="pb-bloom__celebrate" role="status">
            <span className="pb-bloom__celebrate-creature">
              <img src={`/art/bloom/creature-${TIERS[celebration.tier].name}.png`} alt="" draggable={false} />
            </span>
            <p>A {TIERS[celebration.tier].name}! First time in this garden.</p>
          </div>
        ) : null}

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
