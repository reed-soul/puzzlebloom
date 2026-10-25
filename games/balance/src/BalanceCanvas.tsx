/**
 * The HTML-in-Canvas layer for Number Balance: a physical beam drawn live.
 *
 * This mounts only when the browser can do it — the probe in `useHtmlInCanvas`
 * sets `content="drawable"` on a scratch canvas and reads it back. There is no
 * UA sniffing and no flag; Chrome behind its flag, or any engine that ships
 * the API, gets the canvas beam and everything else keeps the CSS beam.
 *
 * The structure is unchanged from the DOM version: the same tiles, the same
 * frogs, the same fulcrum. What the canvas adds is dynamics — the beam angle
 * follows an under-damped spring from the engine's tilt value, so a weigh
 * overshoots and settles the way a real beam does, instead of easing between
 * two numbers. The DOM subtrees stay in the accessibility tree at the drawn
 * geometry, which is what this API buys over the old "draw UI on canvas and
 * lose the a11y" trade.
 */

import { useEffect, useRef } from 'react';

interface Props {
  /** The engine's target angle in degrees, ±14. */
  targetAngle: number;
  leftTiles: number[];
  rightTiles: number[];
  rightFrogs: number;
}

/**
 * One spring step. Under-damped on purpose: the beam should swing through
 * level and come back, like an object with mass, not like a value.
 */
function springStep(current: number, velocity: number, target: number, dt: number) {
  const stiffness = 90;
  const damping = 7;
  const force = (target - current) * stiffness - velocity * damping;
  const next = current + velocity * dt;
  return { angle: next, velocity: velocity + force * dt };
}

export function BalanceCanvas({ targetAngle, leftTiles, rightTiles, rightFrogs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const beam = beamRef.current;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!canvas || !beam || !left || !right) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // DPR-correct backing store, so the beam renders at native resolution.
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

    let angle = targetAngle;
    let velocity = 0;
    let last = performance.now();

    // The beam's colour, read once per mount rather than per paint.
    const themeLine = getComputedStyle(canvas).getPropertyValue('--pb-line').trim();
    const beamFill = themeLine === '' ? 'rgba(120,120,120,0.35)' : themeLine;

    // The API is event-driven: drawElementImage may only run inside the paint
    // event, when the browser has a cached paint record for the drawable
    // elements. Animating means asking for the next paint, not drawing on a
    // timer — requestPaint() schedules exactly one paint, so the loop drives
    // itself only while the spring still has energy.
    const onPaint = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const step = springStep(angle, velocity, targetAngle, dt);
      angle = step.angle;
      velocity = step.velocity;

      ctx.reset();
      ctx.save();
      ctx.scale(dpr, dpr);

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h * 0.5;
      const arm = Math.min(w * 0.42, 220);

      // The beam bar: the one thing painted by hand, from the theme token.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.fillStyle = beamFill;
      ctx.beginPath();
      ctx.roundRect(-arm, -5, arm * 2, 10, 5);
      ctx.fill();
      ctx.restore();

      // The pans hang from the beam ends, so they rotate with it.
      // drawElementImage keeps hit-testing and a11y bounds glued to wherever
      // they are drawn.
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const leftX = cx - arm * cos;
      const leftY = cy - arm * sin;
      const rightX = cx + arm * cos;
      const rightY = cy + arm * sin;

      const lw = left.offsetWidth;
      const rw = right.offsetWidth;
      ctx.drawElementImage(left, leftX - lw / 2, leftY - 6);
      ctx.drawElementImage(right, rightX - rw / 2, rightY - 6);

      ctx.restore();

      if (Math.abs(targetAngle - angle) > 0.01 || Math.abs(velocity) > 0.01) {
        canvas.requestPaint();
      }
    };
    canvas.addEventListener('paint', onPaint);
    canvas.requestPaint();

    return () => {
      canvas.removeEventListener('paint', onPaint);
      observer.disconnect();
    };
    // The spring re-targets whenever the engine's tilt value changes.
  }, [targetAngle]);

  return (
    <div className="pb-bal-canvas__stage">
      {/* The drawable subtrees live INSIDE the canvas — the API draws an
          element only into its nearest ancestor <canvas>, and fallback content
          is exactly what canvas children are for. `content="drawable"` makes
          the canvas lay them out; they are never painted into the page, only
          drawn at the beam-end coordinates each frame. */}
      <canvas
        ref={canvasRef}
        className="pb-bal-canvas__canvas"
        content="drawable"
        aria-label="The balance beam"
      >
        <div ref={leftRef} drawable className="pb-bal__pan pb-bal__pan--left">
          {leftTiles.map((tile, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: the left pan never reorders; the index is a slot's identity
            <span key={`${tile}-${i}`} className="pb-bal__tile pb-bal__tile--given">
              {tile}
            </span>
          ))}
        </div>
        <div ref={rightRef} drawable className="pb-bal__pan pb-bal__pan--right">
          {rightTiles.map((tile, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: tiles stack and only the top unstacks
            <span key={`${tile}-${i}`} className="pb-bal__tile">
              {tile}
            </span>
          ))}
          {Array.from({ length: rightFrogs }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: frogs are indistinguishable units
            <span key={`frog-${i}`} className="pb-bal__frog">
              <span className="pb-bal__frog-dot" />
            </span>
          ))}
        </div>
        <div ref={beamRef} drawable className="pb-bal-canvas__ghost" aria-hidden="true">
          beam
        </div>
      </canvas>
    </div>
  );
}
