import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTrackMetrics, getSlotRect } from '../src/engine/slots';
import { buildSerpentinePath, tangentAt } from '../src/engine/path';
import { resolvePlacements } from '../src/engine/constraints';

const metrics = computeTrackMetrics({
  width: 1240,
  height: 640,
  itemWidth: 280,
  itemHeight: 72,
  gapX: 20,
  gapY: 16,
  padX: 24,
  padY: 24
});

test('alternating column direction is deterministic', () => {
  assert.equal(getSlotRect(0, metrics).row, 0);
  assert.equal(getSlotRect(1, metrics).row, 1);
  assert.equal(getSlotRect(metrics.rowsPerCol, metrics).row, metrics.rowsPerCol - 1);
});

test('path segments are axis aligned and turns are horizontal', () => {
  const path = buildSerpentinePath(metrics, metrics.visibleSlotCount + 6);

  for (const segment of path.segments) {
    const dx = Math.abs(segment.to.x - segment.from.x);
    const dy = Math.abs(segment.to.y - segment.from.y);
    assert.equal(dx === 0 || dy === 0, true);
  }

  const turnDistance = path.slotDistances[metrics.rowsPerCol - 1] + metrics.colPitch / 2;
  assert.equal(tangentAt(path, turnDistance).y, 0);
});

test('placements do not overlap through randomized offsets', () => {
  const path = buildSerpentinePath(metrics, 64);

  for (const offset of [0, 34, 71, 118, 163, 211, 287, 332, 418]) {
    const placements = resolvePlacements(path, 32, offset);
    for (let index = 0; index < placements.length; index += 1) {
      for (let other = index + 1; other < placements.length; other += 1) {
        const a = placements[index];
        const b = placements[other];
        const intersects = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        assert.equal(intersects, false, `overlap at offset ${offset} between ${a.itemIndex} and ${b.itemIndex}`);
      }
    }
  }
});

test('turn-region placements use bounded clearance without overlap', () => {
  const path = buildSerpentinePath(metrics, 64);
  const placements = resolvePlacements(path, 20, path.slotDistances[metrics.rowsPerCol - 1] - 12);

  assert.equal(placements.some((placement) => placement.actualDistance > placement.desiredDistance), true);

  for (let index = 0; index < placements.length; index += 1) {
    for (let other = index + 1; other < placements.length; other += 1) {
      const a = placements[index];
      const b = placements[other];
      const intersects = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      assert.equal(intersects, false, `turn overlap between ${a.itemIndex} and ${b.itemIndex}`);
    }
  }
});

