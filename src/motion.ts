const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Slot coordinates, never accumulated wheel pixels. No delayed snap phase. */
export class SlotMotion {
  position = 0;
  target = 0;
  velocity = 0;
  active = false;
  max = 0;
  reducedMotion = false;
  stepDuration = 280;
  private from = 0;
  private initialVelocity = 0;
  private started = 0;
  private duration = 280;
  private direction = 0;

  sample(now: number) {
    if (!this.active) return this.position;
    const t = clamp((now - this.started) / this.duration, 0, 1);
    const distance = this.target - this.from;
    const slope = this.initialVelocity * this.duration;
    this.position = this.from + distance * (3 * t * t - 2 * t * t * t) + slope * (t * t * t - 2 * t * t + t);
    this.velocity = (distance * (6 * t - 6 * t * t) + slope * (3 * t * t - 4 * t + 1)) / this.duration;
    if (t === 1) this.finish();
    return this.position;
  }

  moveBy(steps: number, now: number) {
    if (!Number.isFinite(steps) || steps === 0) return false;
    this.sample(now);
    steps = Math.trunc(steps);
    if (!steps) return false;
    const direction = Math.sign(steps);
    const reversing = direction !== this.direction && this.active;
    // Reversal cancels pending travel and targets the adjacent slot in the
    // new direction, rather than subtracting from a distant queued target.
    const base = reversing ? (direction > 0 ? Math.floor(this.position) : Math.ceil(this.position)) : this.target;
    const target = clamp(base + steps, 0, this.max);
    this.direction = direction;
    if (target === this.target && !reversing) return false;
    this.from = this.position;
    this.target = target;
    const distance = target - this.position;
    this.duration = clamp(this.stepDuration + Math.max(0, Math.abs(distance) - 1) * 18, this.stepDuration, Math.max(this.stepDuration, 400));
    const limit = 3 * Math.abs(distance) / this.duration;
    this.initialVelocity = this.active && !reversing
      ? direction * clamp(this.velocity * direction, 0, limit)
      : direction * limit;
    this.started = now;
    this.active = Math.abs(distance) > 0;
    if (this.reducedMotion) this.finish();
    return true;
  }

  setMax(max: number) {
    this.max = Math.max(0, Math.floor(max));
    this.target = clamp(this.target, 0, this.max);
    this.finish();
  }

  finish() {
    this.position = this.target;
    this.velocity = 0;
    this.active = false;
  }
}

/** Line/page wheel events are discrete; fine pixel gestures accumulate. */
export class WheelSteps {
  private residual = 0;
  private previous = -Infinity;
  private direction = 0;

  read(deltaMode: number, deltaY: number, now: number) {
    if (!Number.isFinite(deltaY) || !deltaY) return 0;
    const direction = Math.sign(deltaY);
    if (now - this.previous > 180 || direction !== this.direction) this.residual = 0;
    this.previous = now;
    this.direction = direction;
    // Browsers do not expose a universal notch count or device type. Common
    // 100/120 px mouse events and line events each mean one deliberate step.
    if (deltaMode !== 0 || (Number.isInteger(deltaY) && Math.abs(deltaY) >= 40)) {
      this.residual = 0;
      return direction;
    }
    this.residual += deltaY;
    const steps = Math.trunc(this.residual / 40);
    this.residual -= steps * 40;
    return steps || 0;
  }
}
