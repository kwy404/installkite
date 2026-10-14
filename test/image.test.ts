import { describe, expect, it } from 'vitest';
import { composite, contentBounds, contentRadius, cornerColor, dominantColor, fillRoundRect, flatten, isOpaque, resize } from '../src/core/image.js';
import { contrast, luminance, mix, parseColor, toHex } from '../src/core/color.js';
import { createImage } from '../src/core/png.js';
import { disc, px } from './helpers.js';

describe('resize', () => {
  it('keeps a solid color solid at any size', () => {
    const img = createImage(64, 64, [200, 100, 50, 255]);
    for (const size of [1, 7, 16, 63, 100, 300]) {
      const out = resize(img, size, size);
      expect(out.width).toBe(size);
      for (const p of [px(out, 0, 0), px(out, size - 1, size - 1), px(out, Math.floor(size / 2), 0)]) {
        expect(p[0]).toBeGreaterThanOrEqual(199);
        expect(p[0]).toBeLessThanOrEqual(201);
        expect(p[3]).toBe(255);
      }
    }
  });

  it('does not darken transparent edges (premultiplied alpha)', () => {
    // White disc on transparent black: edge pixels must stay white, only less opaque.
    const img = disc(256, 0.4, [255, 255, 255]);
    const out = resize(img, 32, 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const p = px(out, x, y);
        if (p[3]! > 8) expect(p[0]).toBeGreaterThan(240);
      }
    }
  });

  it('returns a copy for the same size', () => {
    const img = createImage(4, 4, [1, 2, 3, 255]);
    const out = resize(img, 4, 4);
    expect(out.data).not.toBe(img.data);
    expect([...out.data]).toEqual([...img.data]);
  });

  it('keeps the area of a shape when downscaling', () => {
    const big = disc(400, 0.3, [0, 0, 0]);
    const small = resize(big, 40, 40);
    let alpha = 0;
    for (let i = 3; i < small.data.length; i += 4) alpha += small.data[i]! / 255;
    expect(alpha / (40 * 40)).toBeCloseTo(Math.PI * 0.09, 1);
  });
});

describe('analysis', () => {
  it('measures content bounds and radius', () => {
    const img = disc(200, 0.25, [255, 0, 0]);
    const b = contentBounds(img)!;
    expect(b.x).toBeGreaterThanOrEqual(49);
    expect(b.width).toBeLessThanOrEqual(102);
    expect(contentRadius(img)).toBeGreaterThan(0.24);
    expect(contentRadius(img)).toBeLessThan(0.27);
    expect(contentBounds(createImage(5, 5))).toBeNull();
    // A full bleed square reaches the corners: sqrt(2) / 2.
    expect(contentRadius(createImage(10, 10, [0, 0, 0, 255]))).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('finds a tile background from the corners', () => {
    const tile = createImage(20, 20, [10, 20, 30, 255]);
    expect(cornerColor(tile)).toEqual([10, 20, 30]);
    expect(cornerColor(disc(20, 0.4, [0, 0, 0]))).toBeNull();
    expect(isOpaque(tile)).toBe(true);
    expect(isOpaque(disc(20, 0.4, [0, 0, 0]))).toBe(false);
  });

  it('picks the saturated logo color, not white or black', () => {
    const img = createImage(100, 100, [255, 255, 255, 255]);
    composite(img, disc(100, 0.3, [232, 89, 12]), 0, 0);
    expect(dominantColor(img)).toEqual([232, 89, 12]);
    expect(dominantColor(createImage(10, 10, [255, 255, 255, 255]))).toBeNull();
  });

  it('flattens onto a background and composites with alpha', () => {
    const half = createImage(1, 1, [255, 0, 0, 128]);
    const flat = flatten(half, [0, 0, 255]);
    expect(px(flat, 0, 0)[3]).toBe(255);
    expect(px(flat, 0, 0)[0]).toBeGreaterThan(120);
    expect(px(flat, 0, 0)[2]).toBeGreaterThan(120);
    const base = createImage(4, 4);
    composite(base, createImage(2, 2, [0, 255, 0, 255]), 3, 3);
    expect(px(base, 3, 3)).toEqual([0, 255, 0, 255]);
    expect(px(base, 2, 2)[3]).toBe(0);
  });

  it('fills anti aliased rounded rectangles', () => {
    const img = createImage(40, 40);
    fillRoundRect(img, 5, 5, 30, 30, 10, [0, 0, 0, 255]);
    expect(px(img, 20, 20)[3]).toBe(255);
    expect(px(img, 5, 5)[3]).toBe(0); // the rounded corner
    expect(px(img, 2, 20)[3]).toBe(0);
  });
});

describe('colors', () => {
  it('parses hex, functions and names', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColor('#11223380')).toEqual([17, 34, 51, 128 / 255]);
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual([10, 20, 30, 0.5]);
    expect(parseColor('rgba(10, 20, 30, 0.25)')).toEqual([10, 20, 30, 0.25]);
    expect(parseColor('hsl(120 100% 50%)')).toEqual([0, 255, 0, 1]);
    expect(parseColor('hsl(0.5turn, 100%, 50%)')).toEqual([0, 255, 255, 1]);
    expect(parseColor('hwb(0 0% 0%)')).toEqual([255, 0, 0, 1]);
    expect(parseColor('hwb(0 60% 60%)')).toEqual([128, 128, 128, 1]);
    expect(parseColor('RebeccaPurple')).toEqual([102, 51, 153, 1]);
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0]);
    for (const bad of ['', 'nope', '#12', '#ggg', 'rgb(1,2)', 'hsl(x 1 1)']) expect(parseColor(bad)).toBeNull();
  });

  it('formats and measures contrast', () => {
    expect(toHex([255, 128, 0])).toBe('#ff8000');
    expect(luminance([255, 255, 255])).toBeCloseTo(1);
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
    expect(mix([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128]);
  });
});
