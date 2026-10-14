// Web app manifest generation.
import { parseColor, toHex } from './color.js';
import type { IconFile } from './icons.js';

export type Display = 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
export const DISPLAY_MODES: readonly Display[] = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
export const ORIENTATIONS = ['any', 'natural', 'landscape', 'landscape-primary', 'landscape-secondary', 'portrait', 'portrait-primary', 'portrait-secondary'] as const;

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: ManifestIcon[];
}

export interface ManifestScreenshot {
  src: string;
  sizes: string;
  type: string;
  form_factor?: 'wide' | 'narrow';
  label?: string;
}

export interface WebAppManifest {
  id?: string;
  name: string;
  short_name?: string;
  description?: string;
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  start_url: string;
  scope?: string;
  display: Display;
  display_override?: string[];
  orientation?: string;
  theme_color?: string;
  background_color?: string;
  categories?: string[];
  icons: ManifestIcon[];
  shortcuts?: ManifestShortcut[];
  screenshots?: ManifestScreenshot[];
  [key: string]: unknown;
}

export interface ShortcutInput {
  name: string;
  url: string;
  description?: string;
}

export interface ManifestOptions {
  name: string;
  shortName?: string;
  description?: string;
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  /** Default "./": the folder the manifest is served from. */
  startUrl?: string;
  /** Default "./". */
  scope?: string;
  /** Default: the start URL. */
  id?: string;
  display?: Display;
  displayOverride?: string[];
  orientation?: string;
  themeColor: string;
  backgroundColor: string;
  categories?: string[];
  /** Icon files from generateIcons, or manifest icon entries. */
  icons: Array<IconFile | ManifestIcon>;
  shortcuts?: ShortcutInput[];
  /** Placeholder or real screenshots. */
  screenshots?: ManifestScreenshot[];
}

/**
 * A short name for the home screen label. Launchers truncate after about
 * 12 characters, so long names are shortened at a word boundary.
 */
export function shortNameFrom(name: string, max = 12): string {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Drop a tagline after a separator: "Acme | Fresh bread" or "Acme: the app".
  const head = clean.split(/\s*[|:\u00b7\u2022]\s*|\s+-\s+/)[0]!.trim();
  if (head && head.length <= max) return head;
  // A leading article wastes the few characters there are.
  const words = head.split(' ');
  if (words.length > 1 && /^(the|a|an)$/i.test(words[0]!)) words.shift();
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  return head.slice(0, max).trim();
}

function normalizeColor(value: string, field: string): string {
  const c = parseColor(value);
  if (!c) throw new Error(`${field} is not a valid CSS color: ${value}`);
  return value.startsWith('#') && (value.length === 7 || value.length === 4) ? value.toLowerCase() : toHex(c);
}

function isIconFile(i: IconFile | ManifestIcon): i is IconFile {
  return 'bytes' in i;
}

/** Turns generated icon files into manifest entries (favicons and the apple icon are left out). */
export function manifestIcons(icons: Array<IconFile | ManifestIcon>): ManifestIcon[] {
  const out: ManifestIcon[] = [];
  for (const i of icons) {
    if (!isIconFile(i)) {
      out.push(i);
      continue;
    }
    if (i.role === 'icon') out.push({ src: i.path, sizes: `${i.width}x${i.height}`, type: i.type, purpose: 'any' });
    else if (i.role === 'maskable') out.push({ src: i.path, sizes: `${i.width}x${i.height}`, type: i.type, purpose: 'maskable' });
    else if (i.role === 'favicon-svg') out.push({ src: i.path, sizes: 'any', type: 'image/svg+xml', purpose: 'any' });
  }
  return out;
}

/** Screenshot entries for generated placeholder screenshots. */
export function manifestScreenshots(icons: IconFile[], name: string): ManifestScreenshot[] {
  return icons
    .filter((i) => i.role === 'screenshot')
    .map((i) => ({
      src: i.path,
      sizes: `${i.width}x${i.height}`,
      type: i.type,
      form_factor: i.width > i.height ? ('wide' as const) : ('narrow' as const),
      label: `${name} home screen`,
    }));
}

/** Builds a web app manifest object with fields in a readable order. */
export function generateManifest(o: ManifestOptions): WebAppManifest {
  const name = o.name.trim();
  if (!name) throw new Error('the app needs a name');
  const display = o.display ?? 'standalone';
  if (!DISPLAY_MODES.includes(display)) throw new Error(`display must be one of ${DISPLAY_MODES.join(', ')}`);
  const startUrl = o.startUrl || './';
  const scope = o.scope || './';
  const icons = manifestIcons(o.icons);
  const shortcuts = o.shortcuts?.slice(0, 10).map((s) => {
    const sc: ManifestShortcut = { name: s.name, url: s.url };
    const short = shortNameFrom(s.name);
    if (short !== s.name) sc.short_name = short;
    if (s.description) sc.description = s.description;
    const icon = icons.find((i) => i.sizes === '192x192' && i.purpose !== 'maskable');
    if (icon) sc.icons = [{ src: icon.src, sizes: icon.sizes, type: icon.type }];
    return sc;
  });
  // Keys in a stable, readable order; undefined values are dropped by JSON.
  const ordered = {
    id: o.id || startUrl,
    name,
    short_name: (o.shortName || shortNameFrom(name)).trim(),
    description: o.description?.trim() || undefined,
    lang: o.lang || undefined,
    dir: o.dir,
    start_url: startUrl,
    scope,
    display,
    display_override: o.displayOverride?.length ? o.displayOverride : undefined,
    orientation: o.orientation && o.orientation !== 'any' ? o.orientation : undefined,
    theme_color: normalizeColor(o.themeColor, 'theme_color'),
    background_color: normalizeColor(o.backgroundColor, 'background_color'),
    categories: o.categories?.length ? o.categories : undefined,
    icons,
    shortcuts: shortcuts?.length ? shortcuts : undefined,
    screenshots: o.screenshots?.length ? o.screenshots : undefined,
  };
  for (const k of Object.keys(ordered) as Array<keyof typeof ordered>) if (ordered[k] === undefined) delete ordered[k];
  return ordered as WebAppManifest;
}

/** Serializes a manifest the way installkite writes it. */
export function stringifyManifest(m: WebAppManifest): string {
  return `${JSON.stringify(m, null, 2)}\n`;
}
