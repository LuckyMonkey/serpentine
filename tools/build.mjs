import { build } from 'esbuild';
await build({
  entryPoints: { demo: 'demo.js', 'fridge-homepage': 'integrations/fridge-homepage.js' },
  bundle: true, format: 'iife', platform: 'browser',
  target: ['chrome118', 'firefox118', 'safari17'],
  outdir: 'dist', minify: true,
});
