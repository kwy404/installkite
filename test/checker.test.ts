// The web checker (src/web/ and the docs/app/checker.js bundle): CORS aware
// loading, pasted source, verdicts and the report, on real sites written by
// installkite init and served through a fetch that behaves like a browser.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it } from 'vitest';
import { localLoader } from '../src/core/doctor.js';
import { decodePng } from '../src/core/png.js';
import { applyPlan, planInit } from '../src/core/project.js';
import { browserLoader, checkSite, commandFor, groupChecks, normalizeSiteUrl, reportText, type CheckResult } from '../src/web/checker.js';
import { LOGO_SVG, PAGE, cleanupTemp, tempSite } from './helpers.js';

afterEach(cleanupTemp);

const ORIGIN = 'https://acme.example';
const APP = 'https://kwy404.github.io/installkite/app/';

function readySite(): string {
  const dir = tempSite({ 'index.html': PAGE(), 'menu.html': PAGE('Menu'), 'logo.svg': LOGO_SVG });
  applyPlan(dir, planInit(dir, { postbuild: false }).files);
  return dir;
}

interface Call {
  url: string;
  init: RequestInit | undefined;
}

/**
 * A fetch that serves a folder at ORIGIN the way a browser sees it: with
 * cors false, a CORS mode read fails with a TypeError while a no-cors
 * request gets an opaque answer. down makes every request fail.
 */
function browserFetch(dir: string | null, opts: { cors?: boolean; down?: boolean; delay?: number } = {}) {
  const calls: Call[] = [];
  const load = dir ? localLoader([dir], ORIGIN, '/') : null;
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, init });
    if (opts.delay) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, opts.delay);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    }
    if (opts.down || !load) throw new TypeError('Failed to fetch');
    if (init?.mode === 'no-cors') return new Response(null, { status: 200 });
    if (!opts.cors) throw new TypeError('Failed to fetch');
    const res = await load(url);
    if (!res) throw new TypeError('Failed to fetch');
    return new Response(res.status === 200 ? (res.bytes as BodyInit) : 'not found', { status: res.status, headers: { 'content-type': res.contentType } });
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const ids = (r: CheckResult, status: string): string[] => r.report.checks.filter((c) => c.status === status).map((c) => c.id);

describe('normalizeSiteUrl', () => {
  it('accepts what people paste', () => {
    expect(normalizeSiteUrl('example.com')).toBe('https://example.com/');
    expect(normalizeSiteUrl('  "https://example.com/app/#top"  ')).toBe('https://example.com/app/');
    expect(normalizeSiteUrl('<www.example.com/blog?x=1>')).toBe('https://www.example.com/blog?x=1');
    expect(normalizeSiteUrl('view-source:https://example.com/')).toBe('https://example.com/');
    expect(normalizeSiteUrl('example.com:8080/x')).toBe('https://example.com:8080/x');
    expect(normalizeSiteUrl('localhost:5173')).toBe('http://localhost:5173/');
    expect(normalizeSiteUrl('127.0.0.1:8080/app/')).toBe('http://127.0.0.1:8080/app/');
    expect(normalizeSiteUrl('http://example.com')).toBe('http://example.com/');
  });

  it('explains what is not a website address', () => {
    expect(() => normalizeSiteUrl('   ')).toThrow(/type the address/);
    expect(() => normalizeSiteUrl('mailto:me@example.com')).toThrow(/not a website address/);
    expect(() => normalizeSiteUrl('ftp://example.com')).toThrow(/starts with https/);
    expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow(/not a website address/);
    expect(() => normalizeSiteUrl('intranet')).toThrow(/not a full domain name/);
    expect(() => normalizeSiteUrl('http://exa mple.com')).toThrow(/not a valid address/);
  });
});

describe('browserLoader', () => {
  it('reads sites that allow it, without cookies or custom headers', async () => {
    const { fetch, calls } = browserFetch(readySite(), { cors: true });
    const res = await browserLoader({ fetch, from: APP })(`${ORIGIN}/manifest.webmanifest`);
    expect(res?.status).toBe(200);
    expect(res?.contentType).toBe('application/manifest+json');
    expect(JSON.parse(new TextDecoder().decode(res!.bytes)).name).toBe('Acme Bakery');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.init).toMatchObject({ mode: 'cors', credentials: 'omit' });
    expect(calls[0]!.init!.headers).toBeUndefined();
  });

  it('tells a private site from one that does not answer', async () => {
    const closed = browserFetch(readySite(), { cors: false });
    const blocked = await browserLoader({ fetch: closed.fetch })(`${ORIGIN}/`);
    expect(blocked?.blocked).toBe('cors');
    expect(closed.calls.map((c) => c.init?.mode)).toEqual(['cors', 'no-cors']);
    const down = browserFetch(null, { down: true });
    expect(await browserLoader({ fetch: down.fetch })(`${ORIGIN}/`)).toBeNull();
  });

  it('does not ask a secure page to read plain HTTP, except on localhost', async () => {
    const { fetch, calls } = browserFetch(readySite(), { cors: true });
    const load = browserLoader({ fetch, from: APP });
    expect((await load('http://acme.example/'))?.blocked).toBe('mixed');
    expect(calls).toHaveLength(0);
    await load('http://localhost:8080/');
    expect(calls[0]!.url).toBe('http://localhost:8080/');
    // A plain HTTP page (a local checker) may read HTTP sites.
    expect((await browserLoader({ fetch, from: 'http://localhost:4000/app/' })('http://acme.example/'))?.blocked).not.toBe('mixed');
  });

  it('gives up after the timeout', async () => {
    const { fetch } = browserFetch(readySite(), { cors: true, delay: 200 });
    expect(await browserLoader({ fetch, timeoutMs: 20 })(`${ORIGIN}/`)).toBeNull();
  });

  it('reports progress and serves pasted files without fetching', async () => {
    const { fetch, calls } = browserFetch(readySite(), { cors: true });
    const seen: string[] = [];
    const page = { url: `${ORIGIN}/`, status: 200, contentType: 'text/html', bytes: new TextEncoder().encode('<html></html>'), headers: {} };
    const load = browserLoader({ fetch, onLoad: (u) => seen.push(u), overrides: new Map([[`${ORIGIN}/`, page]]) });
    expect(await load(`${ORIGIN}/#top`)).toBe(page);
    await load(`${ORIGIN}/sw.js`);
    expect(seen).toEqual([`${ORIGIN}/sw.js`]);
    expect(calls.map((c) => c.url)).toEqual([`${ORIGIN}/sw.js`]);
  });
});

describe('checkSite', () => {
  it('passes a site installkite set up when the site allows reading', async () => {
    const { fetch } = browserFetch(readySite(), { cors: true });
    const r = await checkSite('acme.example', { fetch, from: APP, decodeImage: decodePng });
    expect(r.url).toBe(`${ORIGIN}/`);
    expect(r.access).toBe('full');
    expect(r.blockedBy).toBeNull();
    expect(r.verdict.tone).toBe('ready');
    expect(r.verdict.title).toBe('acme.example is installable and works offline');
    // Placeholder screenshots and precache freshness need the project folder, so the CLI checks them.
    expect(ids(r, 'warn')).toEqual([]);
    expect(ids(r, 'error')).toEqual([]);
    expect(r.report.checks.some((c) => c.id === 'precache-fresh')).toBe(false);
    expect(r.report.checks.find((c) => c.id === 'apple-touch-icon')!.message).toBe('180x180, opaque');
    expect(r.groups.map((g) => g.id)).toEqual(['page', 'manifest', 'icons', 'offline']);
    expect(r.counts.pass + r.counts.warn + r.counts.info).toBe(r.report.checks.length);
    expect(r.command).toBe('npx installkite doctor acme.example');
  });

  it('explains a site that keeps its files private', async () => {
    const { fetch } = browserFetch(readySite(), { cors: false });
    const r = await checkSite('https://acme.example/', { fetch, from: APP });
    expect(r.access).toBe('blocked');
    expect(r.blockedBy).toBe('cors');
    expect(r.verdict.tone).toBe('blocked');
    expect(r.verdict.title).toMatch(/cannot read acme\.example/);
    expect(r.report.checks.find((c) => c.id === 'page')).toMatchObject({ status: 'skip', message: expect.stringMatching(/does not let other pages read acme\.example/) });
    expect(r.report.installable).toBe(false);
    expect(r.report.errors).toBe(0);
  });

  it('explains plain HTTP sites from a secure page', async () => {
    const { fetch } = browserFetch(readySite(), { cors: true });
    const r = await checkSite('http://acme.example/', { fetch, from: APP });
    expect(r.blockedBy).toBe('mixed');
    expect(r.verdict.title).toBe('acme.example is on plain HTTP');
    expect(r.report.checks.find((c) => c.id === 'https')!.status).toBe('error');
  });

  it('checks pasted page source and manifest, and skips only what it cannot read', async () => {
    const dir = readySite();
    const { fetch } = browserFetch(dir, { cors: false });
    const pasted = { html: readFileSync(join(dir, 'index.html'), 'utf8'), manifest: readFileSync(join(dir, 'manifest.webmanifest'), 'utf8') };
    const r = await checkSite('acme.example', { fetch, from: APP, pasted });
    expect(r.access).toBe('partial');
    expect(r.verdict.tone).toBe('partial');
    expect(r.verdict.text).toMatch(/^\d+ checks were skipped/);
    for (const id of ['viewport', 'manifest-link', 'manifest-fetch', 'manifest-name', 'display', 'scope', 'start-url-reachable', 'icons', 'sw-registered']) {
      expect(r.report.checks.find((c) => c.id === id)?.status, id).toBe('pass');
    }
    expect(ids(r, 'skip')).toEqual(expect.arrayContaining(['icon-file', 'apple-touch-icon', 'sw-fetch']));
    // One skip for all the icon files, not one per icon.
    expect(ids(r, 'skip').filter((id) => id === 'icon-file')).toHaveLength(1);
    expect(ids(r, 'error')).toEqual([]);
  });

  it('uses pasted HTML alone and still reads the manifest when allowed', async () => {
    const dir = readySite();
    const { fetch, calls } = browserFetch(dir, { cors: true });
    const r = await checkSite('acme.example', { fetch, pasted: { html: readFileSync(join(dir, 'index.html'), 'utf8') } });
    expect(calls.some((c) => c.url === `${ORIGIN}/`)).toBe(false);
    expect(r.report.checks.find((c) => c.id === 'manifest-fetch')!.status).toBe('pass');
  });

  it('lists what a plain site is missing, with fixes', async () => {
    const { fetch } = browserFetch(tempSite({ 'index.html': '<!doctype html><html><head><title>Plain</title></head><body></body></html>' }), { cors: true });
    const r = await checkSite('acme.example', { fetch });
    expect(r.verdict.tone).toBe('missing');
    expect(r.verdict.text).toMatch(/^2 things are missing/);
    expect(ids(r, 'error')).toEqual(['manifest-link', 'sw-registered']);
    expect(r.report.checks.filter((c) => c.status === 'error').every((c) => !!c.fix)).toBe(true);
    const manifest = r.groups.find((g) => g.id === 'manifest')!;
    expect(manifest.errors).toBe(1);
  });

  it('says when the site does not answer or the page is missing', async () => {
    const down = await checkSite('acme.example', { fetch: browserFetch(null, { down: true }).fetch });
    expect(down.access).toBe('down');
    expect(down.verdict.title).toBe('acme.example did not answer');
    const missing = await checkSite('acme.example/nope/', { fetch: browserFetch(readySite(), { cors: true }).fetch });
    expect(missing.verdict.title).toBe('acme.example answered with HTTP 404');
  });
});

describe('report helpers', () => {
  it('sorts checks into groups, problems first', () => {
    const groups = groupChecks([
      { id: 'https', title: 'HTTPS', status: 'pass', message: '' },
      { id: 'viewport', title: 'Viewport', status: 'warn', message: '' },
      { id: 'new-rule', title: 'Something new', status: 'info', message: '' },
      { id: 'icons', title: 'Icons', status: 'error', message: '' },
    ]);
    expect(groups.map((g) => g.id)).toEqual(['page', 'icons']);
    expect(groups[0]!.checks.map((c) => c.id)).toEqual(['viewport', 'new-rule', 'https']);
    expect(groups[1]).toMatchObject({ errors: 1, skipped: 0 });
  });

  it('writes the shortest command', () => {
    expect(commandFor('https://example.com/')).toBe('npx installkite doctor example.com');
    expect(commandFor('https://example.com/app/')).toBe('npx installkite doctor https://example.com/app/');
    expect(commandFor('http://localhost:5173/')).toBe('npx installkite doctor http://localhost:5173/');
  });

  it('turns a result into plain text', async () => {
    const { fetch } = browserFetch(readySite(), { cors: false });
    const r = await checkSite('acme.example', { fetch });
    const text = reportText(r);
    expect(text.split('\n')[0]).toBe('installkite check of https://acme.example/');
    expect(text).toMatch(/ {2}skip {2}Start page loads: /);
    expect(text).toMatch(/Full check: npx installkite doctor acme\.example\n$/);
  });
});

describe('the docs/app/checker.js bundle', () => {
  const code = readFileSync(join(__dirname, '..', 'docs', 'app', 'checker.js'), 'utf8');

  it('has no Node APIs in it', () => {
    expect(code).not.toMatch(/\brequire\(/);
    expect(code).not.toMatch(/node:(fs|path|zlib|crypto)/);
  });

  it('runs in a plain browser like global and checks a site', async () => {
    const sandbox: Record<string, unknown> = { URL, TextEncoder, TextDecoder, AbortController, setTimeout, clearTimeout, Uint8Array, Response, Blob };
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    runInNewContext(code, sandbox);
    const api = sandbox.InstallkiteChecker as { version: string; checkSite: typeof checkSite; normalizeSiteUrl: typeof normalizeSiteUrl };
    const { version } = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    expect(api.version).toBe(version);
    expect(api.normalizeSiteUrl('example.com')).toBe('https://example.com/');
    const r = await api.checkSite('acme.example', { fetch: browserFetch(readySite(), { cors: true }).fetch, decodeImage: decodePng });
    expect(r.verdict.tone).toBe('ready');
  });
});
