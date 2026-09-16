# Fridge serpentine UX investigation — 2026-09-16

## Verified baseline

- Homepage source: `/home/fridge/fridge-homepage/frontend/serpentine-app.jsx`.
- Served bundle: `/home/fridge/fridge-homepage/public/serpentine.bundle.js`.
- Live and SSH-read bundle SHA-256: `863a91a17d3d3be03453fe2ee9d3e3ca47949e3877db022a86f173d3066a0146`.
- Vendored engine matches the behavior of upstream `1608b1a2a01f2c5885f624bb6320f25cc164788c`.
- Eighteen live links. Reproduction viewport: 1000×600.
- Baseline browser: isolated headless Firefox 154.0.1; zero page errors.

## Root causes

1. **Wrong wheel units.** The homepage adds `event.deltaY * 1.05` to a pixel target without inspecting `deltaMode`. A simulated Firefox line-mode event with `deltaY: 3` moved the first card from y=42 to about y=39.48, then returned to y=42. A 100-pixel event instead advanced one slot. Browsers explicitly distinguish [pixels, lines, and pages](https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode).
2. **The destination changes after release.** A 140 ms timer rounds the accumulated pixel target to a row pitch while an exponential animation is already following it. This can produce a second correction or reversal. Opposite wheel input subtracts from the queued target, so it need not reverse visible movement immediately.
3. **Turn geometry collides.** The baseline moves 358 pixels sideways in the logical interval used for an 88-pixel vertical move, with abrupt 90-degree direction changes. At half a slot, neighboring cards overlap by 161×28 pixels. Upstream removed collision pushes without replacing the turn geometry.
4. **Verification missed the interaction.** The six existing tests assert deterministic placement and slot alignment, but no longer assert non-overlap. The deployment notes explicitly deferred browser verification. The repo demo retains a separate collision solver even though the homepage and TypeScript engine removed it.
5. **Coordinate and visibility errors.** The engine measures the full viewport, then `.cards { inset: 18px }` adds an extra offset. Overscan nodes remain visible outside the intended grid: the baseline screenshot shows a clipped thirteenth card in a third column despite computing two visible columns. Invisible fallback anchors also remain keyboard-focusable because the old CSS only sets opacity and pointer events.
6. **Broken public demo entrypoint.** The root HTML references unrelated gallery files that do not exist in this repository; it does not load `demo.js`. The replacement reconnects the root demo to the same engine used by Fridge.

## Agreed interaction and replacement

The user selected: one mouse-wheel notch advances one link position and settles precisely.

The replacement uses integer destinations, bounded finite-duration motion, immediate reversal of pending travel, one shared phase, rounded clearance lanes, stable DOM nodes and the actual host dimensions. Keyboard navigation, touch steps, reduced motion, bounds, focus recovery and lifecycle cleanup are included. The homepage CSS removes the second inset and hides inactive fallback links from layout and keyboard navigation.

Turn clearance reduces visible rows. At 1000×600 there are eight slots instead of twelve. This is an explicit geometry tradeoff, not a rendering slowdown. A standard grid would remain a simpler navigation model; this implementation keeps the requested serpentine behavior.

## Validation and rollout

Implementation and build artifacts are on branch `fix/predictable-slot-motion` in `/home/freezer/Projects/serpentine`. Commit c6a1abd was synced to GitHub, then deployed to Fridge at the user's request on 2026-09-16T14:29:43Z. See [deployment and recovery details](homepage-deployment.md).

Automated engine tests cover exact alignment, turn clearance, entry/exit overlap, viewport bounds, fractional continuity, wheel units, fast bursts, reversal, frame-rate independence and reduced motion. Browser checks use a local response substitution for the new bundle and CSS, preserving the exact live link data without replacing the server's files.

- `npm test`: 16/16 passing, including overlap sweeps at six viewport sizes.
- `npm run typecheck`: passing.
- `npm run build`: passing; both adapters bundle the shared source.
- Firefox: line-mode `deltaY: 3` and pixel-mode `deltaY: 100`/`120` each reach target slot 1 and remain there; no page errors.
- The first overlap sweep exposed an entering-card spacing error in the single-row layout. Matching the extrapolated phase to the grid corrected it, and the regression remains covered.
- No tests claim a measured GPU frame rate, physical wheel calibration, or perceived smoothness.

Physical wheel and trackpad feel must still be checked by the user; synthetic events and headless rendering cannot establish hardware latency or perceived smoothness.

Manual acceptance: one slow notch in each direction; a fast burst then reversal; click a settled link; resize while moving; use arrow keys and Home/End; check a phone swipe and reduced-motion mode. Every settled layout should contain complete non-overlapping cards, and a direction reversal should respond on the next animation frame.

Deployment preserved the original index, adapter, build script and bundle in a dated backup. The shared source and adapter are now installed, and versioned CSS/JavaScript filenames are referenced by `index.php`. The existing bind mounts served the change without restarting containers. Live Firefox checks passed for exact wheel stops, turn clearance, reversal, Home, Ctrl-wheel, and an unclipped phone-sized viewport. All 18 link names, destinations and display URLs were preserved.
