import { resolvePlacements } from './engine/constraints';
import { computeResponsiveLayout } from './layout';
import { SlotMotion, WheelSteps } from './motion';

export function mountSerpentine(element: HTMLElement, cards: HTMLElement[], onStatus?: (first: number, last: number, total: number) => void) {
  const motion = new SlotMotion();
  const wheel = new WheelSteps();
  let layout = computeResponsiveLayout(element.clientWidth, element.clientHeight, cards.length);
  let frame = 0;
  let destroyed = false;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const { signal } = abort;

  function paint() {
    const focused = document.activeElement;
    const placements = resolvePlacements(layout.path, cards.length, motion.position * layout.metrics.rowPitch);
    const visible = new Set<number>();
    for (const p of placements) {
      const slot = p.itemIndex - motion.position;
      const opacity = Math.max(0, Math.min(1, slot + 1, layout.metrics.visibleSlotCount - slot));
      if (opacity <= 0) continue;
      visible.add(p.itemIndex);
      const card = cards[p.itemIndex];
      card.style.transform = `translate3d(${p.left}px, ${p.top}px, 0)`;
      card.style.opacity = String(opacity);
      card.style.visibility = 'visible';
      card.style.pointerEvents = opacity === 1 ? 'auto' : 'none';
      card.tabIndex = opacity === 1 ? 0 : -1;
      card.setAttribute('aria-hidden', String(opacity !== 1));
      if (focused === card && opacity !== 1) element.focus({ preventScroll: true });
    }
    cards.forEach((card, index) => {
      if (visible.has(index)) return;
      card.style.visibility = 'hidden';
      card.style.pointerEvents = 'none';
      card.tabIndex = -1;
      card.setAttribute('aria-hidden', 'true');
      if (focused === card) element.focus({ preventScroll: true });
    });
    element.dataset.offset = String(motion.position);
    element.dataset.target = String(motion.target);
    element.dataset.animating = String(motion.active);
    if (!motion.active) onStatus?.(cards.length ? motion.target + 1 : 0, Math.min(cards.length, motion.target + layout.metrics.visibleSlotCount), cards.length);
  }

  function tick(now: number) {
    frame = 0;
    if (destroyed) return;
    motion.sample(now);
    paint();
    if (motion.active) frame = requestAnimationFrame(tick);
  }

  function step(steps: number) {
    if (!motion.moveBy(steps, performance.now())) return false;
    if (!frame) frame = requestAnimationFrame(tick);
    return true;
  }

  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    motion.finish();
    paint();
  }

  function resize() {
    const first = Math.round(motion.position);
    layout = computeResponsiveLayout(element.clientWidth, element.clientHeight, cards.length);
    motion.target = first;
    motion.setMax(layout.maxOffsetSlots);
    motion.stepDuration = layout.metrics.turnDepth ? 320 : 240;
    element.style.touchAction = motion.max ? 'pan-x pinch-zoom' : 'auto';
    cards.forEach(card => {
      card.style.width = `${layout.metrics.itemWidth}px`;
      card.style.height = `${layout.metrics.itemHeight}px`;
    });
    settle();
  }

  element.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey) return;
    const mode = event.deltaMode; // Read units before deltas (Firefox compatibility).
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const direction = Math.sign(event.deltaY);
    if (!motion.active && (direction < 0 ? motion.position === 0 : motion.position === motion.max)) return;
    const steps = wheel.read(mode, event.deltaY, performance.now());
    if (steps) step(steps);
    event.preventDefault();
  }, { passive: false, signal });

  element.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const steps: Record<string, number> = {
      ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1,
      PageDown: layout.metrics.visibleSlotCount, PageUp: -layout.metrics.visibleSlotCount,
      Home: -cards.length, End: cards.length,
    };
    if (steps[event.key] && step(steps[event.key])) event.preventDefault();
  }, { signal });

  let touch: { id: number; y: number; originY: number; moved: boolean } | null = null;
  let suppressClickUntil = 0;
  element.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !motion.max) return;
    touch = { id: event.pointerId, y: event.clientY, originY: event.clientY, moved: false };
  }, { signal });
  element.addEventListener('pointermove', event => {
    if (!touch || touch.id !== event.pointerId) return;
    const delta = touch.y - event.clientY;
    if (Math.abs(event.clientY - touch.originY) > 10) touch.moved = true;
    const steps = Math.trunc(delta / 40);
    if (steps) {
      step(steps);
      touch.y -= steps * 40;
    }
  }, { signal });
  const release = () => {
    if (touch?.moved) suppressClickUntil = performance.now() + 400;
    touch = null;
  };
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  element.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true, signal });
  const updatePreference = () => {
    motion.reducedMotion = preference.matches;
    if (motion.reducedMotion) settle();
  };
  preference.addEventListener('change', updatePreference, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); }, { signal });
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  resize();
  updatePreference();
  return { step, motion, destroy() { destroyed = true; abort.abort(); observer.disconnect(); cancelAnimationFrame(frame); } };
}
