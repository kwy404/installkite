// The service worker entry. Bundled into dist/sw-runtime.js and appended to
// every generated sw.js after the line that sets self.__INSTALLKITE__.
import { createRouter, DEFAULT_SW_CONFIG, type SwConfig } from './router.js';

interface ExtendableEvent extends Event {
  waitUntil(p: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
  request: Request;
  preloadResponse?: Promise<Response | undefined>;
  respondWith(r: Promise<Response>): void;
}
interface MessageEventLike extends ExtendableEvent {
  data: { type?: string; urls?: string[] } | null;
  ports: ReadonlyArray<{ postMessage(m: unknown): void }>;
}
interface SwScope {
  __INSTALLKITE__: Partial<SwConfig> & { version: string; precache: Array<[string, string]>; skipWaiting?: boolean };
  caches: CacheStorage;
  fetch: typeof fetch;
  registration: { scope: string; navigationPreload?: { enable(): Promise<void> } };
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: string, fn: (e: never) => void): void;
}

const sw = self as unknown as SwScope;
const settings = sw.__INSTALLKITE__;
const config: SwConfig = { ...DEFAULT_SW_CONFIG, ...settings };
const router = createRouter(config, {
  caches: sw.caches,
  fetch: (input, init) => sw.fetch(input, init),
  scope: sw.registration.scope,
});

sw.addEventListener('install', (e: ExtendableEvent) => {
  e.waitUntil(router.install().then(() => (settings.skipWaiting ? sw.skipWaiting() : undefined)));
});

sw.addEventListener('activate', (e: ExtendableEvent) => {
  e.waitUntil(
    (async () => {
      await router.activate();
      if (sw.registration.navigationPreload) await sw.registration.navigationPreload.enable().catch(() => undefined);
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('fetch', (e: FetchEvent) => {
  const res = router.handle(e.request, {
    waitUntil: (p) => e.waitUntil(p),
    preloadResponse: e.request.mode === 'navigate' ? e.preloadResponse : undefined,
  });
  if (res) e.respondWith(res);
});

sw.addEventListener('message', (e: MessageEventLike) => {
  const data = e.data || {};
  const reply = (m: unknown): void => e.ports[0]?.postMessage(m);
  if (data.type === 'SKIP_WAITING') sw.skipWaiting();
  else if (data.type === 'GET_VERSION') reply({ version: config.version });
  else if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) e.waitUntil(router.cacheUrls(data.urls).then((cached) => reply({ cached })));
});
