export interface SlotLayoutConfig {
  width: number;
  height: number;
  itemWidth: number;
  itemHeight: number;
  gapX: number;
  gapY: number;
  padX: number;
  padY: number;
}

export interface TrackMetrics extends SlotLayoutConfig {
  turnDepth: number;
  colPitch: number;
  rowPitch: number;
  rowsPerCol: number;
  columnsVisible: number;
  visibleSlotCount: number;
}

export interface SlotRect {
  slotIndex: number;
  col: number;
  rowInCol: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

export function computeTrackMetrics(config: SlotLayoutConfig): TrackMetrics {
  const colPitch = config.itemWidth + config.gapX;
  const rowPitch = config.itemHeight + config.gapY;
  const innerWidth = Math.max(1, config.width - config.padX * 2);
  const innerHeight = Math.max(1, config.height - config.padY * 2);
  const columnsVisible = Math.max(1, Math.floor((innerWidth + config.gapX) / colPitch));
  // A turning card needs a clear lane above and below the resting grid.
  // Short viewports degrade to a single horizontal row; narrow ones to a list.
  const reserve = columnsVisible > 1 ? rowPitch : 0;
  const rowsPerCol = Math.max(1, Math.floor((innerHeight - reserve * 2 + config.gapY) / rowPitch));
  const turnDepth = columnsVisible > 1 && rowsPerCol > 1 ? reserve : 0;
  const gridHeight = rowsPerCol * rowPitch - config.gapY;

  return {
    ...config,
    padY: Math.max(config.padY, (config.height - gridHeight) / 2),
    turnDepth,
    colPitch,
    rowPitch,
    rowsPerCol,
    columnsVisible,
    visibleSlotCount: rowsPerCol * columnsVisible
  };
}

export function getSlotRect(slotIndex: number, metrics: TrackMetrics): SlotRect {
  const col = metrics.columnsVisible === 1 ? 0 : Math.floor(slotIndex / metrics.rowsPerCol);
  const rowInCol = metrics.columnsVisible === 1 ? slotIndex : slotIndex % metrics.rowsPerCol;
  const row = col % 2 === 0 ? rowInCol : metrics.rowsPerCol - 1 - rowInCol;
  const x = metrics.padX + col * metrics.colPitch;
  const y = metrics.padY + row * metrics.rowPitch;

  return {
    slotIndex,
    col,
    rowInCol,
    row,
    x,
    y,
    width: metrics.itemWidth,
    height: metrics.itemHeight,
    cx: x + metrics.itemWidth / 2,
    cy: y + metrics.itemHeight / 2
  };
}

export function buildSlots(metrics: TrackMetrics, slotCount: number) {
  return Array.from({ length: slotCount }, (_, index) => getSlotRect(index, metrics));
}
