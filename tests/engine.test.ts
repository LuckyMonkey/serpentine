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

test('path segments are axis aligned and consume one logical slot pitch', () => {
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

test('integer slot offsets land every visible item on a real slot', () => {
  const path = buildSerpentinePath(metrics, 64);

  for (const offsetSlots of [0, 1, 3, 7, 11]) {
    const offsetPx = offsetSlots * metrics.rowPitch;
    const placements = resolvePlacements(path, 48, offsetPx);

    for (const placement of placements) {
      const logicalSlot = placement.itemIndex - offsetSlots;
      if (logicalSlot < 0 || logicalSlot >= path.points.length) continue;
      const expected = path.points[logicalSlot];
      assert.equal(placement.actualDistance, placement.desiredDistance);
      assert.ok(Math.abs(placement.x - expected.x) < 0.001, `x drift for item ${placement.itemIndex}`);
      assert.ok(Math.abs(placement.y - expected.y) < 0.001, `y drift for item ${placement.itemIndex}`);
    }
  }
});

test('all items share one global fractional phase without per-item displacement', () => {
  const path = buildSerpentinePath(metrics, 64);
  const offsetPx = 3.375 * metrics.rowPitch;
  const placements = resolvePlacements(path, 40, offsetPx);

  for (const placement of placements) {
    assert.equal(placement.actualDistance, placement.desiredDistance);
    const expected = sampleAt(path, path.slotDistances[placement.itemIndex] - offsetPx);
    assert.ok(Math.abs(placement.x - expected.x) < 0.001);
    assert.ok(Math.abs(placement.y - expected.y) < 0.001);
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

test('small offset changes produce continuous deterministic motion', () => {
  const path = buildSerpentinePath(metrics, 64);
  const before = resolvePlacements(path, 32, 150);
  const after = resolvePlacements(path, 32, 151);
  const afterByIndex = new Map(after.map((placement) => [placement.itemIndex, placement]));

  for (const a of before) {
    const b = afterByIndex.get(a.itemIndex);
    if (!b) continue;
    const movement = Math.hypot(b.x - a.x, b.y - a.y);
    assert.ok(movement <= Math.max(metrics.colPitch, metrics.rowPitch) / metrics.rowPitch + 0.001);
    assert.equal(a.actualDistance, a.desiredDistance);
    assert.equal(b.actualDistance, b.desiredDistance);
  }
});
