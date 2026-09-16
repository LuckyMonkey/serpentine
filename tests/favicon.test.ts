import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, faviconPalette } from '../src/favicon';

type Pixel = [number, number, number, number];
const pixels = (fn: (x: number, y: number) => Pixel) => new Uint8ClampedArray(Array.from({ length: 32 * 32 }, (_, i) => fn(i % 32, Math.floor(i / 32))).flat());
const rgb = (css: string) => css.match(/\d+/g)!.map(Number) as [number, number, number];

test('opaque right edge supplies the seam color, not the dominant center', () => {
  const palette = faviconPalette(pixels(x => x >= 27 ? [20, 80, 180, 255] : [240, 80, 30, 255]), 32, 32)!;
  assert.equal(palette.edge, 'rgb(20 80 180)');
  assert.notEqual(palette.tint, palette.edge);
});
test('transparent margins use the actual paper backing and preserve a colored tint', () => {
  const palette = faviconPalette(pixels(x => x > 5 && x < 25 ? [240, 30, 30, 255] : [0, 0, 0, 0]), 32, 32)!;
  assert.equal(palette.edge, 'rgb(250 249 246)');
  const [r, g] = rgb(palette.tint);
  assert(r > g);
});
test('empty, fully transparent and malformed images leave the neutral fallback', () => {
  assert.equal(faviconPalette(new Uint8ClampedArray(), 0, 0), null);
  assert.equal(faviconPalette(pixels(() => [0, 0, 0, 0]), 32, 32), null);
  assert.equal(faviconPalette(new Uint8ClampedArray(4), 32, 32), null);
});
test('dark and bright icons retain readable text throughout the gradient', () => {
  for (const color of [[0, 0, 0], [255, 255, 255], [24, 110, 240], [245, 20, 10], [210, 170, 30], [180, 20, 210]]) {
    const palette = faviconPalette(pixels(() => [...color, 255] as Pixel), 32, 32)!;
    const edge = rgb(palette.edge), tint = rgb(palette.tint), ink = rgb(palette.ink);
    for (let i = 0; i <= 32; i++) {
      const sample = edge.map((v, c) => Math.round(v + (tint[c] - v) * i / 32)) as [number, number, number];
      assert(contrast(sample, ink) >= 4.5, `${color}: contrast at ${i}/32`);
    }
  }
});
