# Serpentine homepage deployment — 2026-09-16

User authorization: apply the fixes to the homepage hosted at fridge.local.
Source revision: c6a1abd0227def5d79887dc33a73bb1d041040c3, branch fix/predictable-slot-motion.

## Scope and recovery preparation

Deploy the shared TypeScript engine and vanilla DOM adapter, load the CSS override, and switch to versioned browser assets. The PHP link provider, links.json, Caddy routing and container configuration are preserved. No server package installation or container restart is required.

Stage: /home/fridge/fridge-agents/serpentine-deploy-c6a1abd-20260916T142411Z/release/
Backup: /home/fridge/fridge-homepage/deploy-backups/serpentine-before-c6a1abd-20260916T142411Z/

The backup preserves index.php, frontend/serpentine-app.jsx, tools/build.mjs and public/serpentine.bundle.js, with SHA-256 checksums. The old engine directory and original bundle remain available. New assets are installed before the index is replaced using a same-directory rename.

## Preconditions

- Expected previous index SHA-256: e5001c3d03b5d4c5b0d9dc6596be8300936c6d9fc1f6d08b55e24e0f01600fcf.
- Expected previous bundle SHA-256: 863a91a17d3d3be03453fe2ee9d3e3ca47949e3877db022a86f173d3066a0146.
- Repository validation already passed: 16 tests, typecheck, build, and staged Firefox wheel checks.
- The release is built with the existing Fridge esbuild dependency before activation.

## Installed paths

- frontend/serpentine-v2/: shared source from src/ in c6a1abd.
- frontend/serpentine-app.jsx: homepage adapter with its import adjusted to the vendored source.
- tools/build.mjs: builds public/serpentine-c6a1abd.js with minification.
- public/serpentine-c6a1abd.css: homepage CSS override.
- index.php: loads the new CSS and JavaScript filenames.

The original React packages remain installed but are not used by the new adapter. The existing npm run build command will rebuild the active versioned bundle.

## Manual recovery

Restore the old index first, then the original adapter and build script:

```sh
cd /home/fridge/fridge-homepage
cp deploy-backups/serpentine-before-c6a1abd-20260916T142411Z/index.php index.php.recovery
mv index.php.recovery index.php
cp deploy-backups/serpentine-before-c6a1abd-20260916T142411Z/frontend/serpentine-app.jsx frontend/serpentine-app.jsx
cp deploy-backups/serpentine-before-c6a1abd-20260916T142411Z/tools/build.mjs tools/build.mjs
```

The original public/serpentine.bundle.js is not overwritten by this deployment. Restore it from the matching backup only if its checksum changes. This is manual recovery material; automatic rollback has not been implemented or tested.

## Live validation

Activated at 2026-09-16T14:29:43Z. The homepage and both new assets were fetched successfully over HTTP. Served asset hashes match the staged build:

- JavaScript (11,283 bytes): 549013de54d120a01bf7559c9a071a5ea589e463db1c9a7de49a6e34559b7e66.
- CSS: acff824796a8453df80a88f45616e9b3484dabc556dc71704b90a901ce511746.
- New index.php: eec5e7d6f2c3b0ff3bd7a089a4e3436e64019a8c10fe4236994fa07dd60522c8.

All 18 link names, destinations and display URLs match the pre-deployment page. All PHP blocks in index.php are identical to the previous file. The staged JavaScript passes node --check. Backup copies were compared byte-for-byte with the original files before activation. The old bundle hash remains unchanged after activation.

Isolated Firefox 154.0.1 tested the actual HTTP-served page, with no response substitutions:

- Line-mode deltaY=3 and pixel-mode deltaY=100/120 each stop at exactly slot 1.
- No overlapping card rectangles across the sampled wheel-animation frames.
- Reversing a forward burst moves backward on subsequent frames and settles at the integer target.
- Home returns to slot 0; Ctrl-wheel remains uncancelled for browser zoom.
- A 390×700 viewport has no clipped resting cards and retains an integer position.
- No page JavaScript errors.

Physical mouse and trackpad feel needs the user's review. The geometry tradeoff remains eight visible positions at 1000×600, compared with twelve in the old layout. Touch swipes and reduced motion were not rechecked in the live browser run; reduced motion has existing motion-unit coverage.

The existing Tailnet address was inspected, but the homepage could not be reached through it from Freezer. Existing network and Caddy settings were not changed. Review through the working fridge.local LAN hostname.

Private screenshots and the browser report are saved on Freezer in /home/freezer/Documents/serpentine-audit-2026-09-16/ and excluded from the public repository.
