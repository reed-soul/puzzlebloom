/**
 * The board: one `<svg>`, one coordinate system, no measurement in JavaScript.
 *
 * The silhouette is drawn as the author's seven polygons rather than as one
 * merged outline, and each of them carries the same 0.02-wide stroke as its
 * fill. That is not decoration. Where two of those polygons meet, the boundary
 * is drawn twice by two sub-pixel-adjacent shapes, and without the stroke the
 * renderer's antialiasing leaves a hairline of background showing through the
 * seam — a silhouette that looks cracked, in a game whose whole subject is
 * whether pieces meet exactly.
 *
 * The player's pieces are deliberately all one colour until the figure is
 * finished. Real tangram pieces are one colour; colouring them differently
 * would let a player match a piece to a hole by hue instead of by shape, which
 * is the one thing this puzzle is not about. The seams between them are drawn
 * in the surface colour, so seven pieces read as seven pieces, and the moment
 * the last one lands they take seven colours at once.
 *
 * Everything is a pointer event on the `<svg>`, with pointer capture, rather
 * than a mouse handler per piece: a drag that leaves the board — over the
 * toolbar, off the window — still has to move the piece.
 */

import {
  type Bounds,
  type Figure,
  inTray,
  type PieceId,
  type Placement,
  type Point,
  pieceTitle,
  polygonPoints,
  type TangramLayout,
} from '@puzzlebloom/tangram-engine';
import { useMemo, useRef } from 'react';

interface Props {
  figure: Figure;
  layout: TangramLayout;
  placements: readonly Placement[];
  selected: PieceId | null;
  dragging: PieceId | null;
  solved: boolean;
  onSelect: (id: PieceId) => void;
  onBeginDrag: (id: PieceId, point: Point) => void;
  onDragTo: (point: Point) => void;
  onEndDrag: (pxPerUnit: number) => void;
  onNudge: (id: PieceId, dx: number, dy: number, pxPerUnit: number) => void;
}

/** A plain nudge, and a coarse one for crossing open space. */
const STEP = 0.1;
const COARSE_STEP = 0.5;

const ARROWS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/**
 * Two pieces share each of these shapes, so the accessible name has to say
 * which. "Large triangle" twice is a list a screen reader cannot navigate.
 */
const ORDINAL: Partial<Record<PieceId, string>> = {
  'large-1': 'one',
  'large-2': 'two',
  'small-1': 'one',
  'small-2': 'two',
};

function nameOf(id: PieceId, resting: boolean): string {
  const ordinal = ORDINAL[id];
  const name = ordinal ? `${pieceTitle(id)} ${ordinal}` : pieceTitle(id);
  return `${name}, ${resting ? 'in the tray' : 'on the board'}`;
}

export function Board({
  figure,
  layout,
  placements,
  selected,
  dragging,
  solved,
  onSelect,
  onBeginDrag,
  onDragTo,
  onEndDrag,
  onNudge,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerRef = useRef<number | null>(null);

  /**
   * CSS pixels per figure unit, straight from the matrix the browser already
   * computed. Snapping is a promise about what looks aligned on screen, so the
   * tolerance has to be read in the units the screen is measured in.
   */
  const pxPerUnit = (): number => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return 100;
    const scale = Math.hypot(matrix.a, matrix.b);
    return scale > 0 ? scale : 100;
  };

  /**
   * Where the pointer is, in figure units.
   *
   * Any event with a client position will do — the HTML and SVG pointer event
   * types are unrelated to each other even though the two numbers are the same
   * two numbers, and this only wants the numbers.
   */
  const toFigure = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    return { x: local.x, y: local.y };
  };

  // The dragged piece is drawn last so it is never hidden under its neighbours.
  // Only a pointer drag reorders anything: a keyboard player's focus would be
  // dropped by a node moving in the DOM, and they are not the ones who need it.
  const ordered = useMemo(() => {
    if (!dragging) return placements;
    return [...placements].sort((a, b) => (a.id === dragging ? 1 : b.id === dragging ? -1 : 0));
  }, [dragging, placements]);

  return (
    // No `role` here on purpose. An `<svg>` is already a graphics document, its
    // label names it, and `role="group"` would only add a landmark-without-a-
    // name to the tree in exchange for nothing.
    <svg
      ref={svgRef}
      className={`pb-tangram-board${solved ? ' is-solved' : ''}`}
      viewBox={layout.viewBox}
      aria-label={`${figure.name}: the shape to fill, and the seven pieces`}
      onPointerMove={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        const point = toFigure(event);
        if (point) onDragTo(point);
      }}
      onPointerUp={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        svgRef.current?.releasePointerCapture(event.pointerId);
        onEndDrag(pxPerUnit());
      }}
      onPointerCancel={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        pointerRef.current = null;
        onEndDrag(pxPerUnit());
      }}
    >
      {/* The tray and the silhouette are one picture of what the board is for,
          and neither is worth announcing: the pieces below name themselves and
          say which of the two they are on. */}
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: decoration; nothing in here is focusable, and the interactive pieces are in the sibling group */}
      <g className="pb-tangram__decoration" aria-hidden="true">
        <rect
          className="pb-tangram__tray"
          x={layout.tray.minX}
          y={layout.tray.minY}
          width={layout.tray.width}
          height={layout.tray.height}
          rx={0.3}
        />
        <g className="pb-tangram__silhouette">
          {figure.pieces.map((where) => (
            <polygon key={where.id} points={polygonPoints(where)} />
          ))}
        </g>
      </g>

      <g className="pb-tangram__pieces">
        {ordered.map((where) => {
          const resting = inTray(where, layout);
          const classes = ['pb-tangram__piece'];
          if (resting) classes.push('is-tray');
          if (where.id === selected) classes.push('is-selected');
          if (where.id === dragging) classes.push('is-dragging');
          return (
            // biome-ignore lint/a11y/useSemanticElements: a piece is a polygon in a drawing and no HTML element can be one; buttons laid over the shape would mean two coordinate systems to keep in step
            <polygon
              key={where.id}
              points={polygonPoints(where)}
              className={classes.join(' ')}
              data-piece={where.id}
              tabIndex={0}
              role="button"
              aria-label={nameOf(where.id, resting)}
              onFocus={() => onSelect(where.id)}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                const point = toFigure(event);
                if (!point) return;
                // Otherwise the browser starts a text selection drag and the
                // pointer leaves the board on the first move.
                event.preventDefault();
                pointerRef.current = event.pointerId;
                svgRef.current?.setPointerCapture(event.pointerId);
                onBeginDrag(where.id, point);
              }}
              onKeyDown={(event) => {
                const direction = ARROWS[event.key];
                if (!direction) return;
                event.preventDefault();
                const step = event.shiftKey ? COARSE_STEP : STEP;
                onNudge(where.id, direction[0] * step, direction[1] * step, pxPerUnit());
              }}
            />
          );
        })}
      </g>
    </svg>
  );
}

/**
 * The finished figure, small, at the top of the win panel.
 *
 * Drawn from the author's placements rather than the player's: this is the
 * picture being shown off, and a player who solved the shape by a different
 * route should still be shown the shape. The colours come from the same
 * `data-piece` rules the board uses, so there is one definition of "the seven
 * colours" and no chance of the panel and the board disagreeing.
 */
export function FigureReveal({ figure, bounds }: { figure: Figure; bounds: Bounds }) {
  const pad = 0.25;
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.width + 2 * pad} ${
    bounds.height + 2 * pad
  }`;
  return (
    <svg className="pb-tangram-reveal" viewBox={viewBox} role="img" aria-label={`${figure.name}, solved`}>
      {figure.pieces.map((where) => (
        <polygon key={where.id} points={polygonPoints(where)} data-piece={where.id} />
      ))}
    </svg>
  );
}
