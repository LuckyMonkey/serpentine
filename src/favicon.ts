type RGB = [number, number, number];
const paper: RGB = [250, 249, 246];
const dark: RGB = [0, 0, 0];
const mix = (a: RGB, b: RGB, amount: number): RGB => a.map((v, i) => Math.round(v * (1 - amount) + b[i] * amount)) as RGB;
const css = (rgb: RGB) => `rgb(${rgb.join(' ')})`;
const luminance = (rgb: RGB) => rgb.reduce((sum, value, i) => {
  const v = value / 255;
  return sum + (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
}, 0);
export const contrast = (a: RGB, b: RGB) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

/** Sample a small decoded favicon, never the hostname or an arbitrary brand table. */
export function faviconPalette(data: Uint8ClampedArray, width: number, height: number) {
  if (width < 1 || height < 1 || data.length !== width * height * 4) return null;
  const colors = new Map<string, { sum: RGB; weight: number; colorful: boolean }>();
  const edgeSum: RGB = [0, 0, 0];
  let edgeCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
    const alpha = data[i + 3] / 255;
    // Transparent margins retain the same paper backing used behind the image.
    if (x >= Math.floor(width * 0.85)) {
      const pixel = mix(paper, rgb, alpha);
      pixel.forEach((v, c) => edgeSum[c] += v);
      edgeCount++;
    }
    if (alpha < 0.1) continue;
    const key = rgb.map(v => Math.floor(v / 32)).join(',');
    const bucket = colors.get(key) || { sum: [0, 0, 0] as RGB, weight: 0, colorful: Math.max(...rgb) - Math.min(...rgb) > 35 };
    rgb.forEach((v, c) => bucket.sum[c] += v * alpha);
    bucket.weight += alpha;
    colors.set(key, bucket);
  }
  if (!colors.size) return null;
  const buckets = [...colors.values()];
  const colorful = buckets.filter(b => b.colorful && b.weight >= width * height * 0.01);
  const dominant = (colorful.length ? colorful : buckets).sort((a, b) => b.weight - a.weight)[0];
  const accent = dominant.sum.map(v => Math.round(v / dominant.weight)) as RGB;
  const edge = edgeSum.map(v => Math.round(v / edgeCount)) as RGB;
  const ink: RGB = contrast(edge, dark) >= 4.5 ? dark : [255, 255, 255];
  const backing: RGB = ink === dark ? paper : [16, 19, 24];
  let tint = mix(mix(edge, accent, 0.38), backing, 0.12);
  // Keep small labels readable throughout the blend, including multicolored icons.
  for (let attempt = 0; attempt < 16; attempt++) {
    if (Array.from({ length: 17 }, (_, i) => contrast(mix(edge, tint, i / 16), ink)).every(value => value >= 4.5)) break;
    tint = mix(tint, backing, 0.2);
  }
  return { edge: css(edge), tint: css(tint), ink: css(ink) };
}
