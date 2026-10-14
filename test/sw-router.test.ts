import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SW_CONFIG, cacheNames, classify, createRouter, isExcluded, pageCandidates, revisionsUrl, type SwConfig } from '../src/sw/router.js';
import { generateServiceWorker } from '../src/core/sw.js';
import { MemoryCacheStorage, scriptedFetch, type Route } from './helpers.js';

const SCOPE = 'https://example.com/app/';
const U = (p: string): string => new URL(p, SCOPE).href;

function config(over: Partial<SwConfig> = {}): SwConfig {
  return {
    ...DEFAULT_SW_CONFIG,
    version: 'v1',
    precache: [
      ['index.html', 'r1'],
      ['about/index.html', 'r2'],
      ['app.js', 'r3'],
      ['offline.html', 'r4'],
    ],
    ...over,
  };
}

function setup(routes: Record<string, Route | ((n: number) => Route)>, over: Partial<SwConfig> = {}, now = () => 1000) {
  const caches = new MemoryCacheStorage();
  const net = scriptedFetch(routes);
  const router = createRouter(config(over), { caches: caches as unknown as CacheStorage, fetch: net.fetch, scope: SCOPE, now });
  return { caches, net, router };
}

const BASE_ROUTES: Record<string, Route> = {
  [U('index.html')]: { body: 'home v1' },
  [U('about/index.html')]: { body: 'about v1' },
  [U('app.js')]: { body: 'js v1', type: 'text/javascript' },
  [U('offline.html')]: { body: 'offline page' },
};

/** A navigation request (Node's Request refuses mode "navigate", so it is set afterwards). */
const navigation = (url: string): Request => Object.defineProperty(new Request(url, { headers: { accept: 'text/html' } }), 'mode', { value: 'navigate' });
const nav = (path: string): Request => navigation(U(path));
const get = (url: string, init: RequestInit = {}): Request => new Request(url.startsWith('http') ? url : U(url), init);
const body = async (r: Promise<Response> | null): Promise<string> => (await r!).text();

describe('routing', () => {
  const cfg = config({ exclude: ['api/', '/\\.php$/'] });
  const pre = new Set(cfg.precache.map(([u]) => U(u)));
  const route = (r: Request): string => classify(r, cfg, SCOPE, pre);

  it('picks a strategy per request', () => {
    expect(route(nav('about/'))).toBe('navigate');
    expect(route(nav('index.html'))).toBe('navigate');
    expect(route(get('app.js'))).toBe('precache');
    expect(route(get('app.js?v=2'))).toBe('asset');
    expect(route(get('assets/x.css'))).toBe('asset');
    expect(route(get('img/photo.webp'))).toBe('image');
    expect(route(get('https://cdn.jsdelivr.net/npm/x/x.js'))).toBe('asset');
    expect(route(get('https://other.example/x.js'))).toBe('none');
    expect(route(get('https://images.example/a.png'))).toBe('image');
    expect(route(get('data.bin'))).toBe('none');
  });

  it('leaves non GET, range, excluded and foreign navigations to the browser', () => {
    expect(route(get('index.html', { method: 'POST', body: 'x' }))).toBe('none');
    expect(route(get('video.mp4', { headers: { range: 'bytes=0-' } }))).toBe('none');
    expect(route(get('api/users'))).toBe('none');
    expect(route(nav('api/users'))).toBe('none');
    expect(route(get('form.php'))).toBe('none');
    expect(route(navigation('https://example.com/outside/'))).toBe('none');
    expect(route(get(revisionsUrl(SCOPE)))).toBe('none');
    expect(isExcluded(new URL(U('api/x')), SCOPE, ['./api/'])).toBe(true);
    expect(isExcluded(new URL(U('x')), SCOPE, ['/[/'])).toBe(false);
  });

  it('maps page URLs to cached file names', () => {
    expect(pageCandidates(U('about'))).toEqual([U('about'), U('about/'), U('about/index.html'), U('about.html')]);
    expect(pageCandidates(U('about/?q=1#top'))).toEqual([U('about/?q=1'), U('about/'), U('about/index.html')]);
    expect(pageCandidates(U('blog/index.html'))).toContain(U('blog/'));
    expect(pageCandidates(U('post.html'))).toContain(U('post'));
  });

  it('names caches by version', () => {
    expect(cacheNames({ prefix: 'installkite', version: 'abc' })).toEqual({
      precache: 'installkite-precache-abc',
      pages: 'installkite-pages',
      assets: 'installkite-assets',
      images: 'installkite-images',
    });
  });
});

describe('install and activate', () => {
  it('precaches every file with its revision', async () => {
    const { caches, net, router } = setup(BASE_ROUTES);
    expect(await router.install()).toEqual({ fetched: 4, reused: 0 });
    const cache = await caches.open('installkite-precache-v1');
    expect(await (await cache.match(U('about/index.html')))!.text()).toBe('about v1');
    const revs = await (await cache.match(revisionsUrl(SCOPE)))!.json();
    expect(revs[U('app.js')]).toBe('r3');
    expect(net.count(U('index.html'))).toBe(1);
  });

  it('reuses unchanged files from the previous version and fetches only changed ones', async () => {
    const caches = new MemoryCacheStorage();
    const net = scriptedFetch(BASE_ROUTES);
    const env = { caches: caches as unknown as CacheStorage, fetch: net.fetch, scope: SCOPE };
    await createRouter(config(), env).install();
    const v2 = config({ version: 'v2', precache: [['index.html', 'r1'], ['about/index.html', 'CHANGED'], ['app.js', 'r3'], ['offline.html', 'r4']] });
    const router2 = createRouter(v2, env);
    expect(await router2.install()).toEqual({ fetched: 1, reused: 3 });
    expect(net.count(U('about/index.html'))).toBe(2);
    expect(await router2.activate()).toEqual(['installkite-precache-v1']);
    expect(await caches.keys()).toEqual(['installkite-precache-v2']);
  });

  it('fails the install when a file is missing, keeping the old worker', async () => {
    const { router } = setup({ ...BASE_ROUTES, [U('app.js')]: { status: 404 } });
    await expect(router.install()).rejects.toThrow(/app\.js failed with HTTP 404/);
  });
});

describe('strategies', () => {
  it('serves precached assets from the cache, without the network', async () => {
    const { net, router } = setup(BASE_ROUTES);
    await router.install();
    expect(await body(router.handle(get('app.js')))).toBe('js v1');
    expect(net.count(U('app.js'))).toBe(1);
  });

  it('navigations go to the network first and refresh the page cache', async () => {
    let n = 0;
    const { caches, router } = setup({ ...BASE_ROUTES, [U('about/')]: () => ({ body: `about live ${++n}` }) });
    await router.install();
    expect(await body(router.handle(nav('about/')))).toBe('about live 1');
    const pages = await caches.open('installkite-pages');
    expect(await (await pages.match(U('about/')))!.text()).toBe('about live 1');
  });

  it('navigations fall back to the cached page, then the offline page', async () => {
    const { router } = setup({ ...BASE_ROUTES, [U('about/')]: { fail: true }, [U('missing/')]: { fail: true } });
    await router.install();
    // about/ is precached as about/index.html.
    expect(await body(router.handle(nav('about/')))).toBe('about v1');
    expect(await body(router.handle(nav('missing/')))).toBe('offline page');
  });

  it('a slow network times out to the cache and keeps updating in the background', async () => {
    const waits: Promise<unknown>[] = [];
    const { caches, router } = setup({ ...BASE_ROUTES, [U('about/')]: { body: 'about slow', delay: 120 } }, { navigationTimeout: 20 });
    await router.install();
    const res = router.handle(nav('about/'), { waitUntil: (p) => waits.push(p) });
    expect(await body(res)).toBe('about v1');
    await Promise.all(waits);
    const pages = await caches.open('installkite-pages');
    expect(await (await pages.match(U('about/')))!.text()).toBe('about slow');
  });

  it('a slow network with nothing cached waits for the network', async () => {
    const { router } = setup({ ...BASE_ROUTES, [U('new/')]: { body: 'new page', delay: 60 } }, { navigationTimeout: 10 });
    await router.install();
    expect(await body(router.handle(nav('new/')))).toBe('new page');
  });

  it('serves a built in offline response when even the offline page is missing', async () => {
    const { router } = setup({ [U('x/')]: { fail: true } }, { offline: null, precache: [] });
    const res = await router.handle(nav('x/'))!;
    expect(res.status).toBe(503);
    expect(await res.text()).toMatch(/offline/);
  });

  it('does not cache error pages', async () => {
    const { caches, router } = setup({ [U('gone/')]: { status: 404, body: 'nope' } }, { precache: [] });
    const res = await router.handle(nav('gone/'))!;
    expect(res.status).toBe(404);
    expect(await (await caches.open('installkite-pages')).match(U('gone/'))).toBeUndefined();
  });

  it('stale while revalidate for scripts and styles', async () => {
    let v = 0;
    const waits: Promise<unknown>[] = [];
    const { router } = setup({ [U('style.css')]: () => ({ body: `css ${++v}`, type: 'text/css' }) }, { precache: [] });
    expect(await body(router.handle(get('style.css')))).toBe('css 1');
    // Second request: the cached copy right away, the network refreshes it.
    expect(await body(router.handle(get('style.css'), { waitUntil: (p) => waits.push(p) }))).toBe('css 1');
    await Promise.all(waits);
    expect(await body(router.handle(get('style.css'), { waitUntil: (p) => waits.push(p) }))).toBe('css 2');
  });

  it('caps the asset cache', async () => {
    const routes: Record<string, Route> = {};
    for (let i = 0; i < 6; i++) routes[U(`s${i}.js`)] = { body: `s${i}`, type: 'text/javascript' };
    const { caches, router } = setup(routes, { precache: [], assetMaxEntries: 3 });
    for (let i = 0; i < 6; i++) await body(router.handle(get(`s${i}.js`)));
    const keys = (await (await caches.open('installkite-assets')).keys()).map((k) => k.url);
    expect(keys).toEqual([U('s3.js'), U('s4.js'), U('s5.js')]);
  });

  it('cache first for images, with an entry cap and a max age', async () => {
    let clock = 1000;
    const routes: Record<string, Route | ((n: number) => Route)> = {};
    for (let i = 0; i < 4; i++) routes[U(`img/${i}.png`)] = (n) => ({ body: `png ${i} #${n}`, type: 'image/png' });
    const { caches, net, router } = setup(routes, { precache: [], imageMaxEntries: 2, imageMaxAge: 60 }, () => clock);
    expect(await body(router.handle(get('img/0.png')))).toBe('png 0 #1');
    expect(await body(router.handle(get('img/0.png')))).toBe('png 0 #1');
    expect(net.count(U('img/0.png'))).toBe(1);
    // Older than imageMaxAge: fetched again.
    clock += 61_000;
    expect(await body(router.handle(get('img/0.png')))).toBe('png 0 #2');
    for (const i of [1, 2, 3]) await body(router.handle(get(`img/${i}.png`)));
    const keys = (await (await caches.open('installkite-images')).keys()).map((k) => k.url);
    expect(keys).toEqual([U('img/2.png'), U('img/3.png')]);
  });

  it('returns null for requests the browser should handle', () => {
    const { router } = setup({});
    expect(router.handle(get('api.bin'))).toBeNull();
    expect(router.route(get('x.css'))).toBe('asset');
  });

  it('saves pages for offline reading on request', async () => {
    const { caches, router } = setup({ [U('a/')]: { body: 'A' }, [U('b/')]: { status: 500 }, [U('c/')]: { fail: true } }, { precache: [] });
    expect(await router.cacheUrls(['a/', 'b/', 'c/', 'https://elsewhere.example/'])).toBe(1);
    expect(await (await (await caches.open('installkite-pages')).match(U('a/')))!.text()).toBe('A');
  });

  it('uses the navigation preload response when there is one', async () => {
    const { net, router } = setup({}, { precache: [] });
    const res = router.handle(nav('pre/'), { preloadResponse: Promise.resolve(new Response('preloaded')) });
    expect(await body(res)).toBe('preloaded');
    expect(net.calls).toEqual([]);
  });
});

describe('the bundled service worker', () => {
  it('registers its handlers and answers fetch events from a generated sw.js', async () => {
    const runtime = readFileSync(join(__dirname, '..', 'dist', 'sw-runtime.js'), 'utf8');
    const source = generateServiceWorker(
      [
        { url: 'index.html', revision: 'r1' },
        { url: 'offline.html', revision: 'r2' },
      ],
      {},
      { runtime },
    );
    const listeners: Record<string, (e: unknown) => void> = {};
    const caches = new MemoryCacheStorage();
    const net = scriptedFetch({ [U('index.html')]: { body: 'home' }, [U('offline.html')]: { body: 'offline' }, [U('page/')]: { fail: true } });
    let skipped = 0;
    let claimed = 0;
    const self = {
      caches,
      fetch: net.fetch,
      registration: { scope: SCOPE, navigationPreload: { enable: async () => undefined } },
      clients: { claim: async () => void claimed++ },
      skipWaiting: async () => void skipped++,
      addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    };
    runInNewContext(source, { self, URL, Request, Response, Headers, setTimeout, clearTimeout, Promise, JSON, Symbol, Set, Map, Object, Array, Math, Number, String, Error, TypeError });
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'fetch', 'install', 'message']);
    const waits: Promise<unknown>[] = [];
    listeners.install!({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    listeners.activate!({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    expect(claimed).toBe(1);
    let responded: Promise<Response> | undefined;
    listeners.fetch!({ request: nav('page/'), waitUntil: () => undefined, respondWith: (r: Promise<Response>) => (responded = r) });
    expect(await (await responded!).text()).toBe('offline');
    responded = undefined;
    listeners.fetch!({ request: get('api.bin'), waitUntil: () => undefined, respondWith: (r: Promise<Response>) => (responded = r) });
    expect(responded).toBeUndefined();
    const replies: unknown[] = [];
    listeners.message!({ data: { type: 'GET_VERSION' }, ports: [{ postMessage: (m: unknown) => replies.push(m) }], waitUntil: () => undefined });
    listeners.message!({ data: { type: 'SKIP_WAITING' }, ports: [], waitUntil: () => undefined });
    expect(replies[0]).toEqual({ version: expect.stringMatching(/^[0-9a-f]{10}$/) });
    expect(skipped).toBe(1);
  });
});
