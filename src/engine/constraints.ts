import { sampleAt, type SerpentinePath } from './path';

export interface Placement {
  itemIndex: number;
  desiredDistance: number;
  actualDistance: number;
  x: number;
  y: number;
  tangentX: number;
  tangentY: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PlacementRange {
  startIndex: number;
  endIndex: number;
}

function writePlacement(target: Placement, path: SerpentinePath, itemIndex: number, distance: number) {
  const sample = sampleAt(path, distance);
  const left = sample.x - path.metrics.itemWidth / 2;
  const top = sample.y - path.metrics.itemHeight / 2;

  target.itemIndex = itemIndex;
  target.desiredDistance = distance;
  target.actualDistance = distance;
  target.x = sample.x;
  target.y = sample.y;
  target.tangentX = sample.tangentX;
  target.tangentY = sample.tangentY;
  target.left = left;
  target.top = top;
  target.right = left + path.metrics.itemWidth;
  target.bottom = top + path.metrics.itemHeight;
  return target;
}

function createPlacement(): Placement {
  return {
    itemIndex: 0,
    desiredDistance: 0,
    actualDistance: 0,
    x: 0,
    y: 0,
    tangentX: 0,
    tangentY: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0
  };
}

function lowerBound(values: number[], value: number) {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid] < value) low = mid + 1;
    else high = mid;
  }

  return low;
}

export function getPlacementRange(path: SerpentinePath, itemCount: number, offsetPx: number, overscan = 1): PlacementRange {
  if (itemCount === 0 || path.slotDistances.length === 0) {
    return { startIndex: 0, endIndex: -1 };
  }

  const pitch = Math.max(1, path.metrics.rowPitch);
  const visibleDistance = path.slotDistances[Math.max(0, path.metrics.visibleSlotCount - 1)] ?? path.totalLength;
  const firstVisible = lowerBound(path.slotDistances, Math.max(0, offsetPx - pitch * overscan));
  const lastVisible = lowerBound(path.slotDistances, offsetPx + visibleDistance + pitch * (overscan + 1));

  return {
    startIndex: Math.max(0, Math.min(itemCount - 1, firstVisible)),
    endIndex: Math.min(itemCount - 1, Math.max(firstVisible, lastVisible))
  };
}

export function fillPlacementsInRange(
  path: SerpentinePath,
  itemCount: number,
  offsetPx: number,
  startIndex: number,
  endIndex: number,
  placements: Placement[]
) {
  if (itemCount === 0) {
    placements.length = 0;
    return placements;
  }

  const visibleDistance = path.slotDistances[Math.max(0, path.metrics.visibleSlotCount - 1)] ?? path.totalLength;
  const margin = path.metrics.rowPitch * 1.5;
  const minDistance = -margin;
  const maxDistance = visibleDistance + margin;
  let placementCount = 0;

  for (let itemIndex = startIndex; itemIndex <= endIndex; itemIndex += 1) {
    const slotDistance = path.slotDistances[itemIndex];
    if (slotDistance === undefined) continue;

    const desiredDistance = slotDistance - offsetPx;
    if (desiredDistance < minDistance || desiredDistance > maxDistance) continue;

    const target = placements[placementCount] ?? createPlacement();
    writePlacement(target, path, itemIndex, desiredDistance);
    placements[placementCount] = target;
    placementCount += 1;
  }

  placements.length = placementCount;
  return placements;
}

export function resolvePlacementsInRange(
  path: SerpentinePath,
  itemCount: number,
  offsetPx: number,
  startIndex: number,
  endIndex: number
) {
  const placements: Placement[] = [];
  fillPlacementsInRange(path, itemCount, offsetPx, startIndex, endIndex, placements);
  return placements;
}

export function resolvePlacements(path: SerpentinePath, itemCount: number, offsetPx: number, overscan = 1) {
  const { startIndex, endIndex } = getPlacementRange(path, itemCount, offsetPx, overscan);
  return resolvePlacementsInRange(path, itemCount, offsetPx, startIndex, endIndex);
}
