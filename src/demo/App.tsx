import { useEffect, useMemo, useRef } from 'react';
import { resolvePlacements } from '../engine/constraints';
import { sampleAt } from '../engine/path';
import { demoItems } from './items';
import { computeResponsivePath } from './layout';
import { useContainerSize } from './useContainerSize';
import { useSerpentineMotion } from './useSerpentineMotion';

const EXTRA_SLOTS = 18;

function PathBackdrop({
  slotDistances,
  sampleDistance
}: {
  slotDistances: number[];
  sampleDistance: (distance: number) => { x: number; y: number };
}) {
  if (slotDistances.length < 2) {
    return null;
  }

  const d = slotDistances.map((distance, index) => {
    const point = sampleDistance(distance);
    return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg className="serpentine-path" aria-hidden="true">
      <path d={d} pathLength={1000} />
    </svg>
  );
}

export function App() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const size = useContainerSize(viewportRef.current);

  const layout = useMemo(
    () => computeResponsivePath(size.width, size.height, demoItems.length + EXTRA_SLOTS),
    [size.height, size.width]
  );

  const maxOffsetPx = Math.max(0, (demoItems.length - layout.metrics.visibleSlotCount) * layout.metrics.rowPitch);
  const motion = useSerpentineMotion(maxOffsetPx, size.height, layout.metrics.rowPitch);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const onWheel = (event: WheelEvent) => motion.onWheel(event);
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [motion]);

  const placements = useMemo(
    () => resolvePlacements(layout.path, demoItems.length, motion.offsetPx, 2),
    [layout.path, motion.offsetPx]
  );

  const slotDistances = useMemo(
    () => layout.path.slotDistances.slice(0, Math.min(layout.path.metrics.visibleSlotCount + 6, layout.path.slotDistances.length)),
    [layout.path]
  );

  return (
    <main className="demo-shell">
      <section className="demo-copy" aria-label="Serpentine overview">
        <p className="demo-kicker">fridge dashboard extraction</p>
        <h1>Serpentine</h1>
        <p className="demo-summary">
          A bounded, alternating-column track that keeps cards collision-free while scrolling through a fixed viewport.
        </p>
      </section>

      <div className="demo-metrics" aria-label="Serpentine metrics">
        <span>{layout.metrics.columnsVisible} columns</span>
        <span>{layout.metrics.rowsPerCol} rows</span>
        <span>{demoItems.length} items</span>
      </div>

      <section className="serpentine-stage" ref={viewportRef} aria-label="Serpentine demo viewport">
        <PathBackdrop
          slotDistances={slotDistances}
          sampleDistance={(distance) => sampleAt(layout.path, distance)}
        />

        {placements.map((placement) => {
          const item = demoItems[placement.itemIndex];
          return (
            <article
              key={item.id}
              className="serpentine-card"
              style={{
                width: `${layout.metrics.itemWidth}px`,
                height: `${layout.metrics.itemHeight}px`,
                transform: `translate3d(${placement.left}px, ${placement.top}px, 0)`,
                ['--accent' as string]: item.accent
              }}
            >
              <p className="serpentine-eyebrow">{item.eyebrow}</p>
              <h2>{item.title}</h2>
              <p className="serpentine-subtitle">{item.subtitle}</p>
            </article>
          );
        })}

        <div
          className="serpentine-progress"
          style={{
            transform: `translate3d(0, ${Math.max(0, motion.displayOffsetPx / Math.max(1, layout.metrics.rowPitch) * 4)}px, 0)`
          }}
          aria-hidden="true"
        />
      </section>

      <section className="demo-docs" aria-label="Usage guide">
        <article>
          <h2>How to pull it</h2>
          <pre><code>{`git clone git@github.com:LuckyMonkey/serpentine.git
cd serpentine
npm install
npm run test
npm run dev`}</code></pre>
        </article>

        <article>
          <h2>How to use it</h2>
          <pre><code>{`import { computeTrackMetrics, buildSerpentinePath, resolvePlacements } from "serpentine";

const metrics = computeTrackMetrics({
  width,
  height,
  itemWidth,
  itemHeight,
  gapX,
  gapY,
  padX,
  padY
});

const path = buildSerpentinePath(metrics, itemCount + extraSlots);
const placements = resolvePlacements(path, itemCount, offsetPx);`}</code></pre>
        </article>

        <article>
          <h2>How to implement it</h2>
          <ol>
            <li>Measure the viewport and decide your card size and spacing.</li>
            <li>Build track metrics, then the serpentine path.</li>
            <li>Drive an offset from wheel, touch, keys, or your own motion model.</li>
            <li>Resolve placements for that offset and absolutely position the cards.</li>
          </ol>
        </article>

        <article>
          <h2>How it works fundamentally</h2>
          <p>
            The engine first generates a board of slots with alternating column direction. It then builds a single
            axis-aligned path through the center of each slot.
          </p>
          <p>
            Each item gets a desired distance along that path based on its index and the current viewport offset.
            Near turns, the solver nudges later items forward just enough to keep neighboring cards from intersecting.
          </p>
          <p>
            The result is a bounded scrolling window that feels like a single queue moving through a snake-shaped lane
            instead of a plain stacked list.
          </p>
        </article>
      </section>
    </main>
  );
}
