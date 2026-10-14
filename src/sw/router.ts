// The service worker logic, written against injected dependencies (caches,
// fetch, timers) so every strategy can be unit tested with mocks.
//
// Strategies:
//   precached files     cache first from the versioned precache
//   page navigations    network first with a timeout, then the cached page, then the offline page
//   scripts, styles,    stale while revalidate, capped
//   fonts
//   images              cache first with an entry cap and a max age
//   everything else     not handled (the browser does its normal fetch)

export interface SwConfig {
  /** Version of the precache list; names the precache cache. */
  version: string;
  /** [url relative to the service worker, revision] pairs. */
  precache: Array<[string, string]>;
  /** Offline fallback page relative to the service worker, or null. */
  offline: string | null;
  /** Milliseconds to wait for the network on navigations before using the cache. */
  navigationTimeout: number;
  imageMaxEntries: number;
  /** Max age of cached images in seconds. */
  imageMaxAge: number;
  assetMaxEntries: number;
  pageMaxEntries: number;
  /** Path prefixes (relative to the scope) or /regex/ strings that are never handled. */
  exclude: string[];
  /** Other origins whose scripts, styles and fonts are cached (CDNs, font hosts). */
  crossOrigin: string[];
  /** Cache name prefix. */
  prefix: string;
}

export const DEFAULT_SW_CONFIG: Omit<SwConfig, 'version' | 'precache'> = {
  offline: 'offline.html',
  navigationTimeout: 3000,
  imageMaxEntries: 60,
  imageMaxAge: 30 * 24 * 3600,
  assetMaxEntries: 120,
  pageMaxEntries: 50,
  exclude: [],
  crossOrigin: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://cdnjs.cloudflare.com'],
  prefix: 'installkite',
};

export interface SwEnv {
  caches: CacheStorage;
  fetch: (input: Request | string, init?: RequestInit) => Promise<Response>;
  /** The registration scope, an absolute URL ending in "/". */
  scope: string;
  now?: () => number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (id: unknown) => void;
}

export type Route = 'precache' | 'navigate' | 'asset' | 'image' | 'none';

export interface HandleOptions {
  /** Keeps the worker alive for background work (event.waitUntil). */
  waitUntil?: (p: Promise<unknown>) => void;
  /** Navigation preload response (event.preloadResponse). */
  preloadResponse?: Promise<Response | undefined>;
}

const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i;
const ASSET_EXT = /\.(?:css|m?js|woff2?|ttf|otf|eot|json|webmanifest|wasm)$/i;
const TIME_HEADER = 'x-installkite-time';
const TIMEOUT = Symbol('timeout');
const FAILED = Symbol('failed');

export function cacheNames(config: Pick<SwConfig, 'prefix' | 'version'>): { precache: string; pages: string; assets: string; images: string } {
  return {
    precache: `${config.prefix}-precache-${config.version}`,
    pages: `${config.prefix}-pages`,
    assets: `${config.prefix}-assets`,
    images: `${config.prefix}-images`,
  };
}

/** URL of the stored revision list inside a precache cache. */
export function revisionsUrl(scope: string): string {
  return new URL('__installkite/revisions.json', scope).href;
}

/** Strips the hash; keeps the query. */
function clean(url: string): string {
  const u = new URL(url);
  u.hash = '';
  return u.href;
}

/** True when a path (relative to the scope) is excluded by a prefix or /regex/ rule. */
export function isExcluded(url: URL, scope: string, rules: readonly string[]): boolean {
  const scopePath = new URL(scope).pathname;
  const path = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname;
  return rules.some((r) => {
    const m = /^\/(.+)\/([a-z]*)$/.exec(r);
    if (m) {
      try {
        return new RegExp(m[1]!, m[2]).test(path) || new RegExp(m[1]!, m[2]).test(url.pathname);
      } catch {
        return false;
      }
    }
    const rule = r.replace(/^\.?\//, '');
    return path.startsWith(rule) || url.pathname.startsWith(r);
  });
}

/** Decides which strategy handles a request. */
export function classify(request: Request, config: SwConfig, scope: string, precached: ReadonlySet<string>): Route {
  if (request.method !== 'GET') return 'none';
  if (request.headers.has('range')) return 'none';
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return 'none';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'none';
  const scopeUrl = new URL(scope);
  const sameOrigin = url.origin === scopeUrl.origin;
  if (sameOrigin && isExcluded(url, scope, config.exclude)) return 'none';
  if (sameOrigin && url.pathname.startsWith(`${scopeUrl.pathname}__installkite/`)) return 'none';
  const plain = new URL(url.href);
  plain.hash = '';
  plain.search = '';
  const navigate = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (sameOrigin && precached.has(plain.href) && (!url.search || navigate)) return navigate ? 'navigate' : 'precache';
  if (navigate) return sameOrigin && url.pathname.startsWith(scopeUrl.pathname) ? 'navigate' : 'none';
  const dest = request.destination;
  if (dest === 'image' || (dest === '' && IMAGE_EXT.test(url.pathname))) return sameOrigin || url.protocol === 'https:' ? 'image' : 'none';
  const assetLike = dest === 'script' || dest === 'style' || dest === 'font' || dest === 'worker' || dest === 'manifest' || (dest === '' && ASSET_EXT.test(url.pathname));
  if (assetLike && (sameOrigin || config.crossOrigin.includes(url.origin))) return 'asset';
  return 'none';
}

/** Candidate cache keys for a page URL: the URL, folder index files and .html variants. */
export function pageCandidates(href: string): string[] {
  const u = new URL(href);
  u.hash = '';
  const out = new Set<string>();
  out.add(u.href);
  u.search = '';
  out.add(u.href);
  const p = u.pathname;
  const variant = (path: string): void => {
    const v = new URL(u.href);
    v.pathname = path;
    out.add(v.href);
  };
  if (p.endsWith('/')) {
    variant(`${p}index.html`);
  } else if (p.endsWith('/index.html')) {
    variant(p.slice(0, -'index.html'.length));
  } else if (p.endsWith('.html')) {
    variant(p.slice(0, -'.html'.length));
  } else {
    variant(`${p}/`);
    variant(`${p}/index.html`);
    variant(`${p}.html`);
  }
  return [...out];
}

/** Copies a response so it can be cached as a navigation result (no redirected flag). */
async function cleanResponse(res: Response, extraHeaders?: Record<string, string>): Promise<Response> {
  if (!res.redirected && !extraHeaders) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extraHeaders ?? {})) headers.set(k, v);
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

async function limit<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const worker = async (): Promise<void> => {
    while (i < items.length) await fn(items[i++]!);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

export interface Router {
  names: ReturnType<typeof cacheNames>;
  precached: Set<string>;
  install(): Promise<{ fetched: number; reused: number }>;
  activate(): Promise<string[]>;
  route(request: Request): Route;
  /** A response promise, or null to let the browser handle the request. */
  handle(request: Request, opts?: HandleOptions): Promise<Response> | null;
  /** Adds pages to the runtime page cache (for "save for offline" buttons). */
  cacheUrls(urls: string[]): Promise<number>;
}

export function createRouter(config: SwConfig, env: SwEnv): Router {
  const names = cacheNames(config);
  const now = env.now ?? (() => Date.now());
  const setT = env.setTimeout ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearT = env.clearTimeout ?? ((id: unknown) => clearTimeout(id as ReturnType<typeof setTimeout>));
  const abs = (u: string): string => new URL(u, env.scope).href;
  const precached = new Set(config.precache.map(([u]) => abs(u)));
  const offlineUrl = config.offline ? abs(config.offline) : null;

  async function install(): Promise<{ fetched: number; reused: number }> {
    const cache = await env.caches.open(names.precache);
    // Revisions already downloaded by an older version, for reuse.
    const old: Array<{ cache: Cache; revs: Record<string, string> }> = [];
    for (const name of await env.caches.keys()) {
      if (!name.startsWith(`${config.prefix}-precache-`) || name === names.precache) continue;
      const c = await env.caches.open(name);
      const meta = await c.match(revisionsUrl(env.scope));
      if (!meta) continue;
      try {
        old.push({ cache: c, revs: (await meta.json()) as Record<string, string> });
      } catch {
        // ignore a broken revision list
      }
    }
    let fetched = 0;
    let reused = 0;
    const revs: Record<string, string> = {};
    await limit(config.precache, 6, async ([url, rev]) => {
      const href = abs(url);
      revs[href] = rev;
      for (const o of old) {
        if (o.revs[href] !== rev) continue;
        const hit = await o.cache.match(href);
        if (hit) {
          await cache.put(href, hit);
          reused++;
          return;
        }
      }
      const res = await env.fetch(new Request(href, { cache: 'reload', credentials: 'same-origin' }));
      if (!res.ok) throw new Error(`installkite: precaching ${url} failed with HTTP ${res.status}`);
      await cache.put(href, await cleanResponse(res));
      fetched++;
    });
    await cache.put(revisionsUrl(env.scope), new Response(JSON.stringify(revs), { headers: { 'content-type': 'application/json' } }));
    return { fetched, reused };
  }

  async function activate(): Promise<string[]> {
    const deleted: string[] = [];
    for (const name of await env.caches.keys()) {
      if (name.startsWith(`${config.prefix}-precache-`) && name !== names.precache) {
        await env.caches.delete(name);
        deleted.push(name);
      }
    }
    return deleted;
  }

  async function trim(cacheName: string, max: number): Promise<void> {
    const cache = await env.caches.open(cacheName);
    const keys = await cache.keys();
    // Keys come back in insertion order: drop the oldest first.
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]!);
  }

  async function fromPrecache(href: string): Promise<Response | undefined> {
    const cache = await env.caches.open(names.precache);
    return cache.match(href);
  }

  async function cachedPage(href: string): Promise<Response | undefined> {
    const pages = await env.caches.open(names.pages);
    const pre = await env.caches.open(names.precache);
    for (const c of pageCandidates(href)) {
      const hit = (await pages.match(c)) || (await pre.match(c));
      if (hit) return hit;
    }
    return undefined;
  }

  async function offline(): Promise<Response> {
    if (offlineUrl) {
      const hit = await fromPrecache(offlineUrl);
      if (hit) return hit;
    }
    return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline.</p>', {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  async function navigate(request: Request, opts: HandleOptions): Promise<Response> {
    const keep = opts.waitUntil ?? (() => undefined);
    const network = (async (): Promise<Response> => {
      const preloaded = opts.preloadResponse ? await opts.preloadResponse.catch(() => undefined) : undefined;
      const res = preloaded ?? (await env.fetch(request));
      if (res.ok && (res.type === 'basic' || res.type === 'default')) {
        const copy = await cleanResponse(res.clone());
        const pages = await env.caches.open(names.pages);
        await pages.put(clean(request.url), copy);
        keep(trim(names.pages, config.pageMaxEntries));
      }
      return res;
    })();
    let timer: unknown;
    const timeout = new Promise<typeof TIMEOUT>((resolve) => {
      timer = setT(() => resolve(TIMEOUT), config.navigationTimeout);
    });
    const first = await Promise.race([network.catch(() => FAILED), timeout]);
    clearT(timer);
    if (typeof first !== 'symbol') return first;
    const cached = await cachedPage(request.url);
    if (cached) {
      // Let the slow request finish and refresh the cache in the background.
      if (first === TIMEOUT) keep(network.catch(() => undefined));
      return cached;
    }
    if (first === TIMEOUT) {
      try {
        return await network;
      } catch {
        // fall through to the offline page
      }
    }
    return offline();
  }

  async function staleWhileRevalidate(request: Request, opts: HandleOptions): Promise<Response> {
    const cache = await env.caches.open(names.assets);
    const key = clean(request.url);
    const cached = await cache.match(key);
    const update = env.fetch(request).then(async (res) => {
      if (res.ok || res.type === 'opaque') {
        await cache.put(key, res.clone());
        await trim(names.assets, config.assetMaxEntries);
      }
      return res;
    });
    if (cached) {
      (opts.waitUntil ?? (() => undefined))(update.catch(() => undefined));
      return cached;
    }
    return update;
  }

  async function cacheFirstImage(request: Request, opts: HandleOptions): Promise<Response> {
    const cache = await env.caches.open(names.images);
    const key = clean(request.url);
    const cached = await cache.match(key);
    if (cached) {
      const t = Number(cached.headers.get(TIME_HEADER));
      if (!t || now() - t <= config.imageMaxAge * 1000) return cached;
      await cache.delete(key);
    }
    try {
      const res = await env.fetch(request);
      if (res.ok && res.status === 200) {
        const stamped = await cleanResponse(res.clone(), { [TIME_HEADER]: String(now()) });
        const work = cache.put(key, stamped).then(() => trim(names.images, config.imageMaxEntries));
        if (opts.waitUntil) opts.waitUntil(work);
        else await work;
      }
      return res;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  }

  async function precache(request: Request): Promise<Response> {
    const href = clean(request.url).replace(/\?.*$/, '');
    const hit = await fromPrecache(href);
    if (hit) return hit;
    return env.fetch(request);
  }

  function route(request: Request): Route {
    return classify(request, config, env.scope, precached);
  }

  function handle(request: Request, opts: HandleOptions = {}): Promise<Response> | null {
    switch (route(request)) {
      case 'precache':
        return precache(request);
      case 'navigate':
        return navigate(request, opts);
      case 'asset':
        return staleWhileRevalidate(request, opts);
      case 'image':
        return cacheFirstImage(request, opts);
      default:
        return null;
    }
  }

  async function cacheUrls(urls: string[]): Promise<number> {
    const pages = await env.caches.open(names.pages);
    let n = 0;
    for (const u of urls) {
      try {
        const href = abs(u);
        if (new URL(href).origin !== new URL(env.scope).origin) continue;
        const res = await env.fetch(new Request(href, { credentials: 'same-origin' }));
        if (!res.ok) continue;
        await pages.put(clean(href), await cleanResponse(res));
        n++;
      } catch {
        // skip pages that fail
      }
    }
    await trim(names.pages, Math.max(config.pageMaxEntries, n));
    return n;
  }

  return { names, precached, install, activate, route, handle, cacheUrls };
}
