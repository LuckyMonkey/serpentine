import test from 'node:test';
import assert from 'node:assert/strict';
import { SlotMotion, WheelSteps } from '../src/motion';

test('a notch in each common browser unit advances exactly one slot and stops', () => {
  for (const [mode, delta] of [[1, 3], [1, 5], [0, 100], [0, 120], [2, 1]]) {
    const motion = new SlotMotion();
    motion.setMax(20);
    motion.moveBy(new WheelSteps().read(mode, delta, 0), 0);
    assert.equal(motion.target, 1);
    assert.ok(motion.sample(16) > 0);
    assert.equal(motion.sample(280), 1);
    assert.equal(motion.active, false);
    assert.equal(motion.sample(1000), 1);
  }
});

test('notches accumulate without an idle timer changing the destination', () => {
  const motion = new SlotMotion();
  motion.setMax(100);
  for (let i = 0; i < 10; i++) motion.moveBy(1, i * 40);
  assert.equal(motion.target, 10);
  assert.equal(motion.sample(1000), 10);
});

test('reversing cancels queued forward travel immediately', () => {
  const motion = new SlotMotion();
  motion.setMax(100);
  motion.moveBy(12, 0);
  const before = motion.sample(70);
  motion.moveBy(-1, 70);
  assert.equal(motion.target, Math.ceil(before) - 1);
  assert.ok(motion.sample(86) < before);
  assert.equal(motion.sample(500), Math.ceil(before) - 1);
});

test('frame rate does not change position or settlement time', () => {
  for (const fps of [30, 60, 120, 144]) {
    const motion = new SlotMotion();
    motion.setMax(10);
    motion.moveBy(1, 0);
    for (let time = 1000 / fps; time < 280; time += 1000 / fps) motion.sample(time);
    assert.equal(motion.sample(280), 1);
    assert.equal(motion.active, false);
  }
});

test('motion is monotone, bounded, and cannot overshoot while retargeting', () => {
  const motion = new SlotMotion();
  motion.setMax(30);
  let previous = 0;
  for (let now = 0; now <= 1200; now += 5) {
    if (now < 500 && now % 50 === 0) motion.moveBy(1, now);
    const position = motion.sample(now);
    assert.ok(position >= previous - 1e-9);
    assert.ok(position <= motion.target + 1e-9);
    previous = position;
  }
  assert.equal(motion.position, 10);
});

test('bounds, resize, and reduced motion leave exact integer positions', () => {
  const motion = new SlotMotion();
  motion.setMax(5);
  assert.equal(motion.moveBy(-1, 0), false);
  motion.moveBy(20, 0);
  motion.sample(40);
  motion.setMax(2);
  assert.equal(motion.position, 2);
  assert.equal(motion.active, false);
  motion.reducedMotion = true;
  motion.moveBy(-1, 50);
  assert.equal(motion.position, 1);
  assert.equal(motion.active, false);
  motion.setMax(0);
  assert.equal(motion.position, 0);
});

test('fine pixel input accumulates, while idle gaps and reversal discard stale residue', () => {
  const wheel = new WheelSteps();
  assert.equal(wheel.read(0, 15, 0), 0);
  assert.equal(wheel.read(0, 15, 16), 0);
  assert.equal(wheel.read(0, 15, 32), 1);
  assert.equal(wheel.read(0, -20, 48), 0);
  assert.equal(wheel.read(0, -20, 64), -1);
  assert.equal(wheel.read(0, 30, 80), 0);
  assert.equal(wheel.read(0, 20, 500), 0);
});
