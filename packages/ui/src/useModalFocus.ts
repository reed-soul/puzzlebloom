import { type RefObject, useEffect, useRef } from 'react';

/**
 * The focus contract for a dialog, in one place.
 *
 * `role="dialog"` and `aria-modal="true"` are declarations, not behaviour: they
 * tell a screen reader that everything else is inert while saying nothing about
 * where focus should be. A reader trusts the declaration, so a dialog that does
 * not move focus is worse than an honest `role="group"` — the announcement says
 * "modal" and then Tab walks the board behind it.
 *
 * This lives in `packages/ui` rather than in a game because there has to be one
 * definition. Two games each growing their own version is how the third one ends
 * up with a fourth.
 *
 * The four things it does, and why each is not optional:
 *
 * 1. Remembers what had focus before opening and hands it back on close. Without
 *    this, dismissing a dialog drops the user at the top of the document. The
 *    hand-back is also deferred a frame, for the mirror image of reason 2:
 *    removing the dialog from the document triggers the browser's own focus
 *    repair, which runs after our call and wins in WebKit, so a synchronous
 *    restore there lands on `<body>`.
 * 2. Focuses the container on the next frame. Not synchronously: a pointer
 *    press focuses the pressed element as the *default action of the press*,
 *    which runs after the event handler returns — after React has already
 *    committed the dialog — so a synchronous `focus()` here is reliably undone
 *    by the browser a microtask later. Next frame is after the browser has
 *    finished with the press, which is the first moment the call sticks.
 * 3. Owns Tab and Shift+Tab entirely: every press is prevented and the next stop
 *    is computed here. Letting the browser handle the middle of the list is not
 *    portable — Safari's default tab order skips buttons, so the second Tab out
 *    of a two-button dialog lands on `<body>`, and a `focusin` listener cannot
 *    see it because landing on the body fires no focus event at all. Managing
 *    the whole cycle is what the ARIA practices actually ask of a modal dialog;
 *    leaving it to the browser means inheriting each browser's quirks.
 * 4. Pulls focus back if it lands outside at all, which covers focus arriving
 *    from somewhere other than the keyboard — a script, a click on the
 *    backdrop, a browser shortcut.
 *
 * What it deliberately does not do: close on Escape. A finished puzzle has no
 * "cancel" meaning, and a dismissable modal is a modal a child loses their
 * result to. Each call site explains that in its own comment.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * What can be reached by pressing Tab right now, in document order.
 *
 * Read from the DOM each time rather than captured on open, because a dialog's
 * buttons appear and disappear while it is open — "Mark it" turns into "Got it",
 * a hint button disables itself — and a stale list sends Tab to a node that is
 * no longer rendered. `getClientRects()` is the visibility test rather than
 * `offsetParent`, which reports null for a fixed-position dialog.
 */
function tabbableIn(container: HTMLElement): HTMLElement[] {
  const found = container.querySelectorAll<HTMLElement>(FOCUSABLE);
  return Array.from(found).filter((element) => element.getClientRects().length > 0);
}

/**
 * Make a container behave like the dialog it claims to be.
 *
 * @param containerRef The element that receives focus when the dialog opens.
 *   It needs `tabIndex={-1}` to be focusable at all.
 * @param open Whether the dialog is currently mounted and showing.
 */
export function useModalFocus(containerRef: RefObject<HTMLElement | null>, open: boolean): void {
  // The hand-back frame outlives the effect that schedules it, so its id lives
  // outside the effect: re-opening supersedes it, and unmounting cancels it. A
  // callback that focuses an element after the component is gone is exactly the
  // ghost this hook exists to not leave behind.
  const restoreRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    // A queued hand-back belongs to the close this open replaces; leaving it
    // queued would pull focus out of the dialog a frame after opening it.
    cancelAnimationFrame(restoreRef.current);
    restoreRef.current = 0;

    const container = containerRef.current;
    if (!container) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // True until the opening frame has run. During that window anything outside
    // is almost certainly the browser's own press-to-focus racing us, so focus
    // goes to the container — the same place the keyboard path ends up — rather
    // than jumping into the first button. After the window, a stray focus is a
    // deliberate act and the first control is the better landing spot.
    let opening = true;

    const firstTabbable = (): HTMLElement => tabbableIn(container)[0] ?? container;

    const frame = requestAnimationFrame(() => {
      opening = false;
      if (!container.contains(document.activeElement)) container.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      // Every Tab press is answered here; none is handed to the browser. The
      // list is recomputed on the press rather than snapshotted on open, because
      // a dialog's buttons change while it is up.
      event.preventDefault();
      const items = tabbableIn(container);
      if (items.length === 0) {
        // A dialog with nothing to tab to still must not leak focus.
        container.focus();
        return;
      }
      // The container itself is not in the list — it is `tabindex="-1"` — so it
      // reads as "not in the list" and Tab from it starts at the top.
      const active = document.activeElement;
      const at = active instanceof HTMLElement ? items.indexOf(active) : -1;
      const step = event.shiftKey ? -1 : 1;
      const next =
        at === -1 ? (event.shiftKey ? items.length - 1 : 0) : (at + step + items.length) % items.length;
      items[next].focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && container.contains(event.target)) return;
      (opening ? container : firstTabbable()).focus();
    };

    container.addEventListener('keydown', onKeyDown);
    // Capture, so the pull-back happens before anything else reacts to focus
    // having left.
    document.addEventListener('focusin', onFocusIn, true);

    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn, true);
      // The opener can be gone by now — "Another one" rebuilds the board under
      // the dialog and the square that was pressed may no longer exist.
      if (!opener?.isConnected) return;
      // Deferred, for the mirror image of the reason the opening focus is: the
      // dialog left the document in this commit, and the browser repairs focus
      // after the removal. Synchronous, WebKit's repair wins and the user lands
      // on `<body>`.
      restoreRef.current = requestAnimationFrame(() => {
        restoreRef.current = 0;
        if (opener.isConnected) opener.focus();
      });
    };
  }, [containerRef, open]);

  // Declared after the effect above on purpose: on unmount React runs cleanups
  // in declaration order, so this cancel has to come second to catch the frame
  // the cleanup above just scheduled.
  useEffect(() => () => cancelAnimationFrame(restoreRef.current), []);
}
