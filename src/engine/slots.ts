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
  const rowsPerCol = Math.max(1, Math.floor((innerHeight + config.gapY) / rowPitch));
  const columnsVisible = Math.max(1, Math.floor((innerWidth + config.gapX) / colPitch));

  return {
    ...config,
    colPitch,
    rowPitch,
    rowsPerCol,
    columnsVisible,
    visibleSlotCount: rowsPerCol * columnsVisible
  };
}

export function getSlotRect(slotIndex: number, metrics: TrackMetrics): SlotRect {
  const col = Math.floor(slotIndex / metrics.rowsPerCol);
  const rowInCol = slotIndex % metrics.rowsPerCol;
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

