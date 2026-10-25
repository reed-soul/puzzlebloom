/**
 * Public surface of the Tangram engine.
 *
 * The game imports from here and nowhere else, so the names below are the
 * contract: a piece, a placement, a figure, a coverage verdict, a hint, a save,
 * a layout. The modules behind it are small and single-purpose, and this barrel
 * is where the story of how they fit together is told once.
 */

export {
  type BareRegion,
  bareSpot,
  type Check,
  type Coverage,
  checkFigure,
  type Grid,
  gridFor,
  MISMATCH_TOLERANCE,
  measure,
  overlapPair,
  RASTER_STEP,
  sampleAt,
  silhouetteMask,
  spillByPiece,
} from './cover';
export {
  createRandom,
  dailyFigure,
  localDateKey,
  seedFrom,
} from './daily';
export {
  defineFigure,
  FIGURES,
  type Figure,
  type FigureInput,
  figureAfter,
  figureBounds,
  figureById,
  figureIndex,
  fromPolygon,
  TUTORIAL_FIGURE_ID,
} from './figures';
export {
  type Bounds,
  boundsOf,
  boundsOfPlacements,
  distanceSquared,
  insidePolygon,
  mirrored,
  movedTo,
  normaliseRotation,
  onOutline,
  type Placement,
  pathOf,
  placement,
  pointsToString,
  polygonPoints,
  TURN,
  transform,
  translate,
  turned,
  verticesOf,
} from './geometry';
export { type Hint, type HintKind, nextHint } from './hints';
export { inTray, LAYOUT_PADDING, layoutFor, type TangramLayout } from './layout';
export {
  areaOf,
  centroidOf,
  isPieceId,
  PIECE_IDS,
  PIECES,
  type PieceDef,
  type PieceId,
  type PieceShape,
  type Point,
  pieceDef,
  pieceLabel,
  pieceTitle,
  SQRT2,
  shapeLabel,
} from './pieces';
export {
  clearProgress,
  decodeProgress,
  encodeProgress,
  PROGRESS_KEY,
  readProgress,
  type SavedProgress,
  type StorageLike,
  writeProgress,
} from './progress';
export { snapOnNudge, snapPlacement } from './snap';
