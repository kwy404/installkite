// Shared test helpers: temporary sites, an in-memory Cache Storage and a
// scripted fetch.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createImage, encodePng, type RGBAImage } from '../src/core/png.js';

const made: string[] = [];

/** Creates a temporary folder with the given files (string or bytes). */
export function tempSite(files: Record<string, string | Uint8Array> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'installkite-test-'));
  made.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const abs = join(dir, path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return dir;
}

export function cleanupTemp(): void {
  while (made.length) rmSync(made.pop()!, { recursive: true, force: true });
}

export const PAGE = (title = 'Acme Bakery', extraHead = ''): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="Bread, cakes and coffee.">${extraHead}
</head>
<body>
  <header><nav><a href="./">Home</a> <a href="menu.html">Menu</a> <a href="blog/">Blog</a></nav></header>
  <main><h1>${title}</h1></main>
</body>
</html>
`;

export const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#e8590c"/><path d="M30 60 Q50 20 70 60 Z" fill="#fff"/></svg>';

/** A PNG logo: a colored disc of radius r (fraction of size) on transparency. */
export function discPng(size = 512, r = 0.45, color: [number, number, number] = [37, 99, 235]): Uint8Array {
  return encodePng(disc(size, r, color));
}

export function disc(size: number, r: number, color: [number, number, number]): RGBAImage {
  const img = createImage(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= r * size) {
        const o = (y * size + x) * 4;
        img.data[o] = color[0];
        img.data[o + 1] = color[1];
        img.data[o + 2] = color[2];
        img.data[o + 3] = 255;
      }
    }
  }
  return img;
}

/** Pixel at (x, y) as [r, g, b, a]. */
export function px(img: RGBAImage, x: number, y: number): number[] {
  const o = (y * img.width + x) * 4;
  return [img.data[o]!, img.data[o + 1]!, img.data[o + 2]!, img.data[o + 3]!];
}

/** Fraction of pixels with alpha above a threshold. */
export function coverageOf(img: RGBAImage, threshold = 127): number {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i]! > threshold) n++;
  return n / (img.width * img.height);
}

// ---------- Cache Storage mock ----------

const keyOf = (req: RequestInfo | URL): string => (typeof req === 'string' ? req : req instanceof URL ? req.href : req.url);

export class MemoryCache {
  entries = new Map<string, Response>();

  async match(req: RequestInfo | URL, opts?: CacheQueryOptions): Promise<Response | undefined> {
    const key = keyOf(req);
    let hit = this.entries.get(key);
    if (!hit && opts?.ignoreSearch) {
      const plain = key.replace(/\?.*$/, '');
      for (const [k, v] of this.entries) if (k.replace(/\?.*$/, '') === plain) hit = v;
    }
    return hit ? hit.clone() : undefined;
  }

  async put(req: RequestInfo | URL, res: Response): Promise<void> {
    const key = keyOf(req);
    this.entries.delete(key);
    this.entries.set(key, res);
  }

  async delete(req: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(keyOf(req));
  }

  async keys(): Promise<Request[]> {
    return [...this.entries.keys()].map((k) => new Request(k));
  }
}

export class MemoryCacheStorage {
  caches = new Map<string, MemoryCache>();

  async open(name: string): Promise<MemoryCache> {
    let c = this.caches.get(name);
    if (!c) {
      c = new MemoryCache();
      this.caches.set(name, c);
    }
    return c;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }

  async has(name: string): Promise<boolean> {
    return this.caches.has(name);
  }

  async match(req: RequestInfo | URL): Promise<Response | undefined> {
    for (const c of this.caches.values()) {
      const hit = await c.match(req);
      if (hit) return hit;
    }
    return undefined;
  }
}

export interface Route {
  status?: number;
  body?: string;
  type?: string;
  delay?: number;
  fail?: boolean;
}

/** A fetch that serves scripted routes and records every call. */
export function scriptedFetch(routes: Record<string, Route | ((n: number) => Route)>) {
  const calls: string[] = [];
  const counts = new Map<string, number>();
  const fetch = async (input: Request | string): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    const n = (counts.get(url) ?? 0) + 1;
    counts.set(url, n);
    const r = routes[url];
    const route = typeof r === 'function' ? r(n) : r;
    if (route?.delay) await new Promise((res) => setTimeout(res, route.delay));
    if (!route || route.fail) throw new TypeError('Failed to fetch');
    return new Response(route.body ?? '', { status: route.status ?? 200, headers: { 'content-type': route.type ?? 'text/html' } });
  };
  return { fetch, calls, count: (url: string) => counts.get(url) ?? 0 };
}
