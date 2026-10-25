import { type BloomState, JAR, TIERS } from '@puzzlebloom/bloom-engine';
import { useEffect, useRef, useState } from 'react';

/**
 * The feature probe for HTML-in-Canvas, local to this package: a games/
 * package importing from a sibling game would couple two chunks that ship and
 * lazy-load independently, so the ten lines are copied rather than shared.
 * Same detection as Chrome documents: set content="drawable", read it back.
 */
export function useHtmlInCanvasProbe(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    // Reduced-motion preference is honoured by not mounting the animated
    // canvas layer at all — the DOM path renders the same world without a
    // repaint loop. This is a motion decision, so it belongs in the probe.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSupported(false);
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.setAttribute('content', 'drawable');
      setSupported(canvas.content === 'drawable');
    } catch {
      setSupported(false);
    }
  }, []);
  return supported;
}

interface Props {
  state: BloomState;
}

/**
 * The canvas rendering path (ADR-009's pattern, applied to a busier scene).
 *
 * Nine drawable divs — one per tier, styled once by CSS — are laid out inside
 * the canvas. Each paint draws each bloom's tier image at the bloom's physics
 * position. This is the API doing what it was designed for: the game's entire
 * moving cast is DOM (themeable, accessible as fallback content), and the
 * per-frame cost is paint-calls against nine cached element images instead of
 * React reconciling ninety absolutely-positioned nodes.
 *
 * Animation is requestPaint-driven; when the world goes quiet the loop stops
 * asking, and the next state change from React re-kicks it.
 */
export function BloomCanvas({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tierRefs = useRef<Array<HTMLDivElement | null>>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const supported = useHtmlInCanvasProbe();

  useEffect(() => {
    if (!supported) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.requestPaint();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const onPaint = () => {
      const s = stateRef.current;
      ctx.reset();
      ctx.save();
      ctx.scale(dpr, dpr);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const scale = Math.min(w / JAR.width, h / JAR.height);
      const offsetX = (w - JAR.width * scale) / 2;
      const offsetY = (h - JAR.height * scale) / 2;

      // The pending drop, drawn above the jar as the aim preview.
      const pendingNode = tierRefs.current[s.pending.tier];
      if (pendingNode) {
        ctx.drawElementImage(
          pendingNode,
          offsetX + (s.pending.x - TIERS[s.pending.tier].radius) * scale,
          offsetY + (s.pending.y - TIERS[s.pending.tier].radius) * scale,
          TIERS[s.pending.tier].radius * 2 * scale,
          TIERS[s.pending.tier].radius * 2 * scale,
        );
      }

      for (const b of s.blooms) {
        const node = tierRefs.current[b.tier];
        if (!node) continue;
        const r = TIERS[b.tier].radius;
        ctx.drawElementImage(
          node,
          offsetX + (b.x - r) * scale,
          offsetY + (b.y - r) * scale,
          r * 2 * scale,
          r * 2 * scale,
        );
      }
      ctx.restore();

      // The world keeps moving while anything has velocity; the useBloom loop
      // re-kicks paint through state changes when the next tick moves things.
      canvas.requestPaint();
    };
    canvas.addEventListener('paint', onPaint);
    canvas.requestPaint();

    return () => {
      canvas.removeEventListener('paint', onPaint);
      observer.disconnect();
    };
  }, [supported]);

  if (!supported) return null;

  return (
    <canvas ref={canvasRef} className="pb-bloom__canvas" content="drawable" aria-label="The jar">
      {/* One div per tier. Never painted into the page; drawn wherever a
          bloom of that tier is. The creature art is the tier's identity —
          the same art the DOM path renders, so both paths show one world. */}
      {TIERS.map((tier, index) => (
        <div
          key={tier.name}
          ref={(node) => {
            tierRefs.current[index] = node;
          }}
          drawable
          className={`pb-bloom__tier pb-bloom__tier--${index}`}
        >
          <img src={`/art/bloom/creature-${tier.name}.png`} alt="" draggable={false} />
        </div>
      ))}
    </canvas>
  );
}
