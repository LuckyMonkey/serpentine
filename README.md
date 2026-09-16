# Serpentine

A shared layout and motion engine for the Fridge homepage and a static demo.

## Interaction

- One ordinary mouse-wheel event advances one link position.
- Targets are integer slot indices. There is no delayed snap or pixel accumulation for a notched wheel.
- Reversing the wheel cancels queued travel and moves toward the adjacent slot in the new direction.
- Fine pixel input and touch swipes accumulate into steps. Arrow keys move one position; Page Up/Down move a visible window; Home/End reach the bounds.
- Motion respects reduced-motion preferences, stops scheduling animation frames when settled, and preserves a valid slot on resize.
- Ctrl/Meta-wheel retains browser zoom. The demo releases wheel input to the surrounding page at its limits.

Browser wheel events do not expose a standard device type or physical notch count. Line/page events and common integral pixel deltas of 40 or more are treated as discrete steps; smaller pixel deltas accumulate at 40 pixels per step. A fast trackpad can produce ambiguous events. Physical device tuning remains separate from automated event tests.

## Geometry

Resting cards occupy alternating columns. Each logical step moves an item to an adjacent slot. A smooth phase shared by all cards has zero velocity at every slot boundary.

Column transfers follow rounded U-shaped paths through reserved lanes above and below the grid. This clearance prevents wide cards from cutting through their neighbors. It costs visible rows: at 1000×600, the homepage has eight resting positions instead of twelve. Narrow viewports use a vertical list; short viewports use a horizontal row.

No per-card collision pushes or iterative placement corrections run during animation. Entry and exit cards use the same phase as the visible grid and fade at its ends. Nodes stay mounted, so movement does not rebuild the link list.

## Develop and verify

```sh
npm ci
npm test
npm run typecheck
npm run build
```

The generated `dist/demo.js` and `dist/fridge-homepage.js` are checked in so the repository root works on GitHub Pages without an additional build service. Open `index.html` directly for the demo after building. The demo and homepage bundle the same TypeScript implementation.

## Integration

```ts
import { mountSerpentine } from './src/index';

// The host must have a measured height, position: relative, and overflow: hidden.
// Cards must be absolutely positioned within its coordinate system.
const view = mountSerpentine(host, cardElements, (first, last, total) => {
  status.textContent = first + '–' + last + ' of ' + total;
});
view.step(1);
// On teardown:
view.destroy();
```

The Fridge adapter reads the PHP-generated `homepage-links` JSON. It preserves link destinations and names; optional `description` text replaces the displayed URL, while the destination remains in the link tooltip. Favicons fill the card's height on the left. Their decoded pixels supply a feathered edge color and a full-width gradient, with contrasting text and neutral/letter fallbacks for unavailable images. Hostname-derived accent colors are no longer used by the JavaScript cards.

Load `integrations/fridge-homepage.css` after the existing homepage styles. The board must have zero inset because the engine already supplies its padding. The view exposes `--card-height` for responsive icon sizing. `integrations/fridge-provider.patch` records the small PHP change to accept validated local favicon paths and descriptions; it applies to the previously deployed c6a1abd homepage. Personal link data and downloaded brand assets stay on Fridge, outside this public repository. See [UI integration and deployment notes](docs/homepage-ui-refresh.md).

The adapter does not require React or new server packages. It can be bundled using the homepage's existing esbuild installation. See [the investigation and rollout notes](docs/ux-audit.md).

## Modules

- `src/engine/slots.ts`: viewport capacity, resting slots, and turn clearance.
- `src/engine/path.ts`: rounded turn sampling and shared slot phase.
- `src/engine/constraints.ts`: deterministic visible placements; no collision nudging.
- `src/motion.ts`: testable wheel interpretation and monotone, finite-duration slot motion.
- `src/layout.ts`: responsive homepage dimensions.
- `src/view.ts`: browser input, animation scheduling, focus, visibility and resize lifecycle.
- `src/favicon.ts`: edge/dominant pixel sampling and readable gradient colors.
- `integrations/fridge-homepage.js`: existing homepage data to stable link nodes.

The low-level functions `computeTrackMetrics`, `buildSerpentinePath`, `sampleAt`, and `resolvePlacements` remain available. Their path parameter is logical row-pitch distance, not physical arc length. Turn samples now leave the resting grid vertically, so callers must use the engine's reserved turn padding.
