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

function intersects(a: Placement, b: Placement) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

function intersectsRecent(placement: Placement, placements: Placement[], count: number) {
  for (let index = count - 1, seen = 0; index >= 0 && seen < 4; index -= 1, seen += 1) {
    const blocker = placements[index];
    if (blocker && intersects(blocker, placement)) return true;
  }
  return false;
}

function writePlacement(target: Placement, path: SerpentinePath, itemIndex: number, distance: number) {
  const sample = sampleAt(path, distance);
  const left = sample.x - path.metrics.itemWidth / 2;
  const top = sample.y - path.metrics.itemHeight / 2;
  Object.assign(target, {
    itemIndex,
    desiredDistance: distance,
    actualDistance: distance,
    x: sample.x,
    y: sample.y,
    tangentX: sample.tangentX,
    tangentY: sample.tangentY,
    left,
    top,
    right: left + path.metrics.itemWidth,
    bottom: top + path.metrics.itemHeight
  });
  return target;
}

function createPlacement(): Placement {
  return { itemIndex: 0, desiredDistance: 0, actualDistance: 0, x: 0, y: 0, tangentX: 0, tangentY: 0, left: 0, top: 0, right: 0, bottom: 0 };
}

function resolveCollisionFreePlacement(path: SerpentinePath, itemIndex: number, desiredDistance: number, placements: Placement[], placementCount: number, scratch: Placement) {
  let placement = writePlacement(scratch, path, itemIndex, desiredDistance);
  if (!intersectsRecent(placement, placements, placementCount)) return placement;

  const spacingStep = Math.max(path.metrics.rowPitch, path.metrics.itemHeight / 2);
  let low = desiredDistance;
  let high = desiredDistance;
  let bestDistance = desiredDistance;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    high += spacingStep;
    placement = writePlacement(scratch, path, itemIndex, high);
    if (!intersectsRecent(placement, placements, placementCount)) {
      bestDistance = high;
      break;
    }
  }

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const mid = (low + high) / 2;
    const candidate = writePlacement(scratch, path, itemIndex, mid);
    if (intersectsRecent(candidate, placements, placementCount)) low = mid;
    else {
      high = mid;
      bestDistance = mid;
    }
  }

  placement = writePlacement(scratch, path, itemIndex, bestDistance);
  placement.actualDistance = bestDistance;
  placement.desiredDistance = desiredDistance;
  return placement;
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
  if (itemCount === 0 || path.slotDistances.length === 0) return { startIndex: 0, endIndex: -1 };

  const firstVisible = lowerBound(path.slotDistances, Math.max(0, offsetPx));
  const startIndex = Math.max(0, Math.min(itemCount - 1, firstVisible) - overscan);
  const visibleDistance = path.slotDistances[Math.max(0, path.metrics.visibleSlotCount - 1)] ?? path.totalLength;
  const lastVisible = lowerBound(path.slotDistances, offsetPx + visibleDistance + path.metrics.rowPitch * 1.5);
  const endIndex = Math.min(itemCount - 1, Math.max(startIndex, lastVisible + overscan));
  return { startIndex, endIndex };
}

export function fillPlacementsInRange(path: SerpentinePath, itemCount: number, offsetPx: number, startIndex: number, endIndex: number, placements: Placement[]) {
  if (itemCount === 0) {
    placements.length = 0;
    return placements;
  }

  const visibleDistance = path.slotDistances[Math.max(0, path.metrics.visibleSlotCount - 1)] ?? path.totalLength;
  const minDistance = -path.metrics.rowPitch * 1.5;
  const maxDistance = visibleDistance + path.metrics.rowPitch * 1.5;
  let placementCount = 0;

  for (let itemIndex = startIndex; itemIndex <= endIndex; itemIndex += 1) {
    const desiredDistance = (path.slotDistances[itemIndex] ?? path.slotDistances[path.slotDistances.length - 1]) - offsetPx;
    if (desiredDistance < minDistance || desiredDistance > maxDistance) continue;

    const scratch = placements[placementCount] ?? createPlacement();
    placements[placementCount] = resolveCollisionFreePlacement(path, itemIndex, desiredDistance, placements, placementCount, scratch);
    placementCount += 1;
  }

  placements.length = placementCount;
  return placements;
}

export function resolvePlacementsInRange(path: SerpentinePath, itemCount: number, offsetPx: number, startIndex: number, endIndex: number) {
  const placements: Placement[] = [];
  fillPlacementsInRange(path, itemCount, offsetPx, startIndex, endIndex, placements);
  return placements;
}

export function resolvePlacements(path: SerpentinePath, itemCount: number, offsetPx: number, overscan = 1) {
  const { startIndex, endIndex } = getPlacementRange(path, itemCount, offsetPx, overscan);
  return resolvePlacementsInRange(path, itemCount, offsetPx, startIndex, endIndex);
}
