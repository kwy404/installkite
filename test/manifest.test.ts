import { describe, expect, it } from 'vitest';
import { generateManifest, manifestIcons, manifestScreenshots, shortNameFrom, stringifyManifest } from '../src/core/manifest.js';
import { generateIcons, loadIconSource } from '../src/core/icons.js';
import { LOGO_SVG } from './helpers.js';

const icons = generateIcons(loadIconSource(new TextEncoder().encode(LOGO_SVG), 'logo.svg'), { screenshots: true }).files;

describe('manifest', () => {
  it('generates the fields browsers need, in a readable order', () => {
    const m = generateManifest({ name: 'Acme Bakery', description: ' Fresh bread ', lang: 'en', themeColor: 'orange', backgroundColor: '#FFF', icons });
    expect(Object.keys(m)).toEqual(['id', 'name', 'short_name', 'description', 'lang', 'start_url', 'scope', 'display', 'theme_color', 'background_color', 'icons']);
    expect(m.id).toBe('./');
    expect(m.start_url).toBe('./');
    expect(m.scope).toBe('./');
    expect(m.display).toBe('standalone');
    expect(m.description).toBe('Fresh bread');
    expect(m.theme_color).toBe('#ffa500');
    expect(m.background_color).toBe('#fff');
    expect(m.short_name).toBe('Acme Bakery');
  });

  it('lists regular, maskable and svg icons, not favicons or the apple icon', () => {
    const list = manifestIcons(icons);
    expect(list.filter((i) => i.purpose === 'maskable').map((i) => i.sizes)).toEqual(['192x192', '512x512']);
    expect(list.find((i) => i.src === 'icons/icon-512.png')).toEqual({ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' });
    expect(list.find((i) => i.type === 'image/svg+xml')!.sizes).toBe('any');
    expect(list.some((i) => /favicon|apple/.test(i.src))).toBe(false);
    // Plain manifest entries pass through.
    expect(manifestIcons([{ src: 'x.png', sizes: '1x1', type: 'image/png' }])).toEqual([{ src: 'x.png', sizes: '1x1', type: 'image/png' }]);
  });

  it('adds shortcuts with icons, screenshots and optional fields', () => {
    const m = generateManifest({
      name: 'Acme',
      themeColor: '#123456',
      backgroundColor: '#ffffff',
      icons,
      display: 'minimal-ui',
      displayOverride: ['window-controls-overlay'],
      orientation: 'portrait',
      categories: ['food'],
      dir: 'ltr',
      id: '/app',
      startUrl: './?source=pwa',
      scope: '/',
      shortcuts: [
        { name: 'Order online for pickup today', url: './order', description: 'Order' },
        { name: 'Menu', url: './menu' },
      ],
      screenshots: manifestScreenshots(icons, 'Acme'),
    });
    expect(m.shortcuts![0]!.short_name).toBe('Order online');
    expect(m.shortcuts![0]!.icons![0]!.src).toBe('icons/icon-192.png');
    expect(m.shortcuts![1]!.short_name).toBeUndefined();
    expect(m.screenshots!.map((s) => s.form_factor)).toEqual(['wide', 'narrow']);
    expect(m.display_override).toEqual(['window-controls-overlay']);
    expect(m.orientation).toBe('portrait');
    expect(m.id).toBe('/app');
    expect(m.start_url).toBe('./?source=pwa');
    expect(stringifyManifest(m).endsWith('}\n')).toBe(true);
  });

  it('rejects bad input', () => {
    expect(() => generateManifest({ name: ' ', themeColor: '#000', backgroundColor: '#fff', icons: [] })).toThrow(/name/);
    expect(() => generateManifest({ name: 'A', themeColor: 'nope', backgroundColor: '#fff', icons: [] })).toThrow(/theme_color/);
    expect(() => generateManifest({ name: 'A', themeColor: '#000', backgroundColor: '#fff', icons: [], display: 'window' as never })).toThrow(/display/);
  });

  it('shortens names for the home screen label', () => {
    expect(shortNameFrom('Acme')).toBe('Acme');
    expect(shortNameFrom('Acme Bakery | Fresh bread daily')).toBe('Acme Bakery');
    expect(shortNameFrom('Acme: the bread app')).toBe('Acme');
    expect(shortNameFrom('The Wonderful Bakery Company')).toBe('Wonderful');
    expect(shortNameFrom('Supercalifragilistic')).toBe('Supercalifra');
    expect(shortNameFrom('  Spaced   out  name  ')).toBe('Spaced out');
  });
});
