// The installability and offline rules behind installkite doctor and the
// web checker. Everything here runs in Node and in the browser: files come
// from a loader, and the few steps that need platform APIs (decoding PNG
// pixels, hashing, reading the project folder) are passed in as hooks.
import { parseColor } from './color.js';
import type { InstallkiteConfig } from './config.js';
import { getAttr, readPageMeta } from './head.js';
import { readIcoSizes } from './ico.js';
import { isPng, readPngSize } from './pnginfo.js';
import { parseXml } from './xml.js';

export type Severity = 'error' | 'warn' | 'info';
/** `skip` means the rule could not run because a file could not be read (only in the browser). */
export type Status = 'pass' | Severity | 'skip';

export interface Check {
  id: string;
  /** What the rule checks, for the report. */
  title: string;
  status: Status;
  message: string;
  /** How to fix it, when it fails. */
  fix?: string;
}

export interface Resource {
  url: string;
  status: number;
  contentType: string;
  bytes: Uint8Array;
  headers: Record<string, string>;
  /**
   * Set when the file exists or might exist but cannot be read: `cors` when
   * the site does not allow other pages to read it, `mixed` when a secure
   * page asks for a plain HTTP URL.
   */
  blocked?: 'cors' | 'mixed';
}

/** Loads a URL: from disk in local mode, over the network in remote mode. */
export type Loader = (url: string) => Promise<Resource | null>;

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  data: Uint8Array | Uint8ClampedArray;
}

export interface DoctorContext {
  /** The page audited (the start page). */
  pageUrl: string;
  load: Loader;
  mode: 'local' | 'remote';
  config?: InstallkiteConfig | null;
  /** Local mode: the project folder, for precache freshness. */
  cwd?: string;
  /** Decodes PNG pixels, for the transparency rules. Without it those rules are left out. */
  decodeImage?: (bytes: Uint8Array) => Pixels | Promise<Pixels>;
  /** Content hash used by the placeholder screenshot rule. */
  revision?: (bytes: Uint8Array) => string;
  /** Compares the precache list in sw.js with the files on disk. */
  freshness?: (listed: Map<string, string>) => { stale: string[]; gone: string[]; count: number } | null;
}

export interface DoctorReport {
  url: string;
  mode: 'local' | 'remote';
  checks: Check[];
  errors: number;
  warnings: number;
  /** Rules that could not run because a file could not be read. */
  skipped: number;
  /** True when no rule failed with an error and none was skipped. */
  installable: boolean;
  offlineReady: boolean;
}

const td = new TextDecoder();
const text = (r: Resource): string => td.decode(r.bytes);

function isLocalHost(u: URL): boolean {
  return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]' || u.hostname.endsWith('.localhost');
}

interface IconInfo {
  src: string;
  sizes: string[];
  type?: string;
  purpose: string[];
}

function iconList(manifest: Record<string, unknown>): IconInfo[] {
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  return icons
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object' && typeof (i as { src?: unknown }).src === 'string')
    .map((i) => ({
      src: i.src as string,
      sizes: typeof i.sizes === 'string' ? i.sizes.toLowerCase().split(/\s+/).filter(Boolean) : [],
      type: typeof i.type === 'string' ? i.type : undefined,
      purpose: typeof i.purpose === 'string' ? i.purpose.toLowerCase().split(/\s+/).filter(Boolean) : ['any'],
    }));
}

const hasSize = (i: IconInfo, n: number): boolean => i.sizes.some((s) => s === 'any' || Number(s.split('x')[0]) >= n);

/** True when url is inside scope (same origin, path prefix). */
export function withinScope(url: string, scope: string): boolean {
  const u = new URL(url);
  const s = new URL(scope);
  return u.origin === s.origin && u.pathname.startsWith(s.pathname);
}

/** Finds the service worker URL a page registers: installkite's data-sw, or a register() call. */
export function findServiceWorker(html: string, pageUrl: string): { url: string; via: string } | null {
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = getAttr(m[0], 'src') || '';
    if (/installkite(\.min)?\.js(\?|$)/.test(src)) {
      const sw = getAttr(m[0], 'data-sw');
      const scriptUrl = new URL(src, pageUrl);
      return { url: new URL(sw || 'sw.js', sw ? pageUrl : scriptUrl).href, via: 'installkite.js' };
    }
  }
  const reg = /serviceWorker\s*\.\s*register\s*\(\s*(['"`])([^'"`]+)\1/.exec(html);
  if (reg) return { url: new URL(reg[2]!, pageUrl).href, via: 'navigator.serviceWorker.register' };
  return null;
}

/** Reads the embedded settings back out of a generated sw.js, or null. */
export function readSwSettings(source: string): { version: string; precache: Array<[string, string]>; [k: string]: unknown } | null {
  const m = /self\.__INSTALLKITE__\s*=\s*(\{.*?\});\s*$/m.exec(source);
  if (!m) return null;
  try {
    return JSON.parse(m[1]!);
  } catch {
    return null;
  }
}

/** Why a file could not be read, in plain words. */
export function blockedMessage(url: string, why: 'cors' | 'mixed'): string {
  const u = new URL(url);
  const name = u.pathname === '/' ? u.host : u.pathname.split('/').filter(Boolean).pop() || u.pathname;
  return why === 'mixed' ? `${name} is on plain HTTP, which a secure page is not allowed to read` : `the site does not let other pages read ${name}, so the browser kept it private`;
}

const SKIP_FIX = 'Run "npx installkite doctor <url>" on your computer for the full check: the command line has no such limits.';

/** Runs every rule. */
export async function runDoctor(ctx: DoctorContext): Promise<DoctorReport> {
  const checks: Check[] = [];
  const add = (id: string, title: string, status: Status, message: string, fix?: string): void => {
    const c: Check = { id, title, status, message };
    if (fix && status !== 'pass') c.fix = fix;
    checks.push(c);
  };
  const skip = (id: string, title: string, res: Resource): void => add(id, title, 'skip', blockedMessage(res.url, res.blocked!), SKIP_FIX);
  const pixels = async (bytes: Uint8Array): Promise<Pixels | null> => {
    if (!ctx.decodeImage) return null;
    try {
      return await ctx.decodeImage(bytes);
    } catch {
      return null;
    }
  };
  const page = new URL(ctx.pageUrl);
  const local = ctx.mode === 'local';

  // HTTPS.
  if (local) {
    const url = ctx.config?.url;
    if (url && !/^https:/i.test(url) && !isLocalHost(new URL(url))) {
      add('https', 'Served over HTTPS', 'error', `the production URL ${url} is not HTTPS`, 'Service workers and installs need HTTPS. GitHub Pages, Netlify and most hosts give you HTTPS for free: enable it and use the https:// URL.');
    } else {
      add('https', 'Served over HTTPS', 'info', url ? `production URL ${url} uses HTTPS` : 'checked when you run doctor --url against the live site', 'Deploy over HTTPS (localhost also works while developing).');
    }
  } else if (page.protocol === 'https:' || isLocalHost(page)) {
    add('https', 'Served over HTTPS', 'pass', `${page.origin} is a secure origin`);
  } else {
    add('https', 'Served over HTTPS', 'error', `${page.origin} is not HTTPS, so browsers block the service worker and the install prompt`, 'Serve the site over HTTPS. On GitHub Pages tick "Enforce HTTPS"; Netlify and Vercel do it automatically.');
  }

  // The start page.
  const pageRes = await ctx.load(page.href);
  if (pageRes?.blocked) {
    skip('page', 'Start page loads', pageRes);
    return summarize(page.href, ctx.mode, checks);
  }
  if (!pageRes || pageRes.status >= 400) {
    add('page', 'Start page loads', 'error', `${page.href} returned ${pageRes ? `HTTP ${pageRes.status}` : 'no response'}`, local ? 'Build the site first, or pass --root with the folder that holds index.html.' : 'Check the URL and that the site is deployed.');
    return summarize(page.href, ctx.mode, checks);
  }
  const html = text(pageRes);
  const meta = readPageMeta(html);
  add('viewport', 'Viewport meta tag', meta.hasViewport ? 'pass' : 'warn', meta.hasViewport ? 'the page sets a viewport' : 'no <meta name="viewport">, so the installed app renders at desktop width on phones', 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head.');

  // Manifest.
  let manifest: Record<string, unknown> | null = null;
  let manifestUrl = '';
  if (!meta.manifest) {
    add('manifest-link', 'Page links a web app manifest', 'error', 'no <link rel="manifest"> on the start page', 'Run "npx installkite init", or add <link rel="manifest" href="manifest.webmanifest"> to the head.');
  } else {
    manifestUrl = new URL(meta.manifest, pageRes.url).href;
    add('manifest-link', 'Page links a web app manifest', 'pass', `links ${meta.manifest}`);
    const res = await ctx.load(manifestUrl);
    if (res?.blocked) skip('manifest-fetch', 'Manifest loads', res);
    else if (!res || res.status >= 400) {
      add('manifest-fetch', 'Manifest loads', 'error', `${manifestUrl} returned ${res ? `HTTP ${res.status}` : 'no response'}`, 'Check the href of the manifest link and that the file is deployed.');
    } else {
      try {
        const parsed: unknown = JSON.parse(text(res));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
        manifest = parsed as Record<string, unknown>;
        add('manifest-fetch', 'Manifest loads', 'pass', 'the manifest is valid JSON');
      } catch (e) {
        add('manifest-fetch', 'Manifest loads', 'error', `the manifest is not valid JSON (${(e as Error).message})`, 'Fix the JSON syntax, or regenerate it with "npx installkite init".');
      }
      if (!local && res.contentType && !/json/.test(res.contentType)) {
        add('manifest-type', 'Manifest content type', 'warn', `served as ${res.contentType}`, 'Serve .webmanifest as application/manifest+json (most hosts do). On Apache add: AddType application/manifest+json .webmanifest');
      }
    }
  }

  let scopeUrl = page.href;
  let startUrl = page.href;
  if (manifest) {
    const m = manifest;
    const name = typeof m.name === 'string' ? m.name.trim() : '';
    const short = typeof m.short_name === 'string' ? m.short_name.trim() : '';
    if (!name && !short) add('manifest-name', 'App name', 'error', 'the manifest has no name or short_name', 'Add "name" (shown on the install dialog and splash screen) and "short_name" (the home screen label).');
    else if (!name) add('manifest-name', 'App name', 'warn', `only short_name "${short}" is set`, 'Add a "name" for the install dialog and splash screen.');
    else add('manifest-name', 'App name', 'pass', `"${name}"`);
    const label = short || name;
    if (label.length > 12) add('short-name', 'Home screen label fits', 'warn', `"${label}" has ${label.length} characters and gets cut off under the icon`, 'Set a "short_name" of 12 characters or fewer.');
    else if (label) add('short-name', 'Home screen label fits', 'pass', `"${label}"`);

    const display = typeof m.display === 'string' ? m.display : 'browser';
    const override = Array.isArray(m.display_override) ? (m.display_override as string[]) : [];
    const appLike = ['standalone', 'fullscreen', 'minimal-ui'].includes(display) || override.some((d) => ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay', 'tabbed'].includes(d));
    add('display', 'Opens in its own window', appLike ? 'pass' : 'error', appLike ? `display: ${display}` : `display is "${display}", which opens in a normal browser tab and is not installable`, 'Set "display": "standalone".');

    // start_url and scope.
    const rawStart = typeof m.start_url === 'string' && m.start_url ? m.start_url : null;
    startUrl = new URL(rawStart ?? page.href, manifestUrl).href;
    scopeUrl = new URL(typeof m.scope === 'string' && m.scope ? m.scope : '.', typeof m.scope === 'string' && m.scope ? manifestUrl : startUrl).href;
    if (!rawStart) add('start-url', 'start_url set', 'warn', 'no start_url, so the app opens on whatever page it was installed from', 'Add "start_url": "./".');
    if (!withinScope(startUrl, scopeUrl)) {
      add('scope', 'start_url is inside scope', 'error', `start_url ${startUrl} is outside scope ${scopeUrl}`, 'Make "scope" a parent folder of "start_url", for example both "./".');
    } else add('scope', 'start_url is inside scope', 'pass', `scope ${new URL(scopeUrl).pathname}`);
    if (new URL(startUrl).origin !== page.origin) {
      add('start-url-origin', 'start_url on the same origin', 'error', `start_url points to another origin (${new URL(startUrl).origin})`, 'Use a start_url on the same site, like "./".');
    }
    const startRes = await ctx.load(startUrl);
    if (startRes?.blocked) skip('start-url-reachable', 'start_url is reachable', startRes);
    else if (!startRes || startRes.status >= 400) {
      add('start-url-reachable', 'start_url is reachable', 'error', `${startUrl} returned ${startRes ? `HTTP ${startRes.status}` : 'no response'}`, local ? 'Make sure the page exists in the deployed folder (on GitHub Pages under a repository the base path must be included: check "base" in installkite.config.json).' : 'Point start_url at a page that loads, like "./".');
    } else add('start-url-reachable', 'start_url is reachable', 'pass', `${new URL(startUrl).pathname} loads`);
    if (typeof m.id !== 'string') add('id', 'App id', 'info', 'no "id": browsers use start_url, so changing start_url later creates a second app', 'Add "id": "./" (or any stable path).');
    else add('id', 'App id', 'pass', `id ${m.id}`);

    // Colors.
    for (const key of ['theme_color', 'background_color'] as const) {
      const v = m[key];
      if (typeof v !== 'string') add(key, key, 'warn', `no ${key}`, key === 'theme_color' ? 'Add "theme_color" to color the title bar.' : 'Add "background_color" for the splash screen.');
      else if (!parseColor(v)) add(key, key, 'error', `${key} "${v}" is not a valid CSS color`, 'Use a color like "#2563eb".');
      else add(key, key, 'pass', v);
    }
    if (typeof m.description !== 'string' || !m.description) add('description', 'Description', 'info', 'no description', 'Add a "description": app stores and some install dialogs show it.');

    // Icons.
    const icons = iconList(m);
    const anyIcons = icons.filter((i) => i.purpose.includes('any'));
    const pngLike = (i: IconInfo): boolean => !i.type || i.type === 'image/png' || /\.png($|\?)/i.test(i.src) || i.type === 'image/webp';
    const has192 = anyIcons.some((i) => hasSize(i, 192) && (pngLike(i) || i.sizes.includes('any')));
    const has512 = anyIcons.some((i) => hasSize(i, 512) && (pngLike(i) || i.sizes.includes('any')));
    if (!icons.length) add('icons', 'Icons 192 and 512', 'error', 'the manifest lists no icons', 'Run "npx installkite init --icon logo.png" to generate a full icon set.');
    else if (!has192 || !has512) add('icons', 'Icons 192 and 512', 'error', `missing a ${!has192 ? '192x192' : '512x512'} icon with purpose "any"`, 'Add 192x192 and 512x512 PNG icons (installkite generates both).');
    else add('icons', 'Icons 192 and 512', 'pass', `${icons.length} icons`);
    if (icons.some((i) => i.purpose.includes('any') && i.purpose.includes('maskable'))) {
      add('purpose', 'Separate maskable icons', 'warn', 'an icon is marked "any maskable": as "any" it looks too small, as "maskable" it may be cropped', 'Use separate files: regular icons with "any" and padded ones with "maskable".');
    }
    const maskable = icons.filter((i) => i.purpose.includes('maskable'));
    if (!maskable.length) add('maskable', 'Maskable icon', 'warn', 'no maskable icon, so Android shows your icon shrunk on a white circle', 'Add a maskable icon with the artwork inside the center 80% (installkite generates maskable-192.png and maskable-512.png).');

    // Check icon files: exist, real size matches.
    let broken = 0;
    let unreadable: Resource | null = null;
    for (const i of icons.slice(0, 24)) {
      const url = new URL(i.src, manifestUrl).href;
      const res = await ctx.load(url);
      if (res?.blocked) {
        unreadable ??= res;
        continue;
      }
      if (!res || res.status >= 400) {
        broken++;
        add('icon-file', 'Icon files load', 'error', `${i.src} returned ${res ? `HTTP ${res.status}` : 'no response'}`, 'Fix the icon path in the manifest (paths are relative to the manifest file).');
        continue;
      }
      const declared = i.sizes.find((s) => s !== 'any');
      if (isPng(res.bytes)) {
        const real = readPngSize(res.bytes);
        if (declared && declared !== `${real.width}x${real.height}`) {
          add('icon-size', 'Icon sizes match', 'warn', `${i.src} says ${declared} but is ${real.width}x${real.height}`, 'Regenerate the icons or fix "sizes".');
        }
        if (i.purpose.includes('maskable') && real.width <= 1024) {
          const img = await pixels(res.bytes);
          if (img) {
            const corners = [0, img.width - 1, (img.height - 1) * img.width, img.height * img.width - 1];
            if (corners.some((p) => img.data[p * 4 + 3]! < 250)) {
              add('maskable-opaque', 'Maskable icon is full bleed', 'warn', `${i.src} has transparent corners, which launchers fill with a color you do not control`, 'Give maskable icons an opaque background that reaches every edge.');
            }
          }
        }
      } else if (/svg/.test(res.contentType) || /<svg[\s>]/.test(text(res).slice(0, 500))) {
        try {
          parseXml(text(res));
        } catch {
          add('icon-file', 'Icon files load', 'error', `${i.src} is not a valid SVG`, 'Fix or regenerate the SVG icon.');
        }
      }
    }
    if (unreadable && !broken) skip('icon-file', 'Icon files load', unreadable);
    else if (icons.length && !broken) add('icon-file', 'Icon files load', 'pass', 'every icon file loads');

    const shots = Array.isArray(m.screenshots) ? (m.screenshots as Array<Record<string, unknown>>) : [];
    if (!shots.length) add('screenshots', 'Screenshots', 'info', 'no screenshots, so Chrome shows the basic install dialog', 'Add a "wide" and a "narrow" screenshot for the richer install dialog.');
    else {
      const placeholders = ctx.config?.placeholders ?? {};
      let still = 0;
      let blocked: Resource | null = null;
      let missing = false;
      for (const s of shots) {
        if (typeof s.src !== 'string') continue;
        const res = await ctx.load(new URL(s.src, manifestUrl).href);
        if (res?.blocked) {
          blocked ??= res;
          continue;
        }
        if (!res || res.status >= 400) {
          missing = true;
          add('screenshots', 'Screenshots', 'warn', `${s.src} does not load`, 'Fix the screenshot path.');
          continue;
        }
        const key = Object.keys(placeholders).find((k) => s.src === k || String(s.src).endsWith(k));
        if (key && ctx.revision) {
          if (ctx.revision(res.bytes) === placeholders[key]) still++;
        }
      }
      if (still) add('screenshots', 'Screenshots', 'warn', `${still} screenshot${still > 1 ? 's are' : ' is'} still the installkite placeholder`, 'Replace the screenshot files with real captures of your app (same file names and sizes).');
      else if (blocked && !missing) skip('screenshots', 'Screenshots', blocked);
      else if (!missing) add('screenshots', 'Screenshots', 'pass', `${shots.length} screenshots`);
    }
  }

  // Head tags.
  add('theme-color-meta', 'theme-color meta tag', meta.themeColor ? 'pass' : 'info', meta.themeColor ? meta.themeColor : 'no <meta name="theme-color"> on the page', 'Add <meta name="theme-color" content="#2563eb"> to color the browser toolbar before install.');
  const apple = meta.icons.find((i) => i.rel.startsWith('apple-touch-icon'));
  if (!apple) {
    add('apple-touch-icon', 'apple-touch-icon', 'warn', 'no apple-touch-icon, so iOS uses a screenshot of the page as the home screen icon', 'Add <link rel="apple-touch-icon" href="apple-touch-icon.png"> with a 180x180 opaque PNG.');
  } else {
    const res = await ctx.load(new URL(apple.href, pageRes.url).href);
    if (res?.blocked) skip('apple-touch-icon', 'apple-touch-icon', res);
    else if (!res || res.status >= 400) add('apple-touch-icon', 'apple-touch-icon', 'warn', `${apple.href} does not load`, 'Fix the apple-touch-icon path.');
    else if (isPng(res.bytes)) {
      const size = readPngSize(res.bytes);
      const img = await pixels(res.bytes);
      const transparent = !!img && img.data.some((v, idx) => idx % 4 === 3 && v < 255);
      if (size.width < 180) add('apple-touch-icon', 'apple-touch-icon', 'warn', `${size.width}x${size.height} is smaller than 180x180`, 'Use a 180x180 PNG.');
      else if (transparent) add('apple-touch-icon', 'apple-touch-icon', 'warn', 'it has transparent pixels, which iOS fills with black', 'Use an opaque PNG with a background color.');
      else add('apple-touch-icon', 'apple-touch-icon', 'pass', `${size.width}x${size.height}${img ? ', opaque' : ''}`);
    } else add('apple-touch-icon', 'apple-touch-icon', 'warn', 'it is not a PNG', 'Use a 180x180 PNG.');
  }
  const favLink = meta.icons.find((i) => i.rel === 'icon' || i.rel === 'shortcut icon');
  if (favLink) add('favicon', 'Favicon', 'pass', favLink.href);
  else {
    const ico = await ctx.load(new URL('/favicon.ico', page.origin).href);
    if (ico?.blocked) skip('favicon', 'Favicon', ico);
    else if (ico && ico.status < 400) {
      try {
        add('favicon', 'Favicon', 'pass', `/favicon.ico with ${readIcoSizes(ico.bytes).join(', ')} px images`);
      } catch {
        add('favicon', 'Favicon', 'info', '/favicon.ico is not a valid icon file', 'Regenerate the favicon.');
      }
    } else add('favicon', 'Favicon', 'info', 'no favicon', 'Add <link rel="icon" href="favicon.ico" sizes="48x48">.');
  }

  // Service worker.
  const sw = findServiceWorker(html, pageRes.url);
  let swSource = '';
  if (!sw) {
    add('sw-registered', 'Service worker registered', 'error', 'the start page does not register a service worker', 'Add <script src="installkite.js" defer></script> (installkite init does this), or call navigator.serviceWorker.register("sw.js").');
  } else {
    add('sw-registered', 'Service worker registered', 'pass', `via ${sw.via}`);
    const res = await ctx.load(sw.url);
    if (res?.blocked) skip('sw-fetch', 'Service worker file loads', res);
    else if (!res || res.status >= 400) {
      add('sw-fetch', 'Service worker file loads', 'error', `${sw.url} returned ${res ? `HTTP ${res.status}` : 'no response'}`, 'Deploy sw.js next to installkite.js (or set data-sw on the script tag).');
    } else {
      swSource = text(res);
      if (!local && res.contentType && !/javascript|ecmascript/.test(res.contentType)) {
        add('sw-fetch', 'Service worker file loads', 'error', `served as ${res.contentType}; browsers only register JavaScript`, 'Serve sw.js with a JavaScript content type.');
      } else add('sw-fetch', 'Service worker file loads', 'pass', new URL(sw.url).pathname);
      const swScope = new URL('.', sw.url).href;
      const allowed = res.headers['service-worker-allowed'];
      const effective = allowed ? new URL(allowed, sw.url).href : swScope;
      if (!withinScope(startUrl, effective)) {
        add('sw-scope', 'Service worker controls start_url', 'error', `sw.js at ${new URL(swScope).pathname} cannot control ${new URL(startUrl).pathname}`, 'Move sw.js to the site root (or a parent folder of start_url), or send a Service-Worker-Allowed header.');
      } else add('sw-scope', 'Service worker controls start_url', 'pass', `scope ${new URL(effective).pathname}`);
      const handlesFetch = /addEventListener\s*\(\s*['"]fetch['"]|onfetch\s*=|__INSTALLKITE__/.test(swSource);
      add('sw-fetch-handler', 'Works offline', handlesFetch ? 'pass' : 'error', handlesFetch ? 'the service worker handles fetch events' : 'the service worker has no fetch handler, so nothing works offline', 'Use the installkite service worker, or add a fetch handler that serves cached pages.');
    }
  }

  // installkite specifics: offline page and precache freshness.
  const settings = swSource ? readSwSettings(swSource) : null;
  if (settings && sw) {
    const swBase = new URL('.', sw.url).href;
    const precached = new Set(settings.precache.map(([u]) => new URL(u, swBase).href));
    const offline = settings.offline === undefined ? 'offline.html' : (settings.offline as string | null);
    if (offline === null) add('offline-page', 'Offline page', 'info', 'the offline page is turned off', 'Set "sw.offline" to "offline.html" in the config to show a friendly page offline.');
    else {
      const offUrl = new URL(offline, swBase).href;
      const res = await ctx.load(offUrl);
      if (res?.blocked) skip('offline-page', 'Offline page', res);
      else if (!res || res.status >= 400) add('offline-page', 'Offline page', 'warn', `${offline} is missing`, 'Run "npx installkite init" again to write offline.html.');
      else if (!precached.has(offUrl)) add('offline-page', 'Offline page', 'warn', `${offline} exists but is not precached`, 'Run "npx installkite build".');
      else add('offline-page', 'Offline page', 'pass', `${offline} is precached`);
    }
    const startPlain = new URL(startUrl);
    startPlain.search = '';
    startPlain.hash = '';
    const startCandidates = [startPlain.href, startPlain.href.endsWith('/') ? `${startPlain.href}index.html` : `${startPlain.href}.html`];
    add(
      'start-url-precached',
      'start_url works offline',
      startCandidates.some((c) => precached.has(c)) ? 'pass' : 'warn',
      startCandidates.some((c) => precached.has(c)) ? 'the start page is precached' : 'the start page is not precached, so the app cannot open offline on first launch',
      'Make sure the start page matches the precache include globs, then run "npx installkite build".',
    );
    const fresh = ctx.freshness?.(new Map(settings.precache));
    if (fresh) {
      if (fresh.stale.length || fresh.gone.length) {
        const sample = [...fresh.stale, ...fresh.gone].slice(0, 3).join(', ');
        add('precache-fresh', 'Precache list is current', 'error', `${fresh.stale.length} changed or new and ${fresh.gone.length} removed files since sw.js was generated (${sample})`, 'Run "npx installkite build" after every site build (add it to your build script or CI).');
      } else add('precache-fresh', 'Precache list is current', 'pass', `${fresh.count} files, hashes match`);
    }
  }

  return summarize(page.href, ctx.mode, checks);
}

function summarize(url: string, mode: 'local' | 'remote', checks: Check[]): DoctorReport {
  const errors = checks.filter((c) => c.status === 'error').length;
  const warnings = checks.filter((c) => c.status === 'warn').length;
  const skipped = checks.filter((c) => c.status === 'skip').length;
  const offlineIds = new Set(['sw-registered', 'sw-fetch', 'sw-scope', 'sw-fetch-handler', 'page']);
  return {
    url,
    mode,
    checks,
    errors,
    warnings,
    skipped,
    installable: errors === 0 && skipped === 0,
    offlineReady: !checks.some((c) => offlineIds.has(c.id) && c.status === 'error') && checks.some((c) => c.id === 'sw-fetch-handler' && c.status === 'pass'),
  };
}

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|[^/]+\.localhost)(:\d+)?$/i;

/**
 * Turns what people paste into a site URL: trims spaces, quotes and angle
 * brackets, drops a view-source: prefix and adds https:// (http:// for
 * localhost) when the scheme is missing. Throws with a plain message when
 * it cannot be a website address.
 */
export function normalizeSiteUrl(input: string): string {
  let v = input.trim().replace(/^[<"'`]+|[>"'`]+$/g, '').trim();
  v = v.replace(/^view-source:/i, '');
  if (!v) throw new Error('type the address of a website, like example.com');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) {
    if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(v)) throw new Error(`"${v}" is not a website address: use one that starts with https://`);
    const host = v.replace(/^\/+/, '').split(/[/?#]/)[0]!;
    v = `${LOCAL.test(host) ? 'http' : 'https'}://${v.replace(/^\/+/, '')}`;
  }
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`"${input.trim()}" is not a valid address`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`"${input.trim()}" is not a website address: use one that starts with https://`);
  if (!u.hostname.includes('.') && !LOCAL.test(u.host) && !/^\[.*\]$/.test(u.hostname)) throw new Error(`"${u.hostname}" is not a full domain name, like example.com`);
  u.hash = '';
  return u.href;
}
