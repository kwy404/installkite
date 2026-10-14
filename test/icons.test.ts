import { describe, expect, it } from 'vitest';
import {
  APPLE_TOUCH_SIZE,
  FAVICON_SIZES,
  ICON_SIZES,
  MASKABLE_SIZES,
  SAFE_ZONE_RADIUS,
  analyzeSource,
  generateIcons,
  inSafeZone,
  loadIconSource,
  maskablePadding,
  maskableScale,
  renderSource,
} from '../src/core/icons.js';
import { contentRadius } from '../src/core/image.js';
import { readIcoSizes } from '../src/core/ico.js';
import { createImage, decodePng, encodePng } from '../src/core/png.js';
import { GLYPHS, initials, monogramSvg } from '../src/core/monogram.js';
import { rasterizeSvg } from '../src/core/svg.js';
import { LOGO_SVG, discPng, px } from './helpers.js';

const svgSource = () => loadIconSource(new TextEncoder().encode(LOGO_SVG), 'logo.svg');

describe('maskable safe zone math', () => {
  it('scales artwork so its farthest pixel lands on the 40% radius', () => {
    expect(SAFE_ZONE_RADIUS).toBe(0.4);
    // A full bleed square (radius sqrt(2)/2) must shrink to 0.4 / 0.7071.
    expect(maskableScale(Math.SQRT1_2)).toBeCloseTo(0.5657, 4);
    // A circle touching the edges (radius 0.5) scales to 80%.
    expect(maskableScale(0.5)).toBeCloseTo(0.8, 10);
    // Small artwork is never scaled up.
    expect(maskableScale(0.2)).toBe(1);
    expect(maskableScale(0)).toBe(1);
    expect(maskableScale(0.5, 0.45)).toBeCloseTo(0.9, 10);
  });

  it('computes the padding per side in pixels', () => {
    expect(maskablePadding(512, 0.5)).toBe(51); // (512 - round(409.6)) / 2
    expect(maskablePadding(192, Math.SQRT1_2)).toBe((192 - Math.round(192 * 0.565685)) / 2);
    expect(maskablePadding(512, 0.3)).toBe(0);
  });

  it('knows which points are in the safe zone', () => {
    expect(inSafeZone(256, 256, 512)).toBe(true);
    expect(inSafeZone(256 + 204.8, 256, 512)).toBe(true);
    expect(inSafeZone(256 + 206, 256, 512)).toBe(false);
    expect(inSafeZone(0, 0, 512)).toBe(false);
  });

  it('keeps every visible pixel of the artwork inside the safe zone', () => {
    // A square logo that fills its canvas: the worst case.
    const square = loadIconSource(encodePng(createImage(256, 256, [200, 30, 30, 255])), 'square.png');
    const { files } = generateIcons(square, { background: '#ffffff' });
    const mask = files.find((f) => f.path === 'icons/maskable-512.png')!;
    const img = decodePng(mask.bytes);
    // Every red pixel must be inside the circle of radius 0.4 * size (plus 1px of anti aliasing).
    for (let y = 0; y < 512; y += 3) {
      for (let x = 0; x < 512; x += 3) {
        const p = px(img, x, y);
        if (p[1]! < 200) expect(Math.hypot(x + 0.5 - 256, y + 0.5 - 256)).toBeLessThanOrEqual(512 * 0.4 + 1.5);
      }
    }
    // Full bleed: the corners are the opaque background.
    expect(px(img, 0, 0)).toEqual([255, 255, 255, 255]);
  });

  it('treats an opaque tile as background and keeps its color as the bleed', () => {
    // A blue tile with a small white disc in the middle.
    const tile = createImage(256, 256, [20, 60, 200, 255]);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (Math.hypot(x - 128, y - 128) < 40) tile.data.set([255, 255, 255, 255], (y * 256 + x) * 4);
    const src = loadIconSource(encodePng(tile), 'tile.png');
    const a = analyzeSource(src);
    expect(a.tile).toEqual([20, 60, 200]);
    expect(a.radius).toBeLessThan(0.2);
    const { files, background } = generateIcons(src);
    expect(background).toBe('#143cc8');
    const mask = decodePng(files.find((f) => f.role === 'maskable' && f.width === 192)!.bytes);
    expect(px(mask, 0, 0)).toEqual([20, 60, 200, 255]);
    expect(px(mask, 96, 96)).toEqual([255, 255, 255, 255]);
  });
});

describe('icon set', () => {
  it('writes every size, maskable, apple-touch-icon, favicons and svg', () => {
    const { files, analysis } = generateIcons(svgSource(), { screenshots: true, themeColor: '#e8590c' });
    const byPath = new Map(files.map((f) => [f.path, f]));
    for (const s of ICON_SIZES) {
      const f = byPath.get(`icons/icon-${s}.png`)!;
      expect(f.purpose).toBe('any');
      const img = decodePng(f.bytes);
      expect([img.width, img.height]).toEqual([s, s]);
    }
    for (const s of MASKABLE_SIZES) expect(decodePng(byPath.get(`icons/maskable-${s}.png`)!.bytes).width).toBe(s);
    const apple = decodePng(byPath.get('apple-touch-icon.png')!.bytes);
    expect(apple.width).toBe(APPLE_TOUCH_SIZE);
    expect(apple.data.every((v, i) => i % 4 !== 3 || v === 255)).toBe(true);
    expect(readIcoSizes(byPath.get('favicon.ico')!.bytes)).toEqual([...FAVICON_SIZES]);
    expect(byPath.get('favicon-16x16.png')!.width).toBe(16);
    expect(byPath.get('icons/icon.svg')!.type).toBe('image/svg+xml');
    expect(decodePng(byPath.get('icons/screenshot-wide.png')!.bytes).width).toBe(1280);
    expect(decodePng(byPath.get('icons/screenshot-narrow.png')!.bytes).height).toBe(1280);
    expect(analysis.radius).toBeGreaterThan(0.44);
    expect(analysis.tile).toBeNull();
  });

  it('keeps transparency in regular icons and pads the apple icon', () => {
    const src = loadIconSource(discPng(512, 0.48), 'disc.png');
    const { files } = generateIcons(src, { dir: 'img/app/', background: 'rebeccapurple' });
    const icon = decodePng(files.find((f) => f.path === 'img/app/icon-192.png')!.bytes);
    expect(px(icon, 0, 0)[3]).toBe(0);
    expect(px(icon, 96, 96)).toEqual([37, 99, 235, 255]);
    const apple = decodePng(files.find((f) => f.role === 'apple-touch-icon')!.bytes);
    expect(px(apple, 2, 90)).toEqual([102, 51, 153, 255]);
    expect(contentRadius(apple)).toBeGreaterThan(0.7); // opaque everywhere
  });

  it('warns about small or non square sources and rejects other formats', () => {
    const small = loadIconSource(encodePng(createImage(64, 32, [0, 0, 0, 255])), 'small.png');
    expect(small.warnings.join(' ')).toMatch(/at least 512x512/);
    expect(small.warnings.join(' ')).toMatch(/not square/);
    const centered = renderSource(small, 64);
    expect(px(centered, 32, 2)[3]).toBe(0);
    expect(px(centered, 32, 32)[3]).toBe(255);
    expect(() => loadIconSource(new TextEncoder().encode('GIF89a'), 'x.gif')).toThrow(/not a PNG or SVG/);
    expect(() => generateIcons(small, { background: 'nope' })).toThrow(/invalid background/);
  });
});

describe('monogram fallback', () => {
  it('takes one or two initials', () => {
    expect(initials('Acme Bakery')).toBe('AB');
    expect(initials('acme')).toBe('A');
    expect(initials('  ')).toBe('');
    expect(initials('Cafe Ole 2')).toBe('CO');
    expect(initials('9 Lives')).toBe('9L');
  });

  it('has a glyph for every letter and digit', () => {
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') expect(GLYPHS[ch]).toBeTruthy();
  });

  it('renders a readable tile', () => {
    const { image, warnings } = rasterizeSvg(monogramSvg('Acme Bakery', '#e8590c'), { width: 128 });
    expect(warnings).toEqual([]);
    expect(px(image, 64, 4)[3]).toBe(255);
    // Some white ink in the middle band.
    let ink = 0;
    for (let x = 20; x < 108; x++) for (let y = 40; y < 88; y++) if (px(image, x, y)[0]! > 240 && px(image, x, y)[1]! > 240) ink++;
    expect(ink).toBeGreaterThan(300);
    // A light color gets dark ink.
    expect(monogramSvg('X', '#ffee00')).toContain('stroke="#111827"');
    expect(monogramSvg('!!', '#000')).toContain('<rect x="156"');
  });
});
