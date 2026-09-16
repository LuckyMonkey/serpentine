import { computeTrackMetrics } from './engine/slots';
import { buildSerpentinePath } from './engine/path';

export function computeResponsiveLayout(width: number, height: number, itemCount: number) {
  width = Math.max(1, width);
  height = Math.max(1, height);
  const compact = width < 600;
  const gapX = compact ? 14 : 18;
  const gapY = compact ? 12 : 16;
  const edge = Math.min(width / 8, compact ? 16 : Math.min(48, Math.max(24, Math.round(width * 0.035))));
  const maximum = compact ? 300 : 340;
  const columns = Math.max(1, Math.min(5, Math.floor((width - edge * 2 + gapX) / (maximum + gapX))));
  const itemWidth = Math.min(maximum, (width - edge * 2 - gapX * (columns - 1)) / columns);
  const padX = (width - itemWidth * columns - gapX * (columns - 1)) / 2;
  const padY = Math.min(height / 8, compact ? 16 : 24);
  const itemHeight = Math.max(1, Math.min(compact ? 64 : 72, height - padY * 2));
  const metrics = computeTrackMetrics({ width, height, itemWidth, itemHeight, gapX, gapY, padX, padY });
  const path = buildSerpentinePath(metrics, Math.max(itemCount, metrics.visibleSlotCount + 1));
  return { metrics, path, maxOffsetSlots: Math.max(0, itemCount - metrics.visibleSlotCount) };
}
