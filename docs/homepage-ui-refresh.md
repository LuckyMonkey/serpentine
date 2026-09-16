# Homepage UI refresh — 2026-09-16

User requested full-height favicons on the left, with their edge colors blending across the cards, and an updated homepage list informed by Firefox history and active GitHub projects.

## Presentation

- The icon occupies the full inner height (70px inside a 72px desktop card; 62px inside a 64px compact card). There is no padded 32px icon well.
- Each distinct decoded image is sampled once on a 32×32 canvas. The rightmost 15% supplies the seam color; a quantized dominant color supplies the tint. Transparent pixels are composited over the same paper backing as the image.
- A 12px feather covers the right edge of the icon and joins the horizontal card gradient. Labels select black or white text; the tint is adjusted when needed to retain at least 4.5:1 sampled contrast along the blend.
- Failed images use a letter fallback; unavailable/tainted pixel data retains neutral colors. Colors are not calculated on animation frames.
- Optional descriptions distinguish projects and link purposes. URLs remain ordinary anchor destinations and tooltips.
- Movement, slot capacity and input behavior are unchanged. The view only adds a card-height CSS custom property.

## Data and privacy

The deployment supplies 37 curated links and 28 locally hosted favicon assets. The selection combines regular sites, nine active projects, explicitly requested additions and a small reference/reading selection. The prior 18-link list is backed up, not discarded. Firefox bookmarks and history are not modified.

History was inspected locally using domain/day aggregates from a consistency-checked copy of the active Firefox database and its write-ahead log. Authentication redirects, local test pages and private one-off URLs were excluded. Raw history, visit counts, personalized links and screenshots do not belong in this public repository. Curation details remain in private operational notes.

Favicons were downloaded ahead of deployment using the existing public favicon provider, with direct official SVG/ICO/large-icon replacements where available. Only curated public site domains were used for those requests. Normal homepage rendering serves all 28 icons locally, with no external favicon requests. Some sites only provide small raster originals; full-height display cannot invent missing detail.

## Release and recovery

- Release: `ui1`, browser assets `public/serpentine-ui1.js` and `public/serpentine-ui1.css`.
- Stage: `/home/fridge/fridge-agents/serpentine-ui1-20260916/release/`.
- Planned backup: `/home/fridge/fridge-homepage/deploy-backups/serpentine-before-ui1-20260916/`.
- The PHP change is preserved in `integrations/fridge-provider.patch`. It accepts only existing image files directly inside a named `public/favicons-*` directory, and preserves the old provider fallback for future entries without a local asset.
- Deployment updates the PHP index, link list, adapter, vendored engine, build script and new versioned assets. No service, network or package changes are needed. Old versioned assets remain available.
- Before activation, retain the index, link list, adapter, vendored source and build script in the dated backup. Restore those exact files to return to the previous release. Restore links before the old index so the previous PHP page never processes unfamiliar domains. Recovery is manual, not automatic.

## Verification

Before deployment: 20 unit tests, TypeScript check and build passed. Isolated Firefox verified all 37 destinations, 37 sampled palettes, no broken icons, full-height square icon geometry, desktop/mobile screenshots and zero outside asset requests or page errors. Final live checks are recorded below after activation.

Physical mouse/trackpad feel remains a user review item. The static no-JavaScript fallback uses neutral gradients because canvas sampling requires JavaScript.
