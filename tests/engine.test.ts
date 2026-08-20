import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTrackMetrics, getSlotRect } from '../src/engine/slots';
import { buildSerpentinePath, sampleAt, tangentAt } from '../src/engine/path';
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
    assert.equal(segment.length, metrics.rowPitch);
  }

  const turnDistance = path.slotDistances[metrics.rowsPerCol - 1] + metrics.rowPitch / 2;
  assert.equal(tangentAt(path, turnDistance).y, 0);
});

test('integer slot offsets land every item back on a real slot', () => {
  const path = buildSerpentinePath(metrics, 64);
  const offsetSlots = 3;
  const offsetPx = offsetSlots * metrics.rowPitch;
  const placements = resolvePlacements(path, 24, offsetPx);

  for (const placement of placements) {
    const logicalSlot = placement.itemIndex - offsetSlots;
    if (logicalSlot < 0 || logicalSlot >= path.points.length) continue;
    const expected = path.points[logicalSlot];
    assert.equal(placement.actualDistance, placement.desiredDistance);
    assert.ok(Math.abs(placement.x - expected.x) < 0.001, `x drift for item ${placement.itemIndex}`);
    assert.ok(Math.abs(placement.y - expected.y) < 0.001, `y drift for item ${placement.itemIndex}`);
  }
});

test('samples halfway between slots move along the connecting segment', () => {
  const path = buildSerpentinePath(metrics, 64);
  const slotIndex = metrics.rowsPerCol - 1;
  const from = path.points[slotIndex];
  const to = path.points[slotIndex + 1];
  const sample = sampleAt(path, path.slotDistances[slotIndex] + metrics.rowPitch / 2);

  assert.ok(Math.abs(sample.x - (from.x + to.x) / 2) < 0.001);
  assert.ok(Math.abs(sample.y - (from.y + to.y) / 2) < 0.001);
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
