// The icon generator: one source image (PNG or SVG) in, a complete icon set
// out. Regular icons keep transparency, maskable icons are full bleed with
// the artwork scaled into the safe zone, the apple-touch-icon is opaque,
// and favicon.ico bundles 16, 32 and 48 pixel images.
import { parseColor, toHex } from './color.js';
import { encodeIco } from './ico.js';
import { composite, contentBounds, contentRadius, cornerColor, fillRoundRect, flatten, resize, type RGB } from './image.js';
import { createImage, decodePng, encodePng, isPng, type RGBAImage } from './png.js';
import { rasterizeSvg } from './svg.js';

/** Sizes of the regular ("any" purpose) PNG icons listed in the manifest. */
export const ICON_SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512] as const;
/** Sizes of the maskable icons. */
export const MASKABLE_SIZES = [192, 512] as const;
/** Sizes bundled into favicon.ico and written as favicon-NxN.png. */
export const FAVICON_SIZES = [16, 32, 48] as const;
/** The apple-touch-icon size used by every current iPhone and iPad. */
export const APPLE_TOUCH_SIZE = 180;
/**
 * The maskable safe zone: a centered circle with a radius of 40% of the
 * icon size (80% diameter). Launchers may crop anything outside it.
 */
export const SAFE_ZONE_RADIUS = 0.4;

export interface IconSource {
  kind: 'png' | 'svg';
  /** The original file, for copying an SVG through as icon.svg. */
  bytes: Uint8Array;
  /** Decoded pixels for PNG sources. */
  image?: RGBAImage;
  /** The text of SVG sources. */
  svg?: string;
  /** Rasterizer warnings for SVG sources. */
  warnings: string[];
}

/** Reads a PNG or SVG source image. */
export function loadIconSource(bytes: Uint8Array, name = ''): IconSource {
  if (isPng(bytes)) {
    const image = decodePng(bytes);
    const warnings: string[] = [];
    if (Math.min(image.width, image.height) < 512) {
      warnings.push(`the source is ${image.width}x${image.height}; use at least 512x512 so the large icons stay sharp`);
    }
    if (image.width !== image.height) warnings.push('the source is not square; it is centered on a square canvas');
    return { kind: 'png', bytes, image, warnings };
  }
  const text = new TextDecoder().decode(bytes);
  if (/<svg[\s>]/i.test(text) || /\.svg$/i.test(name)) {
    // Validate now so errors surface before any file is written.
    const { warnings } = rasterizeSvg(text, { width: 64 });
    return { kind: 'svg', bytes, svg: text, warnings };
  }
  throw new Error(`${name || 'the icon source'} is not a PNG or SVG image`);
}

/** Renders the source to fit a square of `size` pixels, centered, transparent around it. */
export function renderSource(source: IconSource, size: number): RGBAImage {
  if (source.kind === 'svg') return rasterizeSvg(source.svg!, { width: size, height: size }).image;
  const img = source.image!;
  const scale = size / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const resized = resize(img, w, h);
  if (w === size && h === size) return resized;
  const canvas = createImage(size, size);
  return composite(canvas, resized, (size - w) / 2, (size - h) / 2);
}

/**
 * Hides pixels that match the background tile color, so the measured
 * content is the logo on the tile rather than the tile itself.
 */
function foreground(image: RGBAImage, bg: RGB | null): RGBAImage {
  if (!bg) return image;
  const data = image.data.slice();
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.abs(data[i]! - bg[0]) + Math.abs(data[i + 1]! - bg[1]) + Math.abs(data[i + 2]! - bg[2]);
    if (d <= 36) data[i + 3] = 0;
  }
  return { width: image.width, height: image.height, data };
}

/**
 * The scale (fraction of the icon size) at which artwork with a given
 * content radius fits inside the maskable safe zone. `radius` is the
 * distance from the center to the farthest visible pixel as a fraction of
 * the artwork size: about 0.707 for a full bleed square, 0.5 for a circle.
 * Never scales up past 1.
 */
export function maskableScale(radius: number, safeZone = SAFE_ZONE_RADIUS): number {
  if (!(radius > 0)) return 1;
  return Math.min(1, safeZone / radius);
}

/**
 * Padding (in pixels, per side) that a maskable icon of `size` gets for
 * artwork of the given content radius.
 */
export function maskablePadding(size: number, radius: number, safeZone = SAFE_ZONE_RADIUS): number {
  return (size - Math.round(size * maskableScale(radius, safeZone))) / 2;
}

/** True when a point (in pixels of an icon of `size`) is inside the maskable safe zone. */
export function inSafeZone(x: number, y: number, size: number, safeZone = SAFE_ZONE_RADIUS): boolean {
  const c = size / 2;
  return Math.hypot(x - c, y - c) <= size * safeZone + 1e-9;
}

export interface Analysis {
  /** Opaque, same colored corners: the artwork brings its own background tile. */
  tile: RGB | null;
  /** Content radius of the artwork (fraction of its size), not counting a tile background. */
  radius: number;
  /** Radius of every visible pixel, tile included. */
  outerRadius: number;
  /** Content bounds as fractions of the artwork size. */
  bounds: { x: number; y: number; width: number; height: number } | null;
  /** Bounds of every visible pixel, tile included. */
  outerBounds: { x: number; y: number; width: number; height: number } | null;
}

/** Measures the source at a reference resolution. */
export function analyzeSource(source: IconSource): Analysis {
  const ref = renderSource(source, 256);
  const tile = cornerColor(ref);
  const fg = foreground(ref, tile);
  const b = contentBounds(fg);
  const ob = contentBounds(ref);
  const frac = (r: typeof b) => (r ? { x: r.x / 256, y: r.y / 256, width: r.width / 256, height: r.height / 256 } : null);
  return {
    tile,
    radius: contentRadius(fg),
    outerRadius: contentRadius(ref),
    bounds: frac(b),
    outerBounds: frac(ob),
  };
}

export interface IconFile {
  /** Path relative to the output folder, with forward slashes. */
  path: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  type: string;
  purpose?: 'any' | 'maskable';
  role: 'icon' | 'maskable' | 'apple-touch-icon' | 'favicon' | 'favicon-ico' | 'favicon-svg' | 'screenshot';
}

export interface IconOptions {
  /** Background color for maskable and apple-touch-icon images. Default: the artwork's own tile color, else white. */
  background?: string;
  /** Theme color, used by placeholder screenshots. */
  themeColor?: string;
  /** Folder for the icons, relative to the site root. Default "icons". */
  dir?: string;
  /** Safe zone radius as a fraction of the icon size. Default 0.4. */
  safeZone?: number;
  /** Extra padding for the apple-touch-icon as a fraction of the size, per side. Default 0.1 for transparent artwork. */
  applePadding?: number;
  /** Also write placeholder screenshots for the richer install dialog. */
  screenshots?: boolean;
  /** Regular icon sizes. */
  sizes?: readonly number[];
  /** Maskable icon sizes. */
  maskableSizes?: readonly number[];
}

function bgColor(opt: string | undefined, analysis: Analysis): RGB {
  if (opt) {
    const c = parseColor(opt);
    if (!c) throw new Error(`invalid background color ${opt}`);
    return [c[0], c[1], c[2]];
  }
  return analysis.tile ?? [255, 255, 255];
}

/** Draws the artwork scaled by `scale` and centered on an opaque square. */
function onBackground(source: IconSource, size: number, scale: number, bg: RGB): RGBAImage {
  const canvas = createImage(size, size, [bg[0], bg[1], bg[2], 255]);
  const inner = Math.max(1, Math.round(size * scale));
  const art = renderSource(source, inner);
  composite(canvas, art, (size - inner) / 2, (size - inner) / 2);
  return flatten(canvas, bg);
}

/** Generates the whole icon set. Pure: returns files, writes nothing. */
export function generateIcons(source: IconSource, options: IconOptions = {}): { files: IconFile[]; analysis: Analysis; background: string } {
  const dir = (options.dir ?? 'icons').replace(/^\/+|\/+$/g, '');
  const prefix = dir ? `${dir}/` : '';
  const analysis = analyzeSource(source);
  const bg = bgColor(options.background, analysis);
  const safe = options.safeZone ?? SAFE_ZONE_RADIUS;
  // A tile counts as background unless an explicit, different background was asked for.
  const tile = analysis.tile && bg.every((v, i) => Math.abs(v - analysis.tile![i]!) <= 12) ? analysis.tile : null;
  const files: IconFile[] = [];
  const png = (path: string, img: RGBAImage, role: IconFile['role'], purpose?: IconFile['purpose']): void => {
    const file: IconFile = { path, bytes: encodePng(img), width: img.width, height: img.height, type: 'image/png', role };
    if (purpose) file.purpose = purpose;
    files.push(file);
  };

  for (const size of options.sizes ?? ICON_SIZES) png(`${prefix}icon-${size}.png`, renderSource(source, size), 'icon', 'any');

  // Maskable: full bleed background, artwork inside the safe zone. A tile
  // keeps its own color as the bleed; its logo is what must fit.
  const mScale = maskableScale(tile ? analysis.radius : analysis.outerRadius, safe);
  for (const size of options.maskableSizes ?? MASKABLE_SIZES) {
    png(`${prefix}maskable-${size}.png`, onBackground(source, size, mScale, bg), 'maskable', 'maskable');
  }

  // apple-touch-icon: opaque. A tile fills it edge to edge; transparent art gets padding.
  const pad = tile ? 0 : (options.applePadding ?? 0.1);
  let appleScale = 1 - pad * 2;
  if (!tile && analysis.outerBounds) {
    // Fit the visible content box, not the canvas, into the padded square.
    const b = analysis.outerBounds;
    const extent = Math.max(Math.abs(b.x - 0.5), Math.abs(b.x + b.width - 0.5), Math.abs(b.y - 0.5), Math.abs(b.y + b.height - 0.5)) * 2;
    if (extent > 0) appleScale = Math.min(1 / extent, 1.25) * (1 - pad * 2);
  }
  png('apple-touch-icon.png', onBackground(source, APPLE_TOUCH_SIZE, appleScale, bg), 'apple-touch-icon');

  // Favicons.
  const fav: Array<{ size: number; png: Uint8Array }> = [];
  for (const size of FAVICON_SIZES) {
    const img = renderSource(source, size);
    const bytes = encodePng(img);
    fav.push({ size, png: bytes });
    if (size !== 48) files.push({ path: `favicon-${size}x${size}.png`, bytes, width: size, height: size, type: 'image/png', role: 'favicon' });
  }
  files.push({ path: 'favicon.ico', bytes: encodeIco(fav), width: 48, height: 48, type: 'image/x-icon', role: 'favicon-ico' });
  if (source.kind === 'svg') {
    files.push({ path: `${prefix}icon.svg`, bytes: source.bytes, width: 0, height: 0, type: 'image/svg+xml', role: 'favicon-svg' });
  }

  if (options.screenshots) {
    const theme = parseColor(options.themeColor || '') || [...bg, 1];
    for (const [w, h, name] of [
      [1280, 720, 'wide'],
      [720, 1280, 'narrow'],
    ] as const) {
      png(`${prefix}screenshot-${name}.png`, placeholderScreenshot(source, w, h, [theme[0], theme[1], theme[2]], bg), 'screenshot');
    }
  }
  return { files, analysis, background: toHex(bg) };
}

/**
 * A placeholder app screenshot: a top bar in the theme color, the icon and
 * a few content blocks. Replace it with a real screenshot before launch.
 */
export function placeholderScreenshot(source: IconSource, w: number, h: number, theme: RGB, bg: RGB): RGBAImage {
  const light = bg[0] + bg[1] + bg[2] > 382;
  const canvas = createImage(w, h, [bg[0], bg[1], bg[2], 255]);
  const bar = Math.round(Math.min(w, h) * 0.12);
  fillRoundRect(canvas, 0, 0, w, bar, 0, [theme[0], theme[1], theme[2], 255]);
  const iconSize = Math.round(Math.min(w, h) * 0.28);
  const art = renderSource(source, iconSize);
  const ix = Math.round((w - iconSize) / 2);
  const iy = Math.round(bar + (h - bar) * 0.18);
  composite(canvas, art, ix, iy);
  const block: [number, number, number, number] = light ? [0, 0, 0, 22] : [255, 255, 255, 30];
  const accent: [number, number, number, number] = [theme[0], theme[1], theme[2], 120];
  const cw = Math.round(w * (w > h ? 0.5 : 0.72));
  const cx = Math.round((w - cw) / 2);
  let y = iy + iconSize + Math.round(h * 0.06);
  const lh = Math.round(Math.min(w, h) * 0.035);
  fillRoundRect(canvas, cx + cw * 0.15, y, cw * 0.7, lh * 1.4, lh * 0.7, accent);
  y += lh * 3;
  for (const f of [1, 0.92, 0.8]) {
    fillRoundRect(canvas, cx + (cw * (1 - f)) / 2, y, cw * f, lh, lh / 2, block);
    y += lh * 2;
  }
  return canvas;
}
