import { buildSerpentinePath } from '../engine/path';
import { computeTrackMetrics } from '../engine/slots';

const MOBILE_MIN_COLUMN_WIDTH = 122;
const MOBILE_MAX_COLUMN_WIDTH = 164;
const TABLET_MIN_COLUMN_WIDTH = 220;
const TABLET_MAX_COLUMN_WIDTH = 288;
const DESKTOP_MIN_COLUMN_WIDTH = 272;
const DESKTOP_MAX_COLUMN_WIDTH = 336;
const MAX_COLUMNS = 5;
const MOBILE_GAP = 10;
const TABLET_GAP = 14;
const DESKTOP_GAP = 16;
const MOBILE_SLOT_HEIGHT = 64;
const TABLET_SLOT_HEIGHT = 78;
const DESKTOP_SLOT_HEIGHT = 84;
const MOBILE_PAD_Y = 3;
const TABLET_PAD_Y = 5;
const DESKTOP_PAD_Y = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function computeResponsivePath(width: number, height: number, slotCount: number) {
  const safeWidth = Math.max(width, MOBILE_MIN_COLUMN_WIDTH);
  const compact = safeWidth < 480;
  const tablet = safeWidth >= 480 && safeWidth < 900;
  const minColumnWidth = compact ? MOBILE_MIN_COLUMN_WIDTH : tablet ? TABLET_MIN_COLUMN_WIDTH : DESKTOP_MIN_COLUMN_WIDTH;
  const maxColumnWidth = compact ? MOBILE_MAX_COLUMN_WIDTH : tablet ? TABLET_MAX_COLUMN_WIDTH : DESKTOP_MAX_COLUMN_WIDTH;
  const gap = compact ? MOBILE_GAP : tablet ? TABLET_GAP : DESKTOP_GAP;
  const itemHeight = compact ? MOBILE_SLOT_HEIGHT : tablet ? TABLET_SLOT_HEIGHT : DESKTOP_SLOT_HEIGHT;
  const padY = compact ? MOBILE_PAD_Y : tablet ? TABLET_PAD_Y : DESKTOP_PAD_Y;
  const minRows = compact ? 5 : 3;
  const safeHeight = Math.max(height, itemHeight * minRows);
  const columns = clamp(Math.floor((safeWidth + gap) / (minColumnWidth + gap)), 1, MAX_COLUMNS);
  const idealWidth = Math.floor((safeWidth - gap * (columns - 1)) / columns);
  const itemWidth = clamp(idealWidth, minColumnWidth, maxColumnWidth);
  const boardWidth = itemWidth * columns + gap * (columns - 1);
  const padX = Math.max(0, Math.floor((safeWidth - boardWidth) / 2));
  const metrics = computeTrackMetrics({
    width: safeWidth,
    height: safeHeight,
    itemWidth,
    itemHeight,
    gapX: gap,
    gapY: gap,
    padX,
    padY
  });

  return {
    metrics,
    path: buildSerpentinePath(metrics, slotCount),
    itemWidth,
    itemHeight
  };
}

