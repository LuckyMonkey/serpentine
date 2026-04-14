import { useCallback, useEffect, useRef, useState } from 'react';

const LINE_HEIGHT_PX = 18;
const WHEEL_CLAMP_PX = 320;
const FRICTION = 6.75;
const SPRING_K = 140;
const SPRING_C = 18;
const OVERSCROLL_D = 140;
const REST_VELOCITY_EPSILON = 3.5;
const REST_POSITION_EPSILON = 0.35;

function normalizeWheelDeltaPx(event: WheelEvent, pagePx: number) {
  let delta = event.deltaY;
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    delta *= LINE_HEIGHT_PX;
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    delta *= pagePx;
  }
  return Math.max(-WHEEL_CLAMP_PX, Math.min(WHEEL_CLAMP_PX, delta));
}

function rubberband(beyondPx: number) {
  const sign = Math.sign(beyondPx);
  const value = Math.abs(beyondPx);
  return sign * (OVERSCROLL_D * (1 - 1 / (value / OVERSCROLL_D + 1)));
}

export function useSerpentineMotion(maxOffsetPx: number, viewportHeight: number, slotPitch: number) {
  const physics = useRef({ x: 0, v: 0 });
  const frameRef = useRef<number | null>(null);
  const previousRef = useRef(0);
  const [offsetPx, setOffsetPx] = useState(0);
  const [displayOffsetPx, setDisplayOffsetPx] = useState(0);
  const windowBucketRef = useRef(0);

  const tick = useCallback((now: number) => {
    const previous = previousRef.current || now;
    const dt = Math.min(0.032, (now - previous) / 1000);
    previousRef.current = now;

    let { x, v } = physics.current;
    v *= Math.exp(-FRICTION * dt);
    if (x < 0) {
      v += (SPRING_K * (0 - x) - SPRING_C * v) * dt;
    } else if (x > maxOffsetPx) {
      v += (-SPRING_K * (x - maxOffsetPx) - SPRING_C * v) * dt;
    }
    x += v * dt;

    const clamped = Math.max(0, Math.min(maxOffsetPx, x));
    const beyond = x - clamped;
    const display = clamped + rubberband(beyond);
    const resting = Math.abs(v) < REST_VELOCITY_EPSILON && Math.abs(beyond) < REST_POSITION_EPSILON;

    setDisplayOffsetPx(display);

    const safePitch = Math.max(1, slotPitch);
    const nextBucket = Math.floor(clamped / safePitch);
    if (nextBucket !== windowBucketRef.current) {
      windowBucketRef.current = nextBucket;
      setOffsetPx(nextBucket * safePitch);
    }

    if (resting) {
      physics.current = { x: clamped, v: 0 };
      setDisplayOffsetPx(clamped);
      frameRef.current = null;
      return;
    }

    physics.current = { x, v };
    frameRef.current = window.requestAnimationFrame(tick);
  }, [maxOffsetPx, slotPitch]);

  const ensureAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }
    previousRef.current = performance.now();
    frameRef.current = window.requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(maxOffsetPx, physics.current.x));
    physics.current = { x: clamped, v: 0 };
    const safePitch = Math.max(1, slotPitch);
    const nextBucket = Math.floor(clamped / safePitch);
    windowBucketRef.current = nextBucket;
    setOffsetPx(nextBucket * safePitch);
    setDisplayOffsetPx(clamped);
  }, [maxOffsetPx, slotPitch]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      physics.current.v += normalizeWheelDeltaPx(event, viewportHeight) * 1.55;
      ensureAnimation();
    },
    [ensureAnimation, viewportHeight]
  );

  return {
    offsetPx,
    displayOffsetPx,
    onWheel
  };
}

