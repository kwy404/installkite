// The web checker: runs the installkite doctor rules on a live site from a
// browser tab. Browsers only let a page read files from another site when
// that site allows it with CORS headers, so every file the checker cannot
// read is reported as skipped with a plain explanation, never as missing.
// Pasted page source and manifest fill the gaps.
import { normalizeSiteUrl, runDoctor, type Check, type DoctorReport, type Loader, type Pixels, type Resource, type Status } from '../core/audit.js';
import { readPageMeta } from '../core/head.js';

export { normalizeSiteUrl };
export type { Check, DoctorReport, Status };

export interface CheckOptions {
  /** The fetch to use (the browser one by default). */
  fetch?: typeof fetch;
  /** The address of the page the checker runs on, to spot mixed content. */
  from?: string;
  /** How long to wait for each file, in milliseconds. */
  timeoutMs?: number;
  /** Text the visitor pasted, used instead of fetching. */
  pasted?: { html?: string; manifest?: string };
  /** Called before each file is read, for progress messages. */
  onLoad?: (url: string) => void;
  /** Decodes PNG pixels; the canvas based decoder is used when available. */
  decodeImage?: (bytes: Uint8Array) => Pixels | Promise<Pixels>;
}

export type Access = 'full' | 'partial' | 'blocked' | 'down';
export type Tone = 'ready' | 'partial' | 'missing' | 'blocked' | 'down';

export interface Group {
  id: 'page' | 'manifest' | 'icons' | 'offline';
  title: string;
  checks: Check[];
  /** Checks in the group that failed with an error. */
  errors: number;
  /** Checks in the group that could not run. */
  skipped: number;
}

export interface CheckResult {
  url: string;
  host: string;
  report: DoctorReport;
  /** How much of the site the browser could read. */
  access: Access;
  /** Why files could not be read, when some could not. */
  blockedBy: 'cors' | 'mixed' | null;
  groups: Group[];
  verdict: { tone: Tone; title: string; text: string };
  /** The command that runs the same check without browser limits. */
  command: string;
  counts: Record<Status, number>;
}

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/i;
const plain = (url: string): string => url.replace(/#.*$/, '');

function resourceFrom(url: string, body: string, type: string): Resource {
  return { url, status: 200, contentType: type, bytes: new TextEncoder().encode(body), headers: {} };
}

/**
 * A loader for the browser. It never sends custom headers or cookies, so a
 * site that allows reading with a plain `Access-Control-Allow-Origin` works
 * without a preflight. When a read fails, a second no-cors request tells a
 * site that exists but keeps its files private (blocked) from one that does
 * not answer (null).
 */
export function browserLoader(opts: CheckOptions & { overrides?: Map<string, Resource> } = {}): Loader {
  const doFetch = opts.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init));
  const timeoutMs = opts.timeoutMs ?? 15000;
  const fromSecure = opts.from ? new URL(opts.from).protocol === 'https:' : false;
  const withTimeout = async (url: string, init: RequestInit): Promise<Response> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await doFetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };
  return async (url) => {
    const hit = opts.overrides?.get(plain(url));
    if (hit) return hit;
    opts.onLoad?.(url);
    const target = new URL(url);
    const blocked = (why: 'cors' | 'mixed'): Resource => ({ url, status: 0, contentType: '', bytes: new Uint8Array(), headers: {}, blocked: why });
    if (fromSecure && target.protocol === 'http:' && !LOCAL.test(target.hostname)) return blocked('mixed');
    try {
      const res = await withTimeout(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
      const bytes = new Uint8Array(await res.arrayBuffer());
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      return { url: res.url || url, status: res.status, contentType: (res.headers.get('content-type') || '').split(';')[0]!.trim(), bytes, headers };
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return null;
      try {
        await withTimeout(url, { mode: 'no-cors', credentials: 'omit', redirect: 'follow' });
        return blocked('cors');
      } catch {
        return null;
      }
    }
  };
}

/** Decodes PNG pixels with the canvas API, or null when the browser cannot. */
export function canvasDecoder(): ((bytes: Uint8Array) => Promise<Pixels>) | undefined {
  const g = globalThis as { createImageBitmap?: typeof createImageBitmap; OffscreenCanvas?: typeof OffscreenCanvas; document?: Document };
  if (typeof g.createImageBitmap !== 'function' || (!g.OffscreenCanvas && !g.document)) return undefined;
  return async (bytes) => {
    const bitmap = await g.createImageBitmap!(new Blob([bytes as BlobPart], { type: 'image/png' }));
    const { width, height } = bitmap;
    const canvas = g.OffscreenCanvas ? new g.OffscreenCanvas(width, height) : Object.assign(g.document!.createElement('canvas'), { width, height });
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, width, height);
    return { width, height, data: img.data };
  };
}

const GROUPS: Array<{ id: Group['id']; title: string; ids: string[] }> = [
  { id: 'page', title: 'The page', ids: ['https', 'page', 'viewport', 'theme-color-meta'] },
  {
    id: 'manifest',
    title: 'Web app manifest',
    ids: ['manifest-link', 'manifest-fetch', 'manifest-type', 'manifest-name', 'short-name', 'display', 'start-url', 'scope', 'start-url-origin', 'start-url-reachable', 'id', 'theme_color', 'background_color', 'description', 'screenshots'],
  },
  { id: 'icons', title: 'Icons', ids: ['icons', 'icon-file', 'icon-size', 'purpose', 'maskable', 'maskable-opaque', 'apple-touch-icon', 'favicon'] },
  { id: 'offline', title: 'Offline', ids: ['sw-registered', 'sw-fetch', 'sw-scope', 'sw-fetch-handler', 'offline-page', 'start-url-precached', 'precache-fresh'] },
];

const RANK: Record<Status, number> = { error: 0, warn: 1, skip: 2, info: 3, pass: 4 };

/** Sorts the checks into four groups, problems first inside each group. */
export function groupChecks(checks: Check[]): Group[] {
  return GROUPS.map((g) => {
    const list = checks
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => g.ids.includes(c.id) || (g.id === 'page' && !GROUPS.some((x) => x.ids.includes(c.id))))
      .sort((a, b) => RANK[a.c.status] - RANK[b.c.status] || a.i - b.i)
      .map(({ c }) => c);
    return { id: g.id, title: g.title, checks: list, errors: list.filter((c) => c.status === 'error').length, skipped: list.filter((c) => c.status === 'skip').length };
  }).filter((g) => g.checks.length > 0);
}

/** The shortest command line that checks the same URL. */
export function commandFor(url: string): string {
  const u = new URL(url);
  const short = u.protocol === 'https:' && u.pathname === '/' && !u.search ? u.host : u.href;
  return `npx installkite doctor ${short}`;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** The headline for a report, in plain words. */
export function verdictFor(report: DoctorReport, host: string, blockedBy: 'cors' | 'mixed' | null): CheckResult['verdict'] {
  const page = report.checks.find((c) => c.id === 'page');
  if (page?.status === 'skip') {
    return blockedBy === 'mixed'
      ? { tone: 'blocked', title: `${host} is on plain HTTP`, text: 'This page is secure, so the browser does not let it read a plain HTTP site. Installing needs HTTPS anyway: switch the site to HTTPS, or run the command below.' }
      : { tone: 'blocked', title: `Your browser cannot read ${host} from here`, text: 'The site is up, but it does not allow other pages to read its files. That is the default for most sites, not a problem with yours.' };
  }
  if (page?.status === 'error') {
    const http = /HTTP (\d+)/.exec(page.message)?.[1];
    return { tone: 'down', title: http ? `${host} answered with HTTP ${http}` : `${host} did not answer`, text: http ? 'Check the address: the page should load in a normal tab.' : 'Check the address and your connection. A site on a private network can only be checked with the command below.' };
  }
  if (report.errors) {
    return { tone: 'missing', title: `${host} is not installable yet`, text: `${plural(report.errors, 'thing is', 'things are')} missing. Each one has a fix below, or run "npx installkite init" in the project to add them all.` };
  }
  if (report.skipped) {
    return { tone: 'partial', title: 'Nothing missing in what the browser could read', text: `${plural(report.skipped, 'check was', 'checks were')} skipped because the site keeps those files private. The command below checks everything.` };
  }
  const extra = report.warnings ? ` ${plural(report.warnings, 'suggestion')} below would make it even better.` : '';
  return { tone: 'ready', title: `${host} is installable${report.offlineReady ? ' and works offline' : ''}`, text: `Browsers can offer to install it.${extra}` };
}

/** Builds the overrides for pasted page source and manifest. */
export function pastedResources(pageUrl: string, pasted: CheckOptions['pasted']): Map<string, Resource> {
  const map = new Map<string, Resource>();
  const html = pasted?.html?.trim();
  if (html) {
    map.set(plain(pageUrl), resourceFrom(pageUrl, html, 'text/html'));
    const href = readPageMeta(html).manifest;
    const manifest = pasted?.manifest?.trim();
    if (href && manifest) {
      const url = new URL(href, pageUrl).href;
      map.set(plain(url), resourceFrom(url, manifest, 'application/manifest+json'));
    }
  }
  return map;
}

/** Checks a site: what it is missing to be installable and to work offline. */
export async function checkSite(input: string, opts: CheckOptions = {}): Promise<CheckResult> {
  const url = normalizeSiteUrl(input);
  const overrides = pastedResources(url, opts.pasted);
  const decodeImage = opts.decodeImage ?? canvasDecoder();
  const base = browserLoader({ ...opts, overrides });
  let blockedBy: 'cors' | 'mixed' | null = null;
  const load: Loader = async (u) => {
    const res = await base(u);
    if (res?.blocked) blockedBy ??= res.blocked;
    return res;
  };
  const report = await runDoctor({ pageUrl: url, load, mode: 'remote', decodeImage });
  const host = new URL(url).host;
  const counts: Record<Status, number> = { pass: 0, error: 0, warn: 0, info: 0, skip: 0 };
  for (const c of report.checks) counts[c.status]++;
  const page = report.checks.find((c) => c.id === 'page');
  const access: Access = page?.status === 'skip' ? 'blocked' : page?.status === 'error' ? 'down' : report.skipped ? 'partial' : 'full';
  return { url, host, report, access, blockedBy, groups: groupChecks(report.checks), verdict: verdictFor(report, host, blockedBy), command: commandFor(url), counts };
}

const MARK: Record<Status, string> = { pass: 'pass', error: 'fail', warn: 'warn', info: 'info', skip: 'skip' };

/** The report as plain text, for pasting into an issue or a chat. */
export function reportText(r: CheckResult): string {
  const lines = [`installkite check of ${r.url}`, r.verdict.title, ''];
  for (const g of r.groups) {
    lines.push(g.title);
    for (const c of g.checks) {
      lines.push(`  ${MARK[c.status]}  ${c.title}: ${c.message}`);
      if (c.fix) lines.push(`        fix: ${c.fix}`);
    }
    lines.push('');
  }
  if (r.report.skipped) lines.push(`Full check: ${r.command}`);
  return `${lines.join('\n').trim()}\n`;
}
