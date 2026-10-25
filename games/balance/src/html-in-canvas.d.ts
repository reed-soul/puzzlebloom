/**
 * Local type surface for the HTML-in-Canvas API (Chrome 138+, behind
 * `--enable-blink-features=CanvasDrawElement` until it ships stable).
 *
 * TypeScript's DOM lib does not carry these yet. Declared here, next to the
 * only code that touches them, so the day lib.dom adds them the overlap will
 * conflict at compile time and this file can be deleted — a deliberately loud
 * expiry.
 */

import 'react';

declare global {
  interface CanvasPaintEvent extends Event {
    /** Drawable descendants that visually changed since the last paint. */
    changedElements: Element[];
  }

  interface HTMLCanvasElement {
    content: string | null;
    layoutSubtree?: unknown;
    onpaint: ((event: CanvasPaintEvent) => void) | null;
    requestPaint(): void;
    updateElementGeometry(element: Element, options?: { canvasTransform?: DOMMatrix }): void;
    clearElementGeometry(element: Element): void;
  }

  interface CanvasRenderingContext2D {
    drawElementImage(
      element: Element,
      dx: number,
      dy: number,
      options?: { preserveElementGeometry?: boolean },
    ): void;
    drawElementImage(
      element: Element,
      dx: number,
      dy: number,
      dWidth: number,
      dHeight: number,
      options?: { preserveElementGeometry?: boolean },
    ): void;
    reset(): void;
  }
}

declare module 'react' {
  interface HTMLAttributes<T> {
    /** HTML-in-Canvas: marks the element as an independent canvas paint root. */
    drawable?: boolean;
    /** HTML-in-Canvas: on the canvas element, opts its subtree into canvas layout. */
    content?: string;
  }
}
