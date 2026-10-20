/**
 * The View Transitions API, as a one-function convenience.
 *
 * Two moments in this product are genuine scene changes: one page becoming
 * another, and one mood becoming another. Both are cross-fades the browser can
 * do on the compositor — no animation library, no exit animations to hand-
 * write, no state machine to keep in sync with React.
 *
 * Three gates, in order:
 *   1. is the API there at all (Safari 18, Firefox 144 do; older ones do not)
 *   2. does the visitor want motion (`prefers-reduced-motion`)
 *   3. is there actually a change
 *
 * The callback runs inside `flushSync` because React 19 renders concurrently:
 * without it the browser would snapshot the DOM before the new page exists and
 * the transition would cross-fade a page with itself.
 */

import { flushSync } from 'react-dom';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function withViewTransition(update: () => void): void {
  // `startViewTransition` is in the DOM lib as of TypeScript 5.6, but it is
  // optional at runtime, so the property is probed rather than trusted.
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  try {
    document.startViewTransition(() => flushSync(update));
  } catch {
    // A transition can be skipped (a second navigation mid-flight, a tab
    // regaining focus). The update must still happen.
    update();
  }
}
