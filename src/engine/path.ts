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

function easedSlots(value: number) {
  const whole = Math.floor(value);
  const phase = value - whole;
  return whole + phase * phase * (3 - 2 * phase);
}

function makeSegments(points: PathPoint[], slotPitch: number) {
  const segments: PathSegment[] = [];
  let cursor = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const axis = dx !== 0 ? 'horizontal' : 'vertical';

    if (dx === 0 && dy === 0) {
      continue;
    }

    // The path parameter is intentionally logical rather than geometric.
    // Every neighboring slot consumes one rowPitch of path distance, even
    // when the visual move is the longer horizontal bridge between columns.
    // This keeps integer offsets aligned to real slots and makes the whole
    // board advance one slot at a time instead of accumulating turn drift.
    const length = slotPitch;

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
  const { segments, totalLength } = makeSegments(points, metrics.rowPitch);
  const slotDistances = Array.from({ length: slotCount }, (_, index) => index * metrics.rowPitch);

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

function sampleTurn(path: SerpentinePath, segment: PathSegment, progress: number): PathSample {
  const { from, to } = segment;
  const width = to.x - from.x;
  const depth = path.metrics.turnDepth;
  const direction = path.slots[from.slotIndex].col % 2 === 0 ? 1 : -1;
  // Keep a card vertically clear by the point its edge crosses the column gap.
  const { gapX, gapY } = path.metrics;
  const clearanceRadius = gapX + gapY + Math.sqrt(2 * gapX * gapY);
  const radius = Math.max(0, Math.min(clearanceRadius, depth / 2, width / 2));
  const leg = depth - radius;
  const arc = Math.PI * radius / 2;
  const bridge = width - radius * 2;
  const length = leg * 2 + arc * 2 + bridge;
  let distance = progress * length;
  let x = 0, y = 0, tangentX = 0, tangentY = 1;
  if (distance <= leg) {
    y = distance;
  } else if ((distance -= leg) <= arc && radius > 0) {
    const angle = distance / radius;
    x = radius * (1 - Math.cos(angle));
    y = leg + radius * Math.sin(angle);
    tangentX = Math.sin(angle);
    tangentY = Math.cos(angle);
  } else if ((distance -= arc) <= bridge) {
    x = radius + distance;
    y = depth;
    tangentX = 1;
    tangentY = 0;
  } else if ((distance -= bridge) <= arc && radius > 0) {
    const angle = distance / radius;
    x = width - radius + radius * Math.sin(angle);
    y = leg + radius * Math.cos(angle);
    tangentX = Math.cos(angle);
    tangentY = -Math.sin(angle);
  } else {
    distance -= arc;
    x = width;
    y = leg - distance;
    tangentY = -1;
  }
  return { x: from.x + x, y: from.y + direction * y, tangentX, tangentY: direction * tangentY };
}

export function sampleAt(path: SerpentinePath, u: number): PathSample {
  if (path.points.length === 0) {
    return { x: 0, y: 0, tangentX: 0, tangentY: 1 };
  }

  if (u <= 0) {
    const first = path.points[0];
    const segment = path.segments[0];
    const scale = path.metrics.rowPitch > 0 ? easedSlots(u / path.metrics.rowPitch) : 0;
    const dx = segment ? segment.to.x - segment.from.x : 0;
    const dy = segment ? segment.to.y - segment.from.y : path.metrics.rowPitch;
    return {
      x: first.x + dx * scale,
      y: first.y + dy * scale,
      tangentX: segment?.tangentX ?? 0,
      tangentY: segment?.tangentY ?? 1
    };
  }

  if (u >= path.totalLength) {
    const last = path.points[path.points.length - 1];
    const segment = path.segments[path.segments.length - 1];
    const extra = u - path.totalLength;
    const scale = path.metrics.rowPitch > 0 ? easedSlots(extra / path.metrics.rowPitch) : 0;
    const dx = segment ? segment.to.x - segment.from.x : 0;
    const dy = segment ? segment.to.y - segment.from.y : path.metrics.rowPitch;
    return {
      x: last.x + dx * scale,
      y: last.y + dy * scale,
      tangentX: segment?.tangentX ?? 0,
      tangentY: segment?.tangentY ?? 1
    };
  }

  const segment = findSegment(path, u);
  if (!segment) {
    return { x: path.points[0].x, y: path.points[0].y, tangentX: 0, tangentY: 1 };
  }

  const phase = segment.length === 0 ? 0 : (u - segment.start) / segment.length;
  // Zero speed at each slot makes fast multi-step travel continuous even when
  // a card changes between a short straight and a longer rounded turn.
  const progress = phase * phase * (3 - 2 * phase);
  if (segment.axis === 'horizontal' && path.metrics.turnDepth > 0) {
    return sampleTurn(path, segment, progress);
  }
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * progress,
    y: segment.from.y + (segment.to.y - segment.from.y) * progress,
    tangentX: segment.tangentX,
    tangentY: segment.tangentY
  };
}

export function tangentAt(path: SerpentinePath, u: number) {
  const sample = sampleAt(path, u);
  return { x: sample.tangentX, y: sample.tangentY };
}

export function positionAt(path: SerpentinePath, u: number) {
  return sampleAt(path, u);
}
