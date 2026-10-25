/**
 * The Tangram screen's whole state, in one hook.
 *
 * Four decisions shape this file.
 *
 * 1. A piece is never "in the tray" or "on the board" as a fact about itself.
 *    Every piece always has a placement, and whether it is resting in the tray
 *    is answered by asking the layout where it is. That makes dragging a piece
 *    back to the tray a legal move instead of a special case, and it means a
 *    save is seven positions and nothing else.
 *
 * 2. The judge runs on a drop, never on a pointer move. Rasterising the figure
 *    takes a few tens of milliseconds; thirty of those a second is visible as
 *    lag on a phone, and the verdict cannot change until the piece stops.
 *
 * 3. Snapping is specified in pixels, because "the corners look like they meet"
 *    is a fact about the screen and not about figure units. The Board measures
 *    how many CSS pixels one unit is at the current size and hands it in with
 *    every call that may snap, so the tolerance is fourteen pixels on a phone
 *    and fourteen pixels on a projector.
 *
 * 4. Nothing here penalises a mistake. A wrong placement is not marked wrong,
 *    no counter goes up. The hint is the only voice allowed to say anything.
 */

import {
  checkFigure,
  clearProgress,
  dailyFigure,
  type Figure,
  figureAfter,
  figureById,
  type Hint,
  inTray,
  layoutFor,
  localDateKey,
  mirrored,
  movedTo,
  nextHint,
  PIECE_IDS,
  type PieceId,
  type Placement,
  type Point,
  readProgress,
  snapOnNudge,
  snapPlacement,
  type TangramLayout,
  TUTORIAL_FIGURE_ID,
  translate,
  turned,
  verticesOf,
  writeProgress,
} from '@puzzlebloom/tangram-engine';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Clock, createClock, formatClock } from './clock';

/** Deep enough to undo a whole figure without holding on to anything large. */
const MAX_HISTORY = 60;

/**
 * Fourteen pixels: roughly a fingertip, and about a tenth of a piece. Wide
 * enough that a piece dropped near the right place clicks in, narrow enough
 * that a piece dropped in open space stays where it was left.
 */
export const SNAP_PX = 14;

/** Two nudges of the same piece this close together are one undo step. */
const NUDGE_WINDOW_MS = 1200;

export type GameStatus = 'loading' | 'ready';

export interface TangramController {
  status: GameStatus;
  figure: Figure | null;
  layout: TangramLayout | null;
  placements: readonly Placement[];
  /** The piece the toolbar acts on: the one last picked or focused. */
  selected: PieceId | null;
  /** The piece under the pointer right now, drawn last so it is never hidden. */
  dragging: PieceId | null;
  hint: Hint | null;
  paused: boolean;
  solved: boolean;
  isDaily: boolean;
  dailyDate: string | null;
  clock: string;
  hintsUsed: number;
  /** How many pieces are off the tray. Not a score, and not shown as one. */
  placed: number;
  canUndo: boolean;
  select: (id: PieceId | null) => void;
  beginDrag: (id: PieceId, point: Point) => void;
  dragTo: (point: Point) => void;
  endDrag: (pxPerUnit: number) => void;
  nudge: (id: PieceId, dx: number, dy: number, pxPerUnit: number) => void;
  rotate: () => void;
  flip: () => void;
  undo: () => void;
  askHint: () => void;
  dismissHint: () => void;
  pause: () => void;
  resume: () => void;
  nextFigure: () => void;
  chooseFigure: (id: string) => void;
  playDaily: () => void;
}

interface Drag {
  readonly id: PieceId;
  /** Centroid minus pointer, in figure units, so the piece does not jump. */
  readonly offsetX: number;
  readonly offsetY: number;
  /** Where it was when the gesture began, which is what the drag is measured from. */
  readonly origin: Placement;
}

/** Placements in `PIECE_IDS` order, so the save string and the DOM agree. */
function inOrder(list: readonly Placement[]): Placement[] {
  const found = PIECE_IDS.map((id) => list.find((where) => where.id === id));
  return found.filter((where): where is Placement => where !== undefined);
}

const withPiece = (list: readonly Placement[], next: Placement): Placement[] =>
  list.map((where) => (where.id === next.id ? next : where));

const same = (a: Placement, b: Placement): boolean =>
  a.cx === b.cx && a.cy === b.cy && a.rotation === b.rotation && a.flipped === b.flipped;

/**
 * Did this gesture change the board at all?
 *
 * Compared over all seven pieces, not over the one that moved, because the
 * question a drag has to answer before it records an undo step is "is the board
 * different from how I found it". A drop that snapped back onto its own corner
 * is not; a piece carried back to the tray is, even though it ends up somewhere
 * that looks idle.
 */
function differs(a: readonly Placement[], b: readonly Placement[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((piece) => {
    const other = b.find((where) => where.id === piece.id);
    return other === undefined || !same(piece, other);
  });
}

/** Fourteen pixels, expressed in figure units at whatever size the board is. */
const unitsFor = (pxPerUnit: number): number => SNAP_PX / Math.max(pxPerUnit, 1e-6);

export function useTangram(): TangramController {
  const [status, setStatus] = useState<GameStatus>('loading');
  const [figure, setFigure] = useState<Figure | null>(null);
  const [layout, setLayout] = useState<TangramLayout | null>(null);
  const [placements, setPlacements] = useState<readonly Placement[]>([]);
  const [selected, setSelected] = useState<PieceId | null>(null);
  const [dragging, setDragging] = useState<PieceId | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [paused, setPaused] = useState(false);
  const [solved, setSolved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isDaily, setIsDaily] = useState(false);
  const [dailyDate, setDailyDate] = useState<string | null>(null);

  const figureRef = useRef<Figure | null>(null);
  const layoutRef = useRef<TangramLayout | null>(null);
  const placementsRef = useRef<readonly Placement[]>([]);
  const selectedRef = useRef<PieceId | null>(null);
  const historyRef = useRef<Array<readonly Placement[]>>([]);
  const clockRef = useRef<Clock>(createClock());
  const hintsUsedRef = useRef(0);
  const dailyRef = useRef<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const dragOriginRef = useRef<readonly Placement[] | null>(null);
  const nudgeRef = useRef<{ id: PieceId; at: number } | null>(null);

  const persist = useCallback((finished: boolean) => {
    const current = figureRef.current;
    if (!current) return;
    writeProgress({
      figureId: current.id,
      placements: placementsRef.current,
      elapsedMs: clockRef.current.elapsedMs,
      hintsUsed: hintsUsedRef.current,
      daily: dailyRef.current,
      finished,
    });
  }, []);

  /**
   * The single write path. Every change to the board lands here, which is what
   * makes "the figure is finished" impossible to miss: there is one place a
   * board can become complete, and it is this one.
   *
   * `before` exists because of dragging. A drag writes the moving piece into
   * the board on every pointer move — that is what makes the piece follow the
   * finger — so by the time the drop is committed, "the board as it was" is no
   * longer readable from the ref. The caller that has been mutating it has to
   * bring its own copy of the previous state, or undo would step back to the
   * moment of release and appear to do nothing.
   */
  const commit = useCallback(
    (next: readonly Placement[], record: boolean, before?: readonly Placement[]) => {
      const current = figureRef.current;
      if (!current) return;
      if (record) {
        historyRef.current.push(before ?? placementsRef.current);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      }
      placementsRef.current = next;
      setPlacements(next);
      setHint(null);

      if (checkFigure(current, next).complete) {
        clockRef.current.pause();
        setElapsed(clockRef.current.elapsedMs);
        setSolved(true);
        persist(true);
        return;
      }
      persist(false);
    },
    [persist],
  );

  /**
   * Everything a corner could snap to: the author's own vertices, which cover
   * the silhouette's outline *and* its internal seams, plus the vertices of the
   * pieces already on the board.
   *
   * The seams are in on purpose. A piece's corner belongs where two pieces meet
   * as much as where the outline turns, and a child aiming at the middle of the
   * shape wants the click just as much as a child aiming at the edge.
   */
  const cornersFor = useCallback((id: PieceId): Point[][] => {
    const current = figureRef.current;
    const where = layoutRef.current;
    if (!current || !where) return [];
    const others = placementsRef.current
      .filter((piece) => piece.id !== id && !inTray(piece, where))
      .map(verticesOf);
    return [current.pieces.flatMap(verticesOf), ...others];
  }, []);

  const select = useCallback((id: PieceId | null) => {
    selectedRef.current = id;
    setSelected(id);
  }, []);

  const beginDrag = useCallback(
    (id: PieceId, point: Point) => {
      if (paused || solved) return;
      const current = placementsRef.current.find((where) => where.id === id);
      if (!current) return;
      selectedRef.current = id;
      setSelected(id);
      // A copy of the seven placements, taken before the piece moves, because
      // `dragTo` is about to overwrite the ref on every pointer move. Seven
      // small objects per gesture is nothing; recovering them afterwards is
      // impossible.
      dragOriginRef.current = placementsRef.current.map((piece) => ({ ...piece }));
      dragRef.current = {
        id,
        offsetX: current.cx - point.x,
        offsetY: current.cy - point.y,
        origin: current,
      };
      setDragging(id);
    },
    [paused, solved],
  );

  const dragTo = useCallback((point: Point) => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = withPiece(
      placementsRef.current,
      movedTo(drag.origin, point.x + drag.offsetX, point.y + drag.offsetY),
    );
    placementsRef.current = next;
    setPlacements(next);
  }, []);

  const endDrag = useCallback(
    (pxPerUnit: number) => {
      const drag = dragRef.current;
      const before = dragOriginRef.current;
      dragRef.current = null;
      dragOriginRef.current = null;
      setDragging(null);
      if (!drag) return;
      const where = layoutRef.current;
      const current = placementsRef.current.find((piece) => piece.id === drag.id);
      if (!where || !current) return;

      // A piece parked in the tray is not being solved, so there is nothing to
      // click onto — and snapping it to the silhouette would drag it out of the
      // tray the instant a player let go of it in the wrong place.
      const snapped = inTray(current, where)
        ? current
        : snapPlacement(current, cornersFor(drag.id), unitsFor(pxPerUnit));

      // A tap that moved nothing, or moved so little the snap undid it, is not
      // an undo step. Otherwise the history fills up with presses that did
      // nothing at all. The comparison is against the board as it was before
      // the lift, which is also the state undo has to return to.
      const next = withPiece(placementsRef.current, snapped);
      if (before !== null && !differs(before, next)) return;
      nudgeRef.current = null;
      commit(next, true, before ?? undefined);
    },
    [commit, cornersFor],
  );

  /**
   * One arrow press.
   *
   * `snapOnNudge` is what makes the keyboard usable: a press that closes the gap
   * to a corner clicks the piece into place, and a press that opens it is left
   * alone. A tray piece never snaps, because a tray piece is not being placed —
   * snapping one would teleport it onto the shape from a press that looked like
   * it was nudging it around the tray.
   */
  const nudge = useCallback(
    (id: PieceId, dx: number, dy: number, pxPerUnit: number) => {
      if (paused || solved) return;
      const where = layoutRef.current;
      const current = placementsRef.current.find((piece) => piece.id === id);
      if (!where || !current) return;

      const moved = translate(current, dx, dy);
      const next = inTray(moved, where)
        ? moved
        : snapOnNudge(current, moved, cornersFor(id), unitsFor(pxPerUnit));

      // Nudges in a run are one step, so undo walks back over a journey rather
      // than over each of the forty presses it took.
      const run = nudgeRef.current;
      const record = !(run && run.id === id && Date.now() - run.at < NUDGE_WINDOW_MS);
      nudgeRef.current = { id, at: Date.now() };
      commit(withPiece(placementsRef.current, next), record);
    },
    [commit, cornersFor, paused, solved],
  );

  const transformSelected = useCallback(
    (change: (where: Placement) => Placement) => {
      const id = selectedRef.current;
      if (!id || paused || solved) return;
      const current = placementsRef.current.find((where) => where.id === id);
      if (!current) return;
      nudgeRef.current = null;
      commit(withPiece(placementsRef.current, change(current)), true);
    },
    [commit, paused, solved],
  );

  const rotate = useCallback(() => transformSelected((where) => turned(where, 1)), [transformSelected]);
  const flip = useCallback(() => transformSelected(mirrored), [transformSelected]);

  const undo = useCallback(() => {
    if (paused || solved) return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    nudgeRef.current = null;
    placementsRef.current = previous;
    setPlacements(previous);
    setHint(null);
    persist(false);
  }, [paused, persist, solved]);

  const askHint = useCallback(() => {
    const current = figureRef.current;
    if (!current || paused || solved) return;
    // A hint here has nothing to apply, so asking *is* using it. Counting the
    // ask is the honest number; counting nothing would make the win panel's
    // "no hints" line untrue.
    hintsUsedRef.current += 1;
    setHintsUsed(hintsUsedRef.current);
    setHint(nextHint(current, placementsRef.current));
    persist(false);
  }, [paused, persist, solved]);

  const dismissHint = useCallback(() => setHint(null), []);

  const pause = useCallback(() => {
    clockRef.current.pause();
    setElapsed(clockRef.current.elapsedMs);
    setPaused(true);
    persist(false);
  }, [persist]);

  const resume = useCallback(() => {
    if (solved) return;
    clockRef.current.start();
    setPaused(false);
  }, [solved]);

  const begin = useCallback(
    (next: Figure, daily: string | null, resumeMs: number, saved: readonly Placement[] | null) => {
      const where = layoutFor(next);
      const start = inOrder(saved ?? PIECE_IDS.map((id) => where.home[id]));
      figureRef.current = next;
      layoutRef.current = where;
      placementsRef.current = start;
      historyRef.current = [];
      hintsUsedRef.current = 0;
      dailyRef.current = daily;
      dragRef.current = null;
      dragOriginRef.current = null;
      nudgeRef.current = null;
      selectedRef.current = null;

      setFigure(next);
      setLayout(where);
      setPlacements(start);
      setSelected(null);
      setDragging(null);
      setHint(null);
      setPaused(false);
      setSolved(false);
      setHintsUsed(0);
      setIsDaily(Boolean(daily));
      setDailyDate(daily);
      clockRef.current.reset(resumeMs);
      clockRef.current.start();
      setElapsed(resumeMs);
      setStatus('ready');
    },
    [],
  );

  // Resume an unfinished figure, or deal the one every player starts with.
  useEffect(() => {
    if (figureRef.current) return;
    const saved = readProgress();
    if (saved && !saved.finished) {
      const restored = figureById(saved.figureId);
      if (restored) {
        begin(restored, saved.daily, saved.elapsedMs, saved.placements);
        return;
      }
    }
    const first = figureById(TUTORIAL_FIGURE_ID);
    if (first) begin(first, null, 0, null);
  }, [begin]);

  // The interval exists only to repaint the clock.
  useEffect(() => {
    if (status !== 'ready' || paused || solved) return;
    const id = window.setInterval(() => setElapsed(clockRef.current.elapsedMs), 500);
    return () => window.clearInterval(id);
  }, [paused, solved, status]);

  // Walking away from the tab stops the clock. A figure can take a while, and
  // leaving it running would put a number on the win panel that the player did
  // not spend.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !solved && status === 'ready') {
        clockRef.current.pause();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [solved, status]);

  const nextFigure = useCallback(() => {
    clearProgress();
    begin(figureAfter(figureRef.current?.id ?? null), null, 0, null);
  }, [begin]);

  const chooseFigure = useCallback(
    (id: string) => {
      const chosen = figureById(id);
      if (!chosen || chosen.id === figureRef.current?.id) return;
      clearProgress();
      begin(chosen, null, 0, null);
    },
    [begin],
  );

  const playDaily = useCallback(() => {
    // One reading of the date, so the figure and the record of which day it
    // belonged to cannot land on opposite sides of midnight.
    const today = localDateKey();
    clearProgress();
    begin(dailyFigure(today), today, 0, null);
  }, [begin]);

  const placed = layout
    ? placements.reduce((total, where) => (inTray(where, layout) ? total : total + 1), 0)
    : 0;

  return {
    status,
    figure,
    layout,
    placements,
    selected,
    dragging,
    hint,
    paused,
    solved,
    isDaily,
    dailyDate,
    clock: formatClock(elapsed),
    hintsUsed,
    placed,
    canUndo: !solved && !paused && historyRef.current.length > 0,
    select,
    beginDrag,
    dragTo,
    endDrag,
    nudge,
    rotate,
    flip,
    undo,
    askHint,
    dismissHint,
    pause,
    resume,
    nextFigure,
    chooseFigure,
    playDaily,
  };
}
