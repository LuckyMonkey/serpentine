const demoItems = [
  { id: 'telemetry', title: 'Telemetry', subtitle: 'live counters and traces', eyebrow: 'system', accent: '#be6d2f' },
  { id: 'gateway', title: 'Gateway', subtitle: 'edge ingress and tunnel state', eyebrow: 'network', accent: '#3f7d6f' },
  { id: 'camera-wall', title: 'Camera Wall', subtitle: 'feeds and retention windows', eyebrow: 'video', accent: '#5f63d9' },
  { id: 'tasks', title: 'Task Queue', subtitle: 'batched follow-up actions', eyebrow: 'ops', accent: '#9c4f7d' },
  { id: 'patches', title: 'Patch Watch', subtitle: 'rollout windows and reboots', eyebrow: 'fleet', accent: '#7b6a35' },
  { id: 'backups', title: 'Backups', subtitle: 'last snapshots and drift alerts', eyebrow: 'storage', accent: '#386b92' },
  { id: 'radios', title: 'Radio Mesh', subtitle: 'nodes, hops, and airtime', eyebrow: 'wireless', accent: '#2d8577' },
  { id: 'weather', title: 'Weather', subtitle: 'local conditions and trends', eyebrow: 'ambient', accent: '#6d59c9' },
  { id: 'announcer', title: 'Announcer', subtitle: 'speech queue and alerts', eyebrow: 'voice', accent: '#b85e43' },
  { id: 'energy', title: 'Energy', subtitle: 'load, export, and battery', eyebrow: 'power', accent: '#8b7d29' },
  { id: 'mail', title: 'Mailroom', subtitle: 'label flow and drafts', eyebrow: 'inbox', accent: '#9b4c69' },
  { id: 'sensors', title: 'Sensors', subtitle: 'temperature and presence tiles', eyebrow: 'signals', accent: '#3d79aa' },
  { id: 'notes', title: 'Notes', subtitle: 'capture stream and daily logs', eyebrow: 'text', accent: '#4f7f44' },
  { id: 'transit', title: 'Transit', subtitle: 'arrivals and service changes', eyebrow: 'city', accent: '#a0532d' },
  { id: 'deploys', title: 'Deploys', subtitle: 'service versions and checks', eyebrow: 'release', accent: '#6761c1' },
  { id: 'archive', title: 'Archive', subtitle: 'cold storage and exports', eyebrow: 'history', accent: '#536f87' }
];

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
const FOLLOW_RATE = 13;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function computeTrackMetrics(config) {
  const colPitch = config.itemWidth + config.gapX;
  const rowPitch = config.itemHeight + config.gapY;
  const innerWidth = Math.max(1, config.width - config.padX * 2);
  const innerHeight = Math.max(1, config.height - config.padY * 2);
  const rowsPerCol = Math.max(1, Math.floor((innerHeight + config.gapY) / rowPitch));
  const columnsVisible = Math.max(1, Math.floor((innerWidth + config.gapX) / colPitch));
  return { ...config, colPitch, rowPitch, rowsPerCol, columnsVisible, visibleSlotCount: rowsPerCol * columnsVisible };
}

function getSlotRect(slotIndex, metrics) {
  const col = Math.floor(slotIndex / metrics.rowsPerCol);
  const rowInCol = slotIndex % metrics.rowsPerCol;
  const row = col % 2 === 0 ? rowInCol : metrics.rowsPerCol - 1 - rowInCol;
  const x = metrics.padX + col * metrics.colPitch;
  const y = metrics.padY + row * metrics.rowPitch;
  return { slotIndex, col, rowInCol, row, x, y, width: metrics.itemWidth, height: metrics.itemHeight, cx: x + metrics.itemWidth / 2, cy: y + metrics.itemHeight / 2 };
}

function buildSerpentinePath(metrics, slotCount) {
  const slots = Array.from({ length: slotCount }, (_, index) => getSlotRect(index, metrics));
  const points = slots.map((slot) => ({ x: slot.cx, y: slot.cy, slotIndex: slot.slotIndex }));
  const segments = [];
  const slotDistances = new Array(slotCount).fill(0);
  let totalLength = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.abs(dx) + Math.abs(dy);
    if (!length) continue;
    segments.push({ from, to, length, start: totalLength, end: totalLength + length, tangentX: dx === 0 ? 0 : Math.sign(dx), tangentY: dy === 0 ? 0 : Math.sign(dy) });
    totalLength += length;
    slotDistances[index + 1] = totalLength;
  }
  return { metrics, slots, points, segments, slotDistances, totalLength };
}

function findSegment(path, u) {
  let low = 0;
  let high = path.segments.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const segment = path.segments[mid];
    if (u < segment.start) high = mid - 1;
    else if (u > segment.end) low = mid + 1;
    else return segment;
  }
  return path.segments[clamp(low, 0, path.segments.length - 1)] ?? null;
}

function sampleAt(path, u) {
  if (!path.points.length) return { x: 0, y: 0, tangentX: 0, tangentY: 1 };
  const first = path.points[0];
  const last = path.points[path.points.length - 1];
  const firstSegment = path.segments[0];
  const lastSegment = path.segments[path.segments.length - 1];
  if (u <= 0) return { x: first.x + (firstSegment?.tangentX ?? 0) * u, y: first.y + (firstSegment?.tangentY ?? 1) * u, tangentX: firstSegment?.tangentX ?? 0, tangentY: firstSegment?.tangentY ?? 1 };
  if (u >= path.totalLength) {
    const extra = u - path.totalLength;
    return { x: last.x + (lastSegment?.tangentX ?? 0) * extra, y: last.y + (lastSegment?.tangentY ?? 1) * extra, tangentX: lastSegment?.tangentX ?? 0, tangentY: lastSegment?.tangentY ?? 1 };
  }
  const segment = findSegment(path, u);
  const progress = (u - segment.start) / segment.length;
  return { x: segment.from.x + (segment.to.x - segment.from.x) * progress, y: segment.from.y + (segment.to.y - segment.from.y) * progress, tangentX: segment.tangentX, tangentY: segment.tangentY };
}

const intersects = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
function intersectsRecent(placement, placements) {
  for (let index = placements.length - 1, seen = 0; index >= 0 && seen < 4; index -= 1, seen += 1) if (intersects(placements[index], placement)) return true;
  return false;
}

function writePlacement(path, itemIndex, distance, target) {
  const sample = sampleAt(path, distance);
  const left = sample.x - path.metrics.itemWidth / 2;
  const top = sample.y - path.metrics.itemHeight / 2;
  Object.assign(target, { itemIndex, desiredDistance: distance, actualDistance: distance, left, top, right: left + path.metrics.itemWidth, bottom: top + path.metrics.itemHeight });
  return target;
}

function resolvePlacements(path, itemCount, offsetPx) {
  const placements = [];
  const visibleDistance = path.slotDistances[Math.max(0, path.metrics.visibleSlotCount - 1)] ?? path.totalLength;
  const minDistance = -path.metrics.rowPitch * 1.5;
  const maxDistance = visibleDistance + path.metrics.rowPitch * 1.5;
  for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
    const desiredDistance = path.slotDistances[itemIndex] - offsetPx;
    if (desiredDistance < minDistance || desiredDistance > maxDistance) continue;
    const placement = writePlacement(path, itemIndex, desiredDistance, {});
    if (intersectsRecent(placement, placements)) {
      const spacingStep = Math.max(path.metrics.rowPitch, path.metrics.itemHeight / 2);
      let low = desiredDistance;
      let high = desiredDistance;
      let bestDistance = desiredDistance;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        high += spacingStep;
        writePlacement(path, itemIndex, high, placement);
        if (!intersectsRecent(placement, placements)) { bestDistance = high; break; }
      }
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const mid = (low + high) / 2;
        writePlacement(path, itemIndex, mid, placement);
        if (intersectsRecent(placement, placements)) low = mid;
        else { high = mid; bestDistance = mid; }
      }
      writePlacement(path, itemIndex, bestDistance, placement);
      placement.actualDistance = bestDistance;
      placement.desiredDistance = desiredDistance;
    }
    placements.push(placement);
  }
  return placements;
}

function computeResponsivePath(width, height, slotCount) {
  const safeWidth = Math.max(width, MOBILE_MIN_COLUMN_WIDTH);
  const compact = safeWidth < 480;
  const tablet = safeWidth >= 480 && safeWidth < 900;
  const minColumnWidth = compact ? MOBILE_MIN_COLUMN_WIDTH : tablet ? TABLET_MIN_COLUMN_WIDTH : DESKTOP_MIN_COLUMN_WIDTH;
  const maxColumnWidth = compact ? MOBILE_MAX_COLUMN_WIDTH : tablet ? TABLET_MAX_COLUMN_WIDTH : DESKTOP_MAX_COLUMN_WIDTH;
  const gap = compact ? MOBILE_GAP : tablet ? TABLET_GAP : DESKTOP_GAP;
  const itemHeight = compact ? MOBILE_SLOT_HEIGHT : tablet ? TABLET_SLOT_HEIGHT : DESKTOP_SLOT_HEIGHT;
  const padY = compact ? MOBILE_PAD_Y : tablet ? TABLET_PAD_Y : DESKTOP_PAD_Y;
  const safeHeight = Math.max(height, itemHeight * (compact ? 5 : 3));
  const columns = clamp(Math.floor((safeWidth + gap) / (minColumnWidth + gap)), 1, MAX_COLUMNS);
  const itemWidth = clamp(Math.floor((safeWidth - gap * (columns - 1)) / columns), minColumnWidth, maxColumnWidth);
  const padX = Math.max(0, Math.floor((safeWidth - (itemWidth * columns + gap * (columns - 1))) / 2));
  const metrics = computeTrackMetrics({ width: safeWidth, height: safeHeight, itemWidth, itemHeight, gapX: gap, gapY: gap, padX, padY });
  return { metrics, path: buildSerpentinePath(metrics, slotCount) };
}

const stage = document.getElementById('serpentine-stage');
const svg = document.getElementById('serpentine-path');
const progress = document.getElementById('serpentine-progress');
const metricColumns = document.getElementById('metric-columns');
const metricRows = document.getElementById('metric-rows');
const metricItems = document.getElementById('metric-items');
const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
svgPath.setAttribute('pathLength', '1000');
svg.replaceChildren(svgPath);

const cardNodes = demoItems.map((item) => {
  const card = document.createElement('article');
  card.className = 'serpentine-card';
  card.style.setProperty('--accent', item.accent);
  card.innerHTML = `<p class="serpentine-eyebrow">${item.eyebrow}</p><h2>${item.title}</h2><p class="serpentine-subtitle">${item.subtitle}</p>`;
  card.hidden = true;
  stage.appendChild(card);
  return card;
});

let layout = null;
let maxOffsetPx = 0;
let displayOffsetPx = 0;
let targetOffsetPx = 0;
let frame = 0;
let lastFrameTime = 0;
let layoutDirty = true;

function rebuildLayout() {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(440, Math.floor(rect.height));
  layout = computeResponsivePath(width, height, demoItems.length + 18);
  const lastItemDistance = layout.path.slotDistances[Math.max(0, demoItems.length - 1)] ?? 0;
  const visibleDistance = layout.path.slotDistances[Math.max(0, layout.metrics.visibleSlotCount - 1)] ?? 0;
  maxOffsetPx = Math.max(0, lastItemDistance - visibleDistance);
  targetOffsetPx = clamp(targetOffsetPx, 0, maxOffsetPx);
  displayOffsetPx = clamp(displayOffsetPx, 0, maxOffsetPx);

  metricColumns.textContent = `${layout.metrics.columnsVisible} columns`;
  metricRows.textContent = `${layout.metrics.rowsPerCol} rows`;
  metricItems.textContent = `${demoItems.length} items`;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  const points = layout.path.slotDistances.slice(0, Math.min(layout.metrics.visibleSlotCount + 6, layout.path.slotDistances.length)).map((distance, index) => {
    const point = sampleAt(layout.path, distance);
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(' ');
  svgPath.setAttribute('d', points);
  for (const card of cardNodes) {
    card.style.width = `${layout.metrics.itemWidth}px`;
    card.style.height = `${layout.metrics.itemHeight}px`;
  }
  layoutDirty = false;
}

function paint() {
  const placements = resolvePlacements(layout.path, demoItems.length, displayOffsetPx);
  const visible = new Set();
  for (const placement of placements) {
    const card = cardNodes[placement.itemIndex];
    visible.add(placement.itemIndex);
    card.hidden = false;
    card.style.transform = `translate3d(${placement.left.toFixed(2)}px, ${placement.top.toFixed(2)}px, 0)`;
  }
  for (let index = 0; index < cardNodes.length; index += 1) if (!visible.has(index)) cardNodes[index].hidden = true;
  progress.style.transform = `translate3d(0, ${Math.max(0, displayOffsetPx / Math.max(1, layout.metrics.rowPitch) * 4).toFixed(2)}px, 0)`;
}

function render(now) {
  frame = 0;
  if (layoutDirty || !layout) rebuildLayout();
  const dt = lastFrameTime ? Math.min(0.05, (now - lastFrameTime) / 1000) : 1 / 60;
  lastFrameTime = now;
  const alpha = 1 - Math.exp(-FOLLOW_RATE * dt);
  displayOffsetPx += (targetOffsetPx - displayOffsetPx) * alpha;
  if (Math.abs(targetOffsetPx - displayOffsetPx) < 0.08) displayOffsetPx = targetOffsetPx;
  paint();
  if (Math.abs(targetOffsetPx - displayOffsetPx) >= 0.08) requestRender();
  else lastFrameTime = 0;
}

function requestRender() {
  if (!frame) frame = window.requestAnimationFrame(render);
}

stage.addEventListener('wheel', (event) => {
  event.preventDefault();
  targetOffsetPx = clamp(targetOffsetPx + event.deltaY * 1.2, 0, maxOffsetPx);
  requestRender();
}, { passive: false });

const resizeObserver = new ResizeObserver(() => {
  layoutDirty = true;
  requestRender();
});
resizeObserver.observe(stage);
requestRender();
