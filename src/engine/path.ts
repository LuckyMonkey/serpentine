import { buildSlots, type SlotRect, type TrackMetrics } from './slots';

export interface PathPoint {
  x: number;
  y: number;
  slotIndex: number;
}

export interface PathSegment {
  index: number;
  from: PathPoint;
  to: PathPoint;
  length: number;
  start: number;
  end: number;
  tangentX: number;
  tangentY: number;
  axis: 'horizontal' | 'vertical';
}

export interface SerpentinePath {
  metrics: TrackMetrics;
  slots: SlotRect[];
  points: PathPoint[];
  segments: PathSegment[];
  slotDistances: number[];
  totalLength: number;
}

export interface PathSample {
  x: number;
  y: number;
  tangentX: number;
  tangentY: number;
}

function makeSegments(points: PathPoint[]) {
  const segments: PathSegment[] = [];
  let cursor = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const axis = dx !== 0 ? 'horizontal' : 'vertical';
    const length = Math.abs(dx) + Math.abs(dy);

    if (length <= 0) {
      continue;
    }

    segments.push({
      index,
      from,
      to,
      length,
      start: cursor,
      end: cursor + length,
      tangentX: dx === 0 ? 0 : Math.sign(dx),
      tangentY: dy === 0 ? 0 : Math.sign(dy),
      axis
    });
    cursor += length;
  }

  return { segments, totalLength: cursor };
}

export function buildSerpentinePath(metrics: TrackMetrics, slotCount: number): SerpentinePath {
  const slots = buildSlots(metrics, slotCount);
  const points = slots.map((slot) => ({ x: slot.cx, y: slot.cy, slotIndex: slot.slotIndex }));
  const { segments, totalLength } = makeSegments(points);
  const slotDistances = new Array(slotCount).fill(0);

  if (slotCount > 1) {
    let cursor = 0;
    slotDistances[0] = 0;

    for (let index = 1; index < slotCount; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      cursor += Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y);
      slotDistances[index] = cursor;
    }
  }

  return {
    metrics,
    slots,
    points,
    segments,
    slotDistances,
    totalLength
  };
}

function findSegment(path: SerpentinePath, u: number) {
  if (path.segments.length === 0) {
    return null;
  }

  let low = 0;
  let high = path.segments.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const segment = path.segments[mid];

    if (u < segment.start) {
      high = mid - 1;
    } else if (u > segment.end) {
      low = mid + 1;
    } else {
      return segment;
    }
  }

  return path.segments[Math.max(0, Math.min(path.segments.length - 1, low))] ?? null;
}

export function sampleAt(path: SerpentinePath, u: number): PathSample {
  if (path.points.length === 0) {
    return { x: 0, y: 0, tangentX: 0, tangentY: 1 };
  }

  if (u <= 0) {
    const first = path.points[0];
    const segment = path.segments[0];
    return {
      x: first.x + (segment?.tangentX ?? 0) * u,
      y: first.y + (segment?.tangentY ?? 1) * u,
      tangentX: segment?.tangentX ?? 0,
      tangentY: segment?.tangentY ?? 1
    };
  }

  if (u >= path.totalLength) {
    const last = path.points[path.points.length - 1];
    const segment = path.segments[path.segments.length - 1];
    return {
      x: last.x + (segment?.tangentX ?? 0) * (u - path.totalLength),
      y: last.y + (segment?.tangentY ?? 1) * (u - path.totalLength),
      tangentX: segment?.tangentX ?? 0,
      tangentY: segment?.tangentY ?? 1
    };
  }

  const segment = findSegment(path, u);
  if (!segment) {
    return { x: path.points[0].x, y: path.points[0].y, tangentX: 0, tangentY: 1 };
  }

  const progress = segment.length === 0 ? 0 : (u - segment.start) / segment.length;
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * progress,
    y: segment.from.y + (segment.to.y - segment.from.y) * progress,
    tangentX: segment.tangentX,
    tangentY: segment.tangentY
  };
}

export function tangentAt(path: SerpentinePath, u: number) {
  const segment =
    u <= 0
      ? path.segments[0]
      : u >= path.totalLength
        ? path.segments[path.segments.length - 1]
        : findSegment(path, u);

  return {
    x: segment?.tangentX ?? 0,
    y: segment?.tangentY ?? 1
  };
}

export function positionAt(path: SerpentinePath, u: number) {
  return sampleAt(path, u);
}

