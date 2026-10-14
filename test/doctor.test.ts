import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { doctorLocal, doctorRemote, findServiceWorker, localLoader, withinScope, type DoctorReport } from '../src/core/doctor.js';
import { applyPlan, planBuild, planInit } from '../src/core/project.js';
import { createImage, encodePng } from '../src/core/png.js';
import { LOGO_SVG, PAGE, cleanupTemp, tempSite } from './helpers.js';

afterEach(cleanupTemp);

const status = (r: DoctorReport, id: string): string | undefined => r.checks.find((c) => c.id === id)?.status;
const statuses = (r: DoctorReport, id: string): string[] => r.checks.filter((c) => c.id === id).map((c) => c.status);

function readySite(files: Record<string, string | Uint8Array> = {}, answers = {}): string {
  const dir = tempSite({ 'index.html': PAGE(), 'menu.html': PAGE('Menu'), 'logo.svg': LOGO_SVG, ...files });
  applyPlan(dir, planInit(dir, { postbuild: false, ...answers }).files);
  return dir;
}

describe('doctor on files', () => {
  it('passes a site that installkite set up', async () => {
    const r = await doctorLocal(readySite());
    const failing = r.checks.filter((c) => c.status === 'error' || c.status === 'warn');
    // The placeholder screenshots are the only reminder left.
    expect(failing.map((c) => c.id)).toEqual(['screenshots']);
    expect(r.installable).toBe(true);
    expect(r.offlineReady).toBe(true);
    for (const id of ['manifest-link', 'display', 'icons', 'icon-file', 'scope', 'start-url-reachable', 'sw-registered', 'sw-scope', 'sw-fetch-handler', 'offline-page', 'start-url-precached', 'precache-fresh', 'apple-touch-icon', 'favicon', 'theme-color-meta', 'viewport']) {
      expect(status(r, id), id).toBe('pass');
    }
  });

  it('reports a site with nothing set up, with fixes', async () => {
    const r = await doctorLocal(tempSite({ 'index.html': '<html><head><title>x</title></head><body></body></html>' }));
    expect(status(r, 'manifest-link')).toBe('error');
    expect(status(r, 'sw-registered')).toBe('error');
    expect(status(r, 'viewport')).toBe('warn');
    expect(status(r, 'apple-touch-icon')).toBe('warn');
    expect(r.checks.find((c) => c.id === 'manifest-link')!.fix).toMatch(/installkite init/);
    expect(r.installable).toBe(false);
    expect(r.offlineReady).toBe(false);
  });

  it('fails when the start page is missing', async () => {
    const r = await doctorLocal(tempSite({ 'about.html': 'x' }));
    expect(status(r, 'page')).toBe('error');
  });

  it('checks manifest fields, icons and scope', async () => {
    const dir = readySite();
    const manifestPath = join(dir, 'manifest.webmanifest');
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    m.display = 'browser';
    m.scope = './blog/';
    m.short_name = 'A very long home screen name';
    m.theme_color = 'not a color';
    delete m.id;
    m.icons = m.icons.filter((i: { sizes: string }) => i.sizes !== '512x512' && i.sizes !== 'any');
    m.icons.push({ src: 'icons/missing.png', sizes: '96x96', type: 'image/png' });
    m.icons.push({ src: 'icons/icon-48.png', sizes: '64x64', type: 'image/png', purpose: 'any maskable' });
    writeFileSync(manifestPath, JSON.stringify(m));
    const r = await doctorLocal(dir);
    expect(status(r, 'display')).toBe('error');
    expect(status(r, 'scope')).toBe('error');
    expect(status(r, 'short-name')).toBe('warn');
    expect(status(r, 'theme_color')).toBe('error');
    expect(status(r, 'id')).toBe('info');
    expect(status(r, 'icons')).toBe('error');
    expect(statuses(r, 'icon-file')).toContain('error');
    expect(status(r, 'icon-size')).toBe('warn');
    expect(status(r, 'purpose')).toBe('warn');
  });

  it('flags invalid manifest JSON and transparent maskable icons', async () => {
    const dir = readySite();
    writeFileSync(join(dir, 'icons', 'maskable-192.png'), encodePng(createImage(192, 192)));
    let r = await doctorLocal(dir);
    expect(status(r, 'maskable-opaque')).toBe('warn');
    writeFileSync(join(dir, 'manifest.webmanifest'), '{ nope');
    r = await doctorLocal(dir);
    expect(status(r, 'manifest-fetch')).toBe('error');
  });

  it('notices a stale precache list and passes again after build', async () => {
    const dir = readySite();
    writeFileSync(join(dir, 'menu.html'), PAGE('Menu, now with croissants'));
    writeFileSync(join(dir, 'new.html'), PAGE('New page'));
    let r = await doctorLocal(dir);
    expect(status(r, 'precache-fresh')).toBe('error');
    expect(r.checks.find((c) => c.id === 'precache-fresh')!.message).toMatch(/2 changed or new/);
    applyPlan(dir, planBuild(dir).files);
    r = await doctorLocal(dir);
    expect(status(r, 'precache-fresh')).toBe('pass');
  });

  it('warns about placeholder screenshots until they are replaced', async () => {
    const dir = readySite();
    let r = await doctorLocal(dir);
    expect(r.checks.find((c) => c.id === 'screenshots')!.message).toMatch(/placeholder/);
    writeFileSync(join(dir, 'icons', 'screenshot-wide.png'), encodePng(createImage(1280, 720, [1, 2, 3, 255])));
    writeFileSync(join(dir, 'icons', 'screenshot-narrow.png'), encodePng(createImage(720, 1280, [1, 2, 3, 255])));
    r = await doctorLocal(dir);
    expect(status(r, 'screenshots')).toBe('pass');
  });

  it('checks the service worker scope and the offline page', async () => {
    const dir = readySite();
    rmSync(join(dir, 'offline.html'));
    let r = await doctorLocal(dir);
    expect(status(r, 'offline-page')).toBe('warn');
    // A worker in a subfolder cannot control the start page.
    const html = readFileSync(join(dir, 'index.html'), 'utf8').replace('data-sw="/sw.js"', 'data-sw="/js/sw.js"');
    writeFileSync(join(dir, 'index.html'), html);
    mkdirSync(join(dir, 'js'));
    writeFileSync(join(dir, 'js', 'sw.js'), readFileSync(join(dir, 'sw.js')));
    r = await doctorLocal(dir);
    expect(status(r, 'sw-scope')).toBe('error');
    rmSync(join(dir, 'js', 'sw.js'));
    r = await doctorLocal(dir);
    expect(status(r, 'sw-fetch')).toBe('error');
    // A worker without a fetch handler does not make the site work offline.
    writeFileSync(join(dir, 'js', 'sw.js'), "self.addEventListener('install', () => {});");
    r = await doctorLocal(dir);
    expect(status(r, 'sw-fetch-handler')).toBe('error');
  });

  it('reads the production URL from the config for the HTTPS rule', async () => {
    const dir = readySite({}, { url: 'http://acme.example' });
    const r = await doctorLocal(dir);
    expect(status(r, 'https')).toBe('error');
  });

  it('audits a site served under a base path', async () => {
    const dir = readySite({}, { base: '/acme/' });
    const r = await doctorLocal(dir);
    expect(r.errors).toBe(0);
    expect(r.url).toBe('https://site.installkite.local/acme/');
  });
});

describe('doctor on a live URL', () => {
  function server(dir: string, opts: { types?: Record<string, string>; headers?: Record<string, string> } = {}): typeof fetch {
    const load = localLoader([dir], 'https://acme.example', '/');
    return (async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const res = await load(url.replace(/^http:/, 'https:'));
      if (!res) throw new TypeError('network error');
      const type = Object.entries(opts.types ?? {}).find(([k]) => url.endsWith(k))?.[1] ?? res.contentType;
      return new Response(res.bytes as Uint8Array<ArrayBuffer>, { status: res.status, headers: { 'content-type': type, ...(opts.headers ?? {}) } });
    }) as typeof fetch;
  }

  it('passes over HTTPS and checks content types', async () => {
    const dir = readySite();
    const ok = await doctorRemote('https://acme.example/', { fetch: server(dir) });
    expect(status(ok, 'https')).toBe('pass');
    expect(ok.errors).toBe(0);
    const bad = await doctorRemote('https://acme.example/', { fetch: server(dir, { types: { 'sw.js': 'text/plain', '.webmanifest': 'text/html' } }) });
    expect(status(bad, 'sw-fetch')).toBe('error');
    expect(status(bad, 'manifest-type')).toBe('warn');
  });

  it('fails plain HTTP and unreachable sites', async () => {
    const dir = readySite();
    const http = await doctorRemote('http://acme.example/', { fetch: server(dir) });
    expect(status(http, 'https')).toBe('error');
    const down = await doctorRemote('https://down.example/', { fetch: (async () => { throw new TypeError('offline'); }) as typeof fetch });
    expect(status(down, 'page')).toBe('error');
  });

  it('honors the Service-Worker-Allowed header', async () => {
    const dir = readySite({}, { startUrl: './menu.html' });
    const r = await doctorRemote('https://acme.example/', { fetch: server(dir, { headers: { 'service-worker-allowed': '/' } }) });
    expect(status(r, 'sw-scope')).toBe('pass');
  });
});

describe('doctor helpers', () => {
  it('finds the service worker a page registers', () => {
    expect(findServiceWorker('<script src="/ik/installkite.js" defer></script>', 'https://a.b/x/')).toEqual({ url: 'https://a.b/ik/sw.js', via: 'installkite.js' });
    expect(findServiceWorker('<script src="https://cdn.jsdelivr.net/npm/installkite@0.1.0/dist/installkite.min.js" data-sw="/sw.js"></script>', 'https://a.b/x/')!.url).toBe('https://a.b/sw.js');
    expect(findServiceWorker("<script>navigator.serviceWorker.register('worker.js')</script>", 'https://a.b/app/')).toEqual({ url: 'https://a.b/app/worker.js', via: 'navigator.serviceWorker.register' });
    expect(findServiceWorker('<p>none</p>', 'https://a.b/')).toBeNull();
  });

  it('compares scopes', () => {
    expect(withinScope('https://a.b/app/x', 'https://a.b/app/')).toBe(true);
    expect(withinScope('https://a.b/other', 'https://a.b/app/')).toBe(false);
    expect(withinScope('https://c.d/app/', 'https://a.b/app/')).toBe(false);
  });

  it('serves files like a static host', async () => {
    const dir = tempSite({ 'index.html': 'home', 'about/index.html': 'about', 'page.html': 'page' });
    const load = localLoader([dir], 'https://h', '/base/');
    const text = async (u: string) => new TextDecoder().decode((await load(u))!.bytes);
    expect(await text('https://h/base/')).toBe('home');
    expect(await text('https://h/base/about/')).toBe('about');
    expect(await text('https://h/base/about')).toBe('about');
    expect(await text('https://h/base/page')).toBe('page');
    expect((await load('https://h/other/'))!.status).toBe(404);
    expect((await load('https://h/base/..%2Fsecret'))!.status).toBe(403);
    expect(await load('https://elsewhere/')).toBeNull();
  });
});
