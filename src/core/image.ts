// Image operations used by the icon generator: high quality resampling,
// compositing, flattening onto a background, and content analysis (the
// opaque bounding box, the farthest opaque pixel from the center, and the
// dominant color).
import { createImage, type RGBAImage } from './png.js';

export type RGB = [number, number, number];
export type RGBA = [number, number, number, number];

function lanczos(x: number, a = 3): number {
  if (x === 0) return 1;
  if (x <= -a || x >= a) return 0;
  const px = Math.PI * x;
  return (a * Math.sin(px) * Math.sin(px / a)) / (px * px);
}

interface Weights {
  start: Int32Array;
  count: Int32Array;
  values: Float32Array;
  span: number;
}

/** Precomputes Lanczos3 weights for one axis, widened when downscaling so it averages. */
function weights(src: number, dst: number): Weights {
  const scale = dst / src;
  const support = scale < 1 ? 3 / scale : 3;
  const span = Math.ceil(support * 2) + 2;
  const start = new Int32Array(dst);
  const count = new Int32Array(dst);
  const values = new Float32Array(dst * span);
  for (let i = 0; i < dst; i++) {
    const center = (i + 0.5) / scale - 0.5;
    const lo = Math.max(0, Math.floor(center - support));
    const hi = Math.min(src - 1, Math.ceil(center + support));
    let sum = 0;
    let n = 0;
    for (let j = lo; j <= hi && n < span; j++) {
      const w = lanczos((j - center) * (scale < 1 ? scale : 1));
      values[i * span + n] = w;
      sum += w;
      n++;
    }
    if (sum !== 0) for (let k = 0; k < n; k++) values[i * span + k]! /= sum;
    start[i] = lo;
    count[i] = n;
  }
  return { start, count, values, span };
}

/**
 * Resizes with a separable Lanczos3 filter in premultiplied alpha, so
 * transparent edges do not pick up dark fringes.
 */
export function resize(image: RGBAImage, width: number, height: number): RGBAImage {
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  if (width === image.width && height === image.height) {
    return { width, height, data: image.data.slice() };
  }
  const sw = image.width;
  const sh = image.height;
  // Premultiply into floats.
  const src = new Float32Array(sw * sh * 4);
  for (let i = 0; i < src.length; i += 4) {
    const a = image.data[i + 3]! / 255;
    src[i] = image.data[i]! * a;
    src[i + 1] = image.data[i + 1]! * a;
    src[i + 2] = image.data[i + 2]! * a;
    src[i + 3] = a;
  }
  const wx = weights(sw, width);
  const wy = weights(sh, height);
  // Horizontal pass: sw x sh -> width x sh.
  const mid = new Float32Array(width * sh * 4);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      const s = wx.start[x]!;
      for (let k = 0; k < wx.count[x]!; k++) {
        const w = wx.values[x * wx.span + k]!;
        const p = (y * sw + s + k) * 4;
        r += src[p]! * w;
        g += src[p + 1]! * w;
        b += src[p + 2]! * w;
        a += src[p + 3]! * w;
      }
      const o = (y * width + x) * 4;
      mid[o] = r;
      mid[o + 1] = g;
      mid[o + 2] = b;
      mid[o + 3] = a;
    }
  }
  // Vertical pass: width x sh -> width x height, then unpremultiply.
  const out = createImage(width, height);
  for (let y = 0; y < height; y++) {
    const s = wy.start[y]!;
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let k = 0; k < wy.count[y]!; k++) {
        const w = wy.values[y * wy.span + k]!;
        const p = ((s + k) * width + x) * 4;
        r += mid[p]! * w;
        g += mid[p + 1]! * w;
        b += mid[p + 2]! * w;
        a += mid[p + 3]! * w;
      }
      const o = (y * width + x) * 4;
      const alpha = Math.min(1, Math.max(0, a));
      if (alpha <= 1 / 512) {
        out.data[o + 3] = 0;
        continue;
      }
      out.data[o] = clamp8(r / alpha);
      out.data[o + 1] = clamp8(g / alpha);
      out.data[o + 2] = clamp8(b / alpha);
      out.data[o + 3] = clamp8(alpha * 255);
    }
  }
  return out;
}

function clamp8(v: number): number {
  return v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v);
}

/** Draws `top` over `base` at (dx, dy) with source over blending. Mutates and returns `base`. */
export function composite(base: RGBAImage, top: RGBAImage, dx: number, dy: number): RGBAImage {
  dx = Math.round(dx);
  dy = Math.round(dy);
  for (let y = 0; y < top.height; y++) {
    const by = y + dy;
    if (by < 0 || by >= base.height) continue;
    for (let x = 0; x < top.width; x++) {
      const bx = x + dx;
      if (bx < 0 || bx >= base.width) continue;
      const t = (y * top.width + x) * 4;
      const b = (by * base.width + bx) * 4;
      const ta = top.data[t + 3]! / 255;
      if (ta === 0) continue;
      const ba = base.data[b + 3]! / 255;
      const oa = ta + ba * (1 - ta);
      for (let c = 0; c < 3; c++) {
        const v = (top.data[t + c]! * ta + base.data[b + c]! * ba * (1 - ta)) / oa;
        base.data[b + c] = clamp8(v);
      }
      base.data[b + 3] = clamp8(oa * 255);
    }
  }
  return base;
}

/** Returns a copy with every pixel blended over an opaque background color. */
export function flatten(image: RGBAImage, background: RGB): RGBAImage {
  const out = createImage(image.width, image.height, [background[0], background[1], background[2], 255]);
  return composite(out, image, 0, 0);
}

/** The smallest rectangle that holds every pixel with alpha above `threshold`, or null if all transparent. */
export function contentBounds(image: RGBAImage, threshold = 8): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3]! > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * The distance from the image center to the farthest visible pixel corner,
 * as a fraction of the image's larger side. A full bleed square gives
 * sqrt(2) / 2 (about 0.707), a centered circle that touches the edges 0.5.
 */
export function contentRadius(image: RGBAImage, threshold = 8): number {
  const cx = image.width / 2;
  const cy = image.height / 2;
  let max = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3]! <= threshold) continue;
      // The pixel square's farthest corner from the center.
      const fx = Math.max(Math.abs(x - cx), Math.abs(x + 1 - cx));
      const fy = Math.max(Math.abs(y - cy), Math.abs(y + 1 - cy));
      const d = fx * fx + fy * fy;
      if (d > max) max = d;
    }
  }
  return Math.sqrt(max) / Math.max(image.width, image.height);
}

/** True when every pixel is fully opaque. */
export function isOpaque(image: RGBAImage): boolean {
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i] !== 255) return false;
  return true;
}

/** True when the corners are opaque and the same color: the source is a full bleed tile with its own background. */
export function cornerColor(image: RGBAImage): RGB | null {
  const { width: w, height: h, data } = image;
  const at = (x: number, y: number): RGBA => {
    const o = (y * w + x) * 4;
    return [data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!];
  };
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const first = corners[0]!;
  if (first[3] < 250) return null;
  const close = corners.every((c) => c[3] >= 250 && Math.abs(c[0] - first[0]) + Math.abs(c[1] - first[1]) + Math.abs(c[2] - first[2]) <= 24);
  return close ? [first[0], first[1], first[2]] : null;
}

/**
 * The dominant saturated color of an image, for a default theme color.
 * Pixels are bucketed by hue and weighted by alpha and saturation, so a
 * colorful logo on white picks the logo color, not the white.
 */
export function dominantColor(image: RGBAImage): RGB | null {
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  const step = Math.max(1, Math.floor(Math.sqrt((image.width * image.height) / 40000)));
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const o = (y * image.width + x) * 4;
      const r = image.data[o]!;
      const g = image.data[o + 1]!;
      const b = image.data[o + 2]!;
      const a = image.data[o + 3]! / 255;
      if (a < 0.5) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const light = (max + min) / 510;
      if (sat < 0.25 || light < 0.12 || light > 0.92) continue;
      const hue = rgbToHue(r, g, b);
      const key = Math.round(hue / 15) % 24;
      const w = a * sat;
      const e = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
      e.w += w;
      e.r += r * w;
      e.g += g * w;
      e.b += b * w;
      buckets.set(key, e);
    }
  }
  let best: { w: number; r: number; g: number; b: number } | undefined;
  for (const e of buckets.values()) if (!best || e.w > best.w) best = e;
  if (!best || best.w === 0) return null;
  return [Math.round(best.r / best.w), Math.round(best.g / best.w), Math.round(best.b / best.w)];
}

function rgbToHue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Fills a rounded rectangle with anti aliased edges (used for placeholder screenshots). */
export function fillRoundRect(image: RGBAImage, x: number, y: number, w: number, h: number, radius: number, color: RGBA): void {
  const top = createImage(image.width, image.height);
  for (let py = Math.max(0, Math.floor(y)); py < Math.min(image.height, Math.ceil(y + h)); py++) {
    for (let px = Math.max(0, Math.floor(x)); px < Math.min(image.width, Math.ceil(x + w)); px++) {
      // 4x4 supersampling for the coverage.
      let hit = 0;
      for (let sy = 0; sy < 4; sy++) {
        for (let sx = 0; sx < 4; sx++) {
          const qx = px + (sx + 0.5) / 4;
          const qy = py + (sy + 0.5) / 4;
          const dx = Math.max(x + radius - qx, 0, qx - (x + w - radius));
          const dy = Math.max(y + radius - qy, 0, qy - (y + h - radius));
          if (qx >= x && qx <= x + w && qy >= y && qy <= y + h && dx * dx + dy * dy <= radius * radius) hit++;
        }
      }
      if (!hit) continue;
      const o = (py * image.width + px) * 4;
      top.data[o] = color[0];
      top.data[o + 1] = color[1];
      top.data[o + 2] = color[2];
      top.data[o + 3] = Math.round((color[3] * hit) / 16);
    }
  }
  composite(image, top, 0, 0);
}
