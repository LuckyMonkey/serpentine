# Serpentine

`serpentine` is the extracted serpentine track engine from the fridge dashboard.

This repo intentionally contains only the reusable serpentine code and the smallest demo layer needed to show it working:

- the core slot, path, and collision-resolution engine
- a root-level static demo page for GitHub Pages
- tests covering the engine behavior

The source of truth for the final behavior was `/home/fridge/docker/dashboard`, specifically the dashboard's `packages/serpentine-engine` and web serpentine viewport code. This repo is the cleaned public extraction of that work.

## Demo

Live demo:

- `https://luckymonkey.github.io/serpentine/`

Direct repo links:

- Demo page source: [index.html](/home/fridge/serpentine/index.html:1)
- Demo CSS: [demo.css](/home/fridge/serpentine/demo.css:1)
- Demo script: [demo.js](/home/fridge/serpentine/demo.js:1)

GitHub Pages is now expected to serve the repo root directly from `main`. The live page no longer depends on a bundled subdirectory path.

## What The Engine Does

The serpentine engine models a bounded board where items travel through alternating columns:

- even columns run top-to-bottom
- odd columns run bottom-to-top
- path samples stay axis-aligned
- placement resolution preserves readable spacing through the turn regions
- visible items can slide through the viewport without overlapping

The repo is split so the engine can be reused independently from the demo skin.

## Repo Layout

- `src/engine/slots.ts`: track metrics and slot generation
- `src/engine/path.ts`: axis-aligned path construction and path sampling
- `src/engine/constraints.ts`: collision-aware placement solving
- `index.html`, `demo.css`, `demo.js`: flat static demo for GitHub Pages
- `tests/engine.test.ts`: regression coverage pulled from the dashboard implementation

## Local Development

```bash
git clone git@github.com:LuckyMonkey/serpentine.git
cd serpentine
npm install
npm run test
npm run typecheck
```

Open the static demo directly:

```bash
python3 -m http.server
```

Then open `http://localhost:8000/`.

## How To Implement It

The intended integration flow is:

1. Measure the viewport that will host the serpentine board.
2. Choose item dimensions, gaps, and padding for that viewport.
3. Call `computeTrackMetrics(...)`.
4. Call `buildSerpentinePath(metrics, slotCount)`.
5. Drive an `offsetPx` value from wheel, swipe, drag, or another motion source.
6. Call `resolvePlacements(path, itemCount, offsetPx)`.
7. Render the visible cards at the returned `left` and `top` coordinates.

Minimal example:

```ts
import {
  buildSerpentinePath,
  computeTrackMetrics,
  resolvePlacements
} from "./src/index";

const metrics = computeTrackMetrics({
  width,
  height,
  itemWidth: 280,
  itemHeight: 72,
  gapX: 20,
  gapY: 16,
  padX: 24,
  padY: 24
});

const path = buildSerpentinePath(metrics, itemCount + 12);
const placements = resolvePlacements(path, itemCount, offsetPx);
```

## How It Works Fundamentally

The layout is built in four stages:

1. `slots.ts` computes a bounded grid and flips every odd column so the row order alternates.
2. `path.ts` converts those slot centers into one continuous axis-aligned path and records cumulative distance for each slot.
3. Your UI decides the current scroll offset in pixels.
4. `constraints.ts` places each item at its desired path distance and nudges items forward in turn regions whenever a raw placement would overlap a recently placed neighbor.

That last step is the key difference between a naive snake layout and the working dashboard version. The engine does not just map index to slot; it solves for a collision-free placement in the tight corner transitions.

## How The CSS Works

The live demo CSS is intentionally framework-free and split into a few clear layers:

- `:root` sets the type stack, color palette, and page atmosphere.
- `.demo-shell` defines the full-page grid for copy, metrics, stage, and docs.
- `.serpentine-stage` is the bounded viewport that clips the moving cards.
- `.serpentine-card` defines the card surface, depth, and accent wash.
- `.demo-docs` is a responsive two-column documentation grid that collapses to one column on narrow screens.

The only dynamic card styling input is `--accent`, which the script assigns per item. Everything else stays static so the page remains easy to reason about and safe for GitHub Pages.

## Engine API

### `computeTrackMetrics(config)`

Computes the board geometry:

- `rowsPerCol`
- `columnsVisible`
- `visibleSlotCount`
- `rowPitch`
- `colPitch`

### `buildSlots(metrics, slotCount)`

Returns the slot rectangles in serpentine order.

### `buildSerpentinePath(metrics, slotCount)`

Builds an axis-aligned path through the slot centers and records:

- the segment list
- cumulative slot distances
- the total path length

### `sampleAt(path, distance)`

Samples a point and tangent on the path at any distance, including distances before the first slot and after the last slot.

### `resolvePlacements(path, itemCount, offsetPx, overscan?)`

Calculates visible placements for a scrolling window while nudging items apart near tight turn regions so cards do not overlap.

## Validation

The current validation set checks:

- alternating column direction
- horizontal turn tangents
- randomized non-overlap across offsets
- bounded clearance in turn regions

Run:

```bash
npm run test
npm run typecheck
```

## Notes

- The demo is intentionally minimal and exists to expose the engine, not to recreate the entire fridge dashboard UI.
- The public Pages entrypoint is the flat static root page, not a bundled asset pipeline.
- Homepage-only code, dashboard-specific actions, icon systems, and unrelated styles were left out on purpose.
