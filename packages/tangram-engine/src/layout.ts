/**
 * Where the pieces are drawn, and where they go when they are not in play.
 *
 * One coordinate system for the whole board: figure units, all the way out to
 * the `viewBox`. The silhouette sits where the author placed it (a figure's
 * coordinates are never touched here) and the tray is a band underneath, so a
 * placement's meaning does not depend on the layout, and a save written on a
 * phone opens on a tablet unchanged.
 *
 * Whether a piece is in the tray is answered by geometry — is its centroid
 * inside the band — and not by a boolean. A flag would mean the game had to
 * remember to clear it, and the one time it was not cleared, a piece would sit
 * in the middle of the shape and count as "unplaced". Dragging a piece back to
 * the tray is a legal move, and this is what makes it a move rather than a
 * special case.
 */

import { type Figure, figureBounds } from './figures';
import { type Bounds, boundsOf, type Placement, transform } from './geometry';
import { PIECE_IDS, type PieceId } from './pieces';

/** Space between the silhouette and the edge of the board. */
export const LAYOUT_PADDING = 0.35;

const TRAY_GAP = 0.3;
const SILHOUETTE_GAP = 0.55;
/** Narrow boards would put the tray pieces under each other, so the band has a floor. */
const MIN_BAND = 5.4;
const MAX_ROWS = 3;

export interface TangramLayout {
  readonly viewBox: string;
  readonly bandWidth: number;
  readonly height: number;
  readonly silhouette: Bounds;
  /** The band the pieces rest in, in figure units. */
  readonly tray: Bounds;
  /** Where each piece sits when it is not on the board. */
  readonly home: Readonly<Record<PieceId, Placement>>;
}

interface Footprint {
  readonly id: PieceId;
  readonly width: number;
  readonly height: number;
  /** Bounding box minimum relative to the centroid, at rotation 0. */
  readonly offsetX: number;
  readonly offsetY: number;
}

function footprintOf(id: PieceId): Footprint {
  const polygon = transform({ id, cx: 0, cy: 0, rotation: 0, flipped: false });
  const box = boundsOf([polygon]);
  return { id, width: box.width, height: box.height, offsetX: box.minX, offsetY: box.minY };
}

function rectangle(minX: number, minY: number, maxX: number, maxY: number): Bounds {
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centreX: (minX + maxX) / 2,
    centreY: (minY + maxY) / 2,
  };
}

/** Greedy rows, biggest first, which is also the order the tray fills. */
function packRows(innerWidth: number): Footprint[][] {
  const rows: Footprint[][] = [];
  let row: Footprint[] = [];
  let used = 0;
  for (const id of PIECE_IDS) {
    const footprint = footprintOf(id);
    const needed = row.length === 0 ? footprint.width : footprint.width + TRAY_GAP;
    if (row.length > 0 && used + needed > innerWidth + 1e-9) {
      rows.push(row);
      row = [];
      used = 0;
    }
    used += row.length === 0 ? footprint.width : footprint.width + TRAY_GAP;
    row.push(footprint);
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

export function layoutFor(figure: Figure): TangramLayout {
  const silhouette = figureBounds(figure);
  let bandWidth = Math.max(silhouette.width + 2 * LAYOUT_PADDING, MIN_BAND);
  let rows = packRows(bandWidth - 2 * LAYOUT_PADDING);
  // Three rows is a tray; four would draw every piece too small to pick up. The
  // band grows instead, which costs silhouette size and buys a reachable piece.
  while (rows.length > MAX_ROWS && bandWidth < 9) {
    bandWidth += 0.4;
    rows = packRows(bandWidth - 2 * LAYOUT_PADDING);
  }

  const minX = silhouette.centreX - bandWidth / 2;
  const innerLeft = minX + LAYOUT_PADDING;
  const innerWidth = bandWidth - 2 * LAYOUT_PADDING;
  const minY = silhouette.minY - LAYOUT_PADDING;
  const trayTop = silhouette.maxY + SILHOUETTE_GAP;

  const home: Partial<Record<PieceId, Placement>> = {};
  let cursorY = trayTop;
  for (const row of rows) {
    const rowWidth = row.reduce((total, piece) => total + piece.width, 0) + TRAY_GAP * (row.length - 1);
    const rowHeight = row.reduce((tallest, piece) => Math.max(tallest, piece.height), 0);
    let cursorX = innerLeft + Math.max(0, (innerWidth - rowWidth) / 2);
    for (const piece of row) {
      // Centre each piece vertically in its row, so a row with a flat
      // parallelogram next to a triangle does not look like a mistake.
      const y = cursorY + (rowHeight - piece.height) / 2;
      home[piece.id] = {
        id: piece.id,
        cx: cursorX - piece.offsetX,
        cy: y - piece.offsetY,
        rotation: 0,
        flipped: false,
      };
      cursorX += piece.width + TRAY_GAP;
    }
    cursorY += rowHeight + TRAY_GAP;
  }

  const trayBottom = cursorY - TRAY_GAP;
  const tray = rectangle(innerLeft, trayTop, innerLeft + innerWidth, trayBottom);
  const height = trayBottom + LAYOUT_PADDING - minY;

  return {
    viewBox: `${round(minX)} ${round(minY)} ${round(bandWidth)} ${round(height)}`,
    bandWidth,
    height,
    silhouette,
    tray,
    home: home as Record<PieceId, Placement>,
  };
}

/**
 * Is this piece resting in the tray?
 *
 * The centroid, not the bounding box: a large triangle leans into the tray
 * while its right angle is still over the line, and a bounding-box test would
 * claim it is on the board while it is visibly not.
 */
export function inTray(where: Placement, layout: TangramLayout): boolean {
  return where.cy >= layout.tray.minY - 0.15;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
