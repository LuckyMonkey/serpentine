import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTrackMetrics, getSlotRect } from '../src/engine/slots';
import { buildSerpentinePath, sampleAt, tangentAt } from '../src/engine/path';
import { resolvePlacements } from '../src/engine/constraints';
import { computeResponsiveLayout } from '../src/layout';

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

test('slot endpoints alternate axes and consume one logical slot pitch', () => {
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

test('turn midpoint uses the reserved lane below the resting grid', () => {
  const path = buildSerpentinePath(metrics, 64);
  const slotIndex = metrics.rowsPerCol - 1;
  const from = path.points[slotIndex];
  const to = path.points[slotIndex + 1];
  const sample = sampleAt(path, path.slotDistances[slotIndex] + metrics.rowPitch / 2);

  assert.ok(Math.abs(sample.x - (from.x + to.x) / 2) < 0.001);
  assert.ok(Math.abs(sample.y - (from.y + to.y) / 2 - metrics.turnDepth) < 0.001);
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
    assert.ok(movement < 12, `unexpected jump: ${movement}`);
    assert.equal(a.actualDistance, a.desiredDistance);
    assert.equal(b.actualDistance, b.desiredDistance);
  }
});

test('cards never overlap through either turn, including entering and leaving cards', () => {
  for (const [width, height] of [[1000, 600], [1240, 640], [1920, 1080], [700, 420], [320, 700], [1000, 280]]) {
    const { path, metrics } = computeResponsiveLayout(width, height, 64);
    for (let phase = 0; phase <= 200; phase++) {
      const offset = (3 + phase / 200) * metrics.rowPitch;
      const placements = resolvePlacements(path, 64, offset).filter(p => {
        const slot = p.itemIndex - offset / metrics.rowPitch;
        return slot > -1 && slot < metrics.visibleSlotCount;
      });
      for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i], b = placements[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        assert.ok(overlapX < 0.001 || overlapY < 0.001, `${width}×${height}, phase ${phase}: ${a.itemIndex}/${b.itemIndex} overlap ${overlapX}×${overlapY}`);
      }
    }
  }
});

test('resting cards and turn lanes fit the actual viewport', () => {
  for (const [width, height] of [[280, 260], [390, 700], [1000, 280], [1000, 600], [1920, 1080]]) {
    const { metrics, path } = computeResponsiveLayout(width, height, 64);
    for (let phase = 0; phase <= 100; phase++) {
      for (const p of resolvePlacements(path, 64, phase / 100 * metrics.rowPitch)) {
        const slot = p.itemIndex - phase / 100;
        if (slot < 0 || slot > metrics.visibleSlotCount - 1) continue;
        assert.ok(p.left >= -0.001 && p.right <= width + 0.001);
        assert.ok(p.top >= -0.001 && p.bottom <= height + 0.001);
      }
    }
  }
});

test('velocity approaches zero on both sides of a slot boundary', () => {
  const { path, metrics } = computeResponsiveLayout(1000, 600, 32);
  for (let slot = 1; slot < metrics.visibleSlotCount - 1; slot++) {
    const center = sampleAt(path, slot * metrics.rowPitch);
    for (const epsilon of [-0.001, 0.001]) {
      const nearby = sampleAt(path, slot * metrics.rowPitch + epsilon);
      assert.ok(Math.hypot(nearby.x - center.x, nearby.y - center.y) / Math.abs(epsilon) < 0.01);
    }
  }
});
