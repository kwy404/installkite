import { describe, expect, it } from 'vitest';
import { parsePath, parseTransform, rasterizeSvg, svgSize } from '../src/core/svg.js';
import { parseXml } from '../src/core/xml.js';
import { encodePng } from '../src/core/png.js';
import { coverageOf, disc, px } from './helpers.js';

const svg = (body: string, attrs = 'viewBox="0 0 100 100"'): string => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;
const render = (body: string, size = 100, attrs?: string) => rasterizeSvg(svg(body, attrs), { width: size });

describe('xml parser', () => {
  it('parses elements, attributes, entities and CDATA', () => {
    const root = parseXml('<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><!-- c --><svg a="1" b=\'2\' c=3><g/><text>a &amp; b<![CDATA[<raw>]]></text></svg>');
    expect(root.name).toBe('svg');
    expect(root.attrs).toEqual({ a: '1', b: '2', c: '3' });
    expect(root.children.map((c) => c.name)).toEqual(['g', 'text']);
    expect(root.children[1]!.text).toBe('a & b<raw>');
    expect(() => parseXml('just text')).toThrow();
  });
});

describe('path data', () => {
  it('parses compact syntax, implicit commands and arc flags', () => {
    const segs = parsePath('M0 0 10 0l0 10h-10v-10zM.5.5L1-1');
    expect(segs[0]).toEqual(['M', 0, 0]);
    expect(segs[1]).toEqual(['L', 10, 0]);
    expect(segs[2]).toEqual(['L', 10, 10]);
    expect(segs[3]).toEqual(['L', 0, 10]);
    expect(segs[5]).toEqual(['Z']);
    expect(segs[6]).toEqual(['M', 0.5, 0.5]);
    expect(segs[7]).toEqual(['L', 1, -1]);
    const arc = parsePath('M0 0a5 5 0 1010 0');
    expect(arc.every((s) => s[0] === 'M' || s[0] === 'C')).toBe(true);
    const last = arc[arc.length - 1]!;
    expect(last.slice(-2)).toEqual([10, 0]);
  });

  it('turns quadratic and smooth curves into cubics and stops at errors', () => {
    const q = parsePath('M0 0Q5 10 10 0T20 0');
    expect(q.filter((s) => s[0] === 'C')).toHaveLength(2);
    const s = parsePath('M0 0C0 5 5 5 5 0S10 -5 10 0');
    expect(s[2]).toEqual(['C', 5, -5, 10, -5, 10, 0]);
    expect(parsePath('M0 0L5 5L')).toHaveLength(2);
  });

  it('parses transform lists', () => {
    expect(parseTransform('translate(10 20)')).toEqual([1, 0, 0, 1, 10, 20]);
    expect(parseTransform('scale(2)')).toEqual([2, 0, 0, 2, 0, 0]);
    const r = parseTransform('rotate(90 10 10)');
    expect(r[0]).toBeCloseTo(0);
    expect(r[4]).toBeCloseTo(20);
    expect(r[5]).toBeCloseTo(0);
    expect(parseTransform('matrix(1 2 3 4 5 6) translate(1,0)')).toEqual([1, 2, 3, 4, 6, 8]);
    expect(parseTransform(undefined)).toEqual([1, 0, 0, 1, 0, 0]);
  });
});

describe('rasterizer', () => {
  it('fills rectangles exactly with anti aliased edges', () => {
    const { image } = render('<rect x="10" y="10" width="50.5" height="80" fill="#ff0000"/>');
    expect(px(image, 30, 50)).toEqual([255, 0, 0, 255]);
    expect(px(image, 5, 50)[3]).toBe(0);
    expect(px(image, 60, 50)[3]).toBeGreaterThan(110);
    expect(px(image, 60, 50)[3]).toBeLessThan(145);
  });

  it('fills circles with the right area', () => {
    const { image } = render('<circle cx="50" cy="50" r="40"/>', 200);
    expect(coverageOf(image)).toBeCloseTo(Math.PI * 0.16, 2);
    expect(px(image, 100, 100)).toEqual([0, 0, 0, 255]);
  });

  it('honors fill-rule evenodd and nonzero', () => {
    const d = 'M10 10H90V90H10Z M30 30H70V70H30Z';
    expect(px(render(`<path d="${d}" fill-rule="evenodd"/>`).image, 50, 50)[3]).toBe(0);
    expect(px(render(`<path d="${d}"/>`).image, 50, 50)[3]).toBe(255);
    // The inner square drawn the other way cuts a hole even with nonzero.
    expect(px(render('<path d="M10 10H90V90H10Z M30 30V70H70V30Z"/>').image, 50, 50)[3]).toBe(0);
  });

  it('draws strokes with width, caps and joins', () => {
    const { image } = render('<path d="M20 50H80" stroke="#00f" stroke-width="10" fill="none"/>');
    expect(px(image, 50, 50)).toEqual([0, 0, 255, 255]);
    expect(px(image, 50, 56)[3]).toBe(0);
    expect(px(image, 17, 50)[3]).toBe(0); // butt cap
    const round = render('<path d="M20 50H80" stroke="#00f" stroke-width="10" stroke-linecap="round"/>').image;
    expect(px(round, 17, 50)[3]).toBe(255);
    const square = render('<path d="M20 50H80" stroke="#00f" stroke-width="10" stroke-linecap="square"/>').image;
    expect(px(square, 16, 46)[3]).toBe(255);
    const miter = render('<polyline points="20,80 50,20 80,80" stroke="#000" stroke-width="8" fill="none"/>').image;
    expect(px(miter, 50, 14)[3]).toBeGreaterThan(200);
    const bevel = render('<polyline points="20,80 50,20 80,80" stroke="#000" stroke-width="8" fill="none" stroke-linejoin="bevel"/>').image;
    expect(px(bevel, 50, 14)[3]).toBe(0);
  });

  it('draws dashed strokes', () => {
    const { image } = render('<line x1="0" y1="50" x2="100" y2="50" stroke="#000" stroke-width="4" stroke-dasharray="10 10"/>');
    expect(px(image, 5, 50)[3]).toBe(255);
    expect(px(image, 15, 50)[3]).toBe(0);
    expect(px(image, 25, 50)[3]).toBe(255);
  });

  it('applies transforms, viewBox and preserveAspectRatio', () => {
    const t = render('<g transform="translate(50 0)"><rect width="10" height="10" fill="red"/></g>').image;
    expect(px(t, 55, 5)[0]).toBe(255);
    expect(px(t, 5, 5)[3]).toBe(0);
    // A 200x100 viewBox in a square output is letterboxed vertically.
    const wide = rasterizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100"/></svg>', { width: 100 }).image;
    expect(px(wide, 50, 10)[3]).toBe(0);
    expect(px(wide, 50, 50)[3]).toBe(255);
    expect(svgSize('<svg width="48" height="24"/>')).toEqual({ width: 48, height: 24 });
    expect(svgSize('<svg viewBox="0 0 10 20"/>')).toEqual({ width: 10, height: 20 });
  });

  it('paints linear and radial gradients', () => {
    const lin = render('<defs><linearGradient id="g"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>').image;
    expect(px(lin, 1, 50)[0]).toBeLessThan(10);
    expect(px(lin, 98, 50)[0]).toBeGreaterThan(245);
    expect(px(lin, 50, 50)[0]).toBeGreaterThan(110);
    expect(px(lin, 50, 50)[0]).toBeLessThan(145);
    const rad = render('<radialGradient id="r" href="#base"/><radialGradient id="base"><stop offset="0" stop-color="red"/><stop offset="100%" stop-color="blue"/></radialGradient><rect width="100" height="100" fill="url(#r)"/>').image;
    expect(px(rad, 50, 50)[0]).toBeGreaterThan(240);
    expect(px(rad, 99, 50)[2]).toBeGreaterThan(200);
    const user = render('<linearGradient id="u" gradientUnits="userSpaceOnUse" x1="0" x2="50" spreadMethod="reflect"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient><rect width="100" height="100" fill="url(#u)"/>').image;
    expect(px(user, 98, 50)[0]).toBeLessThan(20);
  });

  it('applies opacity, group opacity and fill-opacity', () => {
    const { image } = render('<g opacity="0.5"><rect width="100" height="100" fill="#000"/><rect width="100" height="100" fill="#000"/></g>');
    expect(px(image, 50, 50)[3]).toBeGreaterThan(120);
    expect(px(image, 50, 50)[3]).toBeLessThan(135);
    expect(px(render('<rect width="100" height="100" fill-opacity="0.25"/>').image, 5, 5)[3]).toBe(64);
  });

  it('resolves styles from attributes, style rules and the style attribute', () => {
    const body = '<style>.a{fill:#00ff00} #b{fill:blue} rect.c{fill:red}</style><rect class="a" width="30" height="30"/><rect id="b" x="35" width="30" height="30"/><rect class="c" x="70" width="30" height="30" fill="black"/><rect y="40" width="30" height="30" style="fill: rgb(255, 0, 255)" fill="black"/><g fill="#ffff00"><rect x="35" y="40" width="30" height="30"/></g><rect x="70" y="40" width="30" height="30" color="#123456" fill="currentColor"/>';
    const { image } = render(body);
    expect(px(image, 10, 10).slice(0, 3)).toEqual([0, 255, 0]);
    expect(px(image, 50, 10).slice(0, 3)).toEqual([0, 0, 255]);
    expect(px(image, 80, 10).slice(0, 3)).toEqual([255, 0, 0]);
    expect(px(image, 10, 50).slice(0, 3)).toEqual([255, 0, 255]);
    expect(px(image, 50, 50).slice(0, 3)).toEqual([255, 255, 0]);
    expect(px(image, 80, 50).slice(0, 3)).toEqual([0x12, 0x34, 0x56]);
  });

  it('renders use, symbol, nested svg, display none and clip paths', () => {
    const body =
      '<defs><symbol id="s" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></symbol><rect id="r" width="10" height="10" fill="lime"/><clipPath id="c"><circle cx="75" cy="75" r="10"/></clipPath></defs>' +
      '<use href="#s" x="0" y="0" width="20" height="20"/><use xlink:href="#r" x="40" y="0"/><svg x="0" y="50" width="20" height="20" viewBox="0 0 1 1"><rect width="1" height="1" fill="blue"/></svg>' +
      '<rect x="40" y="40" width="20" height="20" display="none"/><rect x="50" y="50" width="50" height="50" fill="#000" clip-path="url(#c)"/>';
    const { image } = render(body);
    expect(px(image, 15, 15).slice(0, 3)).toEqual([255, 0, 0]);
    expect(px(image, 45, 5).slice(0, 3)).toEqual([0, 255, 0]);
    expect(px(image, 10, 60).slice(0, 3)).toEqual([0, 0, 255]);
    expect(px(image, 50, 50)[3]).toBe(0);
    expect(px(image, 75, 75)[3]).toBe(255);
    expect(px(image, 55, 55)[3]).toBe(0); // clipped away
  });

  it('draws embedded PNG images', () => {
    const png = Buffer.from(encodePng(disc(20, 0.5, [255, 0, 0]))).toString('base64');
    const { image, warnings } = render(`<image href="data:image/png;base64,${png}" x="0" y="0" width="100" height="100"/>`);
    expect(warnings).toEqual([]);
    expect(px(image, 50, 50).slice(0, 4)).toEqual([255, 0, 0, 255]);
    expect(px(image, 2, 2)[3]).toBe(0);
  });

  it('reports unsupported features as warnings instead of failing', () => {
    const { warnings } = render('<text x="10" y="10">Hi</text><mask id="m"/><image href="logo.png"/><rect width="1" height="1" filter="url(#f)"/>');
    expect(warnings.join(' ')).toMatch(/text/);
    expect(warnings.join(' ')).toMatch(/mask/);
    expect(warnings.join(' ')).toMatch(/PNG data URL/);
    expect(warnings.join(' ')).toMatch(/filters/);
    expect(() => rasterizeSvg('<html></html>', { width: 10 })).toThrow(/not an SVG/);
  });
});
