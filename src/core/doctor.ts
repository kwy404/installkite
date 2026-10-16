// installkite doctor: audits installability and offline readiness, either
// from the files on disk (before deploying) or from a live URL. Both modes
// share the same rules (audit.ts) through a resource loader.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runDoctor as runAudit, type DoctorContext, type DoctorReport, type Loader } from './audit.js';
import { readConfig, type InstallkiteConfig } from './config.js';
import { decodePng } from './png.js';
import { revisionOf } from './precache.js';
import { precacheFrom } from './project.js';
import { walk } from './files.js';
import { normalizeBase } from './scan.js';

export { blockedMessage, findServiceWorker, normalizeSiteUrl, readSwSettings, withinScope, type Check, type DoctorContext, type DoctorReport, type Loader, type Pixels, type Resource, type Severity, type Status } from './audit.js';

const TYPES: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  js: 'text/javascript',
  mjs: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  png: 'image/png',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
};

/** A loader that serves files from folders like a static host at `origin + base`. */
export function localLoader(dirs: string[], origin: string, base: string): Loader {
  const prefix = new URL(base, origin).pathname;
  return async (url) => {
    const u = new URL(url, origin);
    if (u.origin !== new URL(origin).origin) return null;
    if (!u.pathname.startsWith(prefix)) return { url: u.href, status: 404, contentType: 'text/plain', bytes: new Uint8Array(), headers: {} };
    let rel = decodeURIComponent(u.pathname.slice(prefix.length));
    if (rel.includes('..')) return { url: u.href, status: 403, contentType: 'text/plain', bytes: new Uint8Array(), headers: {} };
    const candidates = rel === '' || rel.endsWith('/') ? [`${rel}index.html`] : [rel, `${rel}.html`, `${rel}/index.html`];
    for (const dir of dirs) {
      for (const c of candidates) {
        const abs = join(dir, c);
        if (existsSync(abs) && statSync(abs).isFile()) {
          rel = c;
          const ext = (/\.([a-z0-9]+)$/i.exec(c)?.[1] || '').toLowerCase();
          return { url: u.href, status: 200, contentType: TYPES[ext] || 'application/octet-stream', bytes: new Uint8Array(readFileSync(abs)), headers: {} };
        }
      }
    }
    return { url: u.href, status: 404, contentType: 'text/plain', bytes: new Uint8Array(), headers: {} };
  };
}

/** A loader that fetches over the network. */
export function remoteLoader(fetchImpl: typeof fetch = fetch, timeoutMs = 15000): Loader {
  return async (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'installkite-doctor (+https://kwy404.github.io/installkite/)' } });
      const bytes = new Uint8Array(await res.arrayBuffer());
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      return { url: res.url || url, status: res.status, contentType: (res.headers.get('content-type') || '').split(';')[0]!.trim(), bytes, headers };
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  };
}

/**
 * Runs every rule, with the Node hooks filled in: PNG decoding, content
 * hashes and, in local mode, the precache freshness check against the files
 * on disk.
 */
export function runDoctor(ctx: DoctorContext): Promise<DoctorReport> {
  const { cwd, config } = ctx;
  const freshness =
    ctx.freshness ??
    (ctx.mode === 'local' && cwd && config
      ? (listed: Map<string, string>) => {
          const rootAbs = join(cwd, config.root);
          if (!existsSync(rootAbs)) return null;
          const files = new Map<string, Uint8Array>();
          for (const f of walk(rootAbs)) files.set(f.path, new Uint8Array(readFileSync(f.abs)));
          const current = precacheFrom(files, config);
          const stale = current.filter((e) => listed.get(e.url) !== e.revision).map((e) => e.url);
          const gone = [...listed.keys()].filter((u) => !current.some((e) => e.url === u));
          return { stale, gone, count: current.length };
        }
      : undefined);
  return runAudit({ decodeImage: decodePng, revision: revisionOf, ...ctx, freshness });
}

/** Audits the files of a project folder. */
export async function doctorLocal(cwd: string, opts: { root?: string; base?: string } = {}): Promise<DoctorReport> {
  const config = readConfig(cwd);
  const root = opts.root ?? config?.root ?? (existsSync(join(cwd, 'index.html')) ? '.' : 'dist');
  const base = normalizeBase(opts.base ?? config?.base ?? '/');
  const origin = 'https://site.installkite.local';
  const dirs = [join(cwd, root)];
  if (config && config.publicDir !== root) dirs.push(join(cwd, config.publicDir));
  return runDoctor({ pageUrl: new URL(base, origin).href, load: localLoader(dirs, origin, base), mode: 'local', config, cwd });
}

/** Audits a live site. */
export async function doctorRemote(url: string, opts: { fetch?: typeof fetch; config?: InstallkiteConfig | null; timeoutMs?: number } = {}): Promise<DoctorReport> {
  return runDoctor({ pageUrl: new URL(url).href, load: remoteLoader(opts.fetch, opts.timeoutMs), mode: 'remote', config: opts.config ?? null });
}
