// End to end check of the web checker page (docs/app/) in a real browser.
// Serves docs/ three times on local ports: as the site itself, as another
// origin without CORS headers, and as another origin that allows reading.
// Then drives headless Edge or Chrome over the DevTools protocol and checks
// each case, plus zero console errors. Needs network access for the CDN
// files (Monsoon, Voodoo.js, fonts).
//
//   node test/e2e/checker.e2e.mjs            run the checks
//   SHOTS=folder node test/e2e/checker.e2e.mjs   also save screenshots
//   BROWSER=/path/to/chrome node test/e2e/checker.e2e.mjs
/* global WebSocket */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../../docs/', import.meta.url));
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };

function serveDocs(prefix, cors) {
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const headers = cors ? { 'access-control-allow-origin': '*' } : {};
    if (!path.startsWith(prefix)) {
      res.writeHead(404, headers);
      return res.end('not found');
    }
    if (path === `${prefix}plain/`) {
      // A plain page with nothing installable, for the "missing" report.
      res.writeHead(200, { 'content-type': 'text/html', ...headers });
      return res.end('<!doctype html><html><head><title>Plain</title></head><body><h1>Plain</h1></body></html>');
    }
    let file = join(docs, path.slice(prefix.length));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404, headers);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store', ...headers });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((c) => c && existsSync(c));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(exe) {
  const profile = mkdtempSync(join(tmpdir(), 'installkite-e2e-'));
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--window-size=1440,1000', 'about:blank'], { stdio: 'ignore' });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 300 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) throw new Error('the browser did not start');
  await sleep(200);
  const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const close = async () => {
    try {
      await send('Browser.close');
    } catch {
      /* already gone */
    }
    ws.close();
    proc.kill();
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* the browser may still hold files on Windows */
    }
  };
  return { send, on: (fn) => listeners.push(fn), close };
}

const exe = findBrowser();
if (typeof WebSocket === 'undefined') {
  console.log('skipped: needs Node.js 22 or newer (for WebSocket)');
  process.exit(0);
}
if (!exe) {
  console.log('skipped: no Edge or Chrome found (set BROWSER=/path/to/browser)');
  process.exit(0);
}

const site = await serveDocs('/installkite/', false);
const closed = await serveDocs('/', false);
const open = await serveDocs('/', true);
const APP = `http://127.0.0.1:${site.port}/installkite/app/`;
const b = await launch(exe);
const errors = [];
b.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const e = m.params.entry;
    // The no-CORS origin is expected to refuse reads: those are the very errors the page explains.
    if (!(e.url || '').includes(`:${closed.port}/`) && !/CORS/.test(e.text)) errors.push(`${e.text} ${e.url || ''}`);
  }
});
await b.send('Page.enable');
await b.send('Runtime.enable');
await b.send('Log.enable');

const evaluate = async (expr) => {
  const r = await b.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
async function waitFor(expr, what, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(expr).catch(() => false)) return;
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${what}`);
}
async function go(url) {
  await b.send('Page.navigate', { url });
  await waitFor('document.readyState === "complete" && !!window.V && !!window.InstallkiteChecker', 'the page to load');
}
const done = () => waitFor(`document.querySelector('.result') && getComputedStyle(document.querySelector('.result')).display !== 'none'`, 'the result');
const state = () =>
  evaluate(`({
    verdict: document.querySelector('#verdict-title').textContent,
    why: getComputedStyle(document.querySelector('.why')).display !== 'none',
    partial: getComputedStyle(document.querySelector('.partial')).display !== 'none',
    cmd: document.querySelector('#cmd').textContent,
    rows: [...document.querySelectorAll('.row')].map((r) => r.className.replace('row ', '').split(' ')[0] + ' ' + r.querySelector('.row-title b').textContent),
  })`);
async function shot(name, width, height, dark) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  await sleep(400);
  const { data } = await b.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
}

let failed = 0;
async function step(name, fn) {
  try {
    await fn();
    console.log(`  pass  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}: ${e.message}`);
  }
}
const expect = (ok, msg) => {
  if (!ok) throw new Error(msg);
};

console.log(`web checker e2e in ${exe}`);
await step('start screen renders with the three steps and the CORS note', async () => {
  await go(APP);
  const s = await evaluate(`({ steps: document.querySelectorAll('.steps li').length, note: /CORS/.test(document.querySelector('.cors-note').textContent), idle: getComputedStyle(document.querySelector('.idle')).display })`);
  expect(s.steps === 3 && s.note && s.idle !== 'none', JSON.stringify(s));
  await shot('start-1440-light', 1440, 1000, false);
  await shot('start-375-dark', 375, 812, true);
});

await step('the site itself (same origin) passes every check', async () => {
  await evaluate(`document.querySelector('.ask-help .link-btn').click()`);
  await done();
  const s = await state();
  expect(/is installable and works offline/.test(s.verdict), s.verdict);
  expect(s.rows.length > 15 && s.rows.every((r) => r.startsWith('st-pass')), s.rows.join(', '));
  expect(await evaluate(`location.search.includes('url=')`), 'the URL is not kept in the address bar');
  await shot('ready-1440-light', 1440, 1000, false);
});

await step('another origin without CORS gets the explanation and the command', async () => {
  await go(`${APP}?url=${encodeURIComponent(`127.0.0.1:${closed.port}`)}`);
  await done();
  const s = await state();
  expect(/cannot read/.test(s.verdict), s.verdict);
  expect(s.why, 'the three ways card is hidden');
  expect(s.cmd === `npx installkite doctor http://127.0.0.1:${closed.port}/`, s.cmd);
  expect(s.rows.includes('st-skip Start page loads'), s.rows.join(', '));
  await b.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await sleep(300);
  const wide = await evaluate('document.documentElement.scrollWidth');
  await b.send('Emulation.clearDeviceMetricsOverride');
  expect(wide <= 375, `the page is ${wide} px wide on a 375 px phone`);
  await shot('blocked-375-light', 375, 812, false);
  await shot('blocked-1440-dark', 1440, 1000, true);
});

await step('pasted source checks what it can and marks the rest as not readable', async () => {
  const html = JSON.stringify(readFileSync(join(docs, 'index.html'), 'utf8'));
  const manifest = JSON.stringify(readFileSync(join(docs, 'manifest.webmanifest'), 'utf8'));
  await evaluate(`(() => {
    const set = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
    document.querySelector('.ways .btn').click();
    set('#paste-html', ${html});
    set('#paste-manifest', ${manifest});
    document.querySelector('.paste-actions .btn').click();
  })()`);
  await waitFor(`/Nothing missing in what the browser could read/.test(document.querySelector('#verdict-title').textContent)`, 'the partial verdict');
  const s = await state();
  expect(s.partial, 'the partial note is hidden');
  expect(s.rows.some((r) => r === 'st-pass Manifest loads'), s.rows.join(', '));
  expect(s.rows.some((r) => r.startsWith('st-skip')) && !s.rows.some((r) => r.startsWith('st-error')), s.rows.join(', '));
});

await step('another origin that allows reading gets the full report', async () => {
  await go(`${APP}?url=${encodeURIComponent(`http://127.0.0.1:${open.port}/`)}`);
  await done();
  const s = await state();
  expect(/is installable and works offline/.test(s.verdict), s.verdict);
  expect(s.rows.every((r) => r.startsWith('st-pass')), s.rows.join(', '));
});

await step('a site with problems lists them with fixes', async () => {
  await go(`${APP}?url=${encodeURIComponent(`http://127.0.0.1:${open.port}/plain/`)}`);
  await done();
  const s = await state();
  const fixes = await evaluate(`[...document.querySelectorAll('.st-error .row-fix')].filter((f) => getComputedStyle(f).display !== 'none').length`);
  expect(/not installable yet/.test(s.verdict), s.verdict);
  expect(s.rows.includes('st-error Page links a web app manifest') && s.rows.includes('st-error Service worker registered'), s.rows.join(', '));
  expect(fixes >= 2, `${fixes} fixes shown`);
  expect(await evaluate(`getComputedStyle(document.querySelector('.next')).display !== 'none'`), 'the init command is hidden');
  await shot('missing-1440-light', 1440, 1000, false);
  await shot('missing-375-dark', 375, 812, true);
});

await step('a bad address shows a plain message', async () => {
  await go(APP);
  await evaluate(`(() => { const el = document.querySelector('#url'); el.value = 'mailto:me'; el.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.ask-go').click(); })()`);
  await waitFor(`/not a website address/.test(document.querySelector('.ask-error').textContent)`, 'the error');
});

await step('the seasonal theme shows its chip and accent', async () => {
  await go(`${APP}?season=halloween`);
  const s = await evaluate(`({ season: document.documentElement.dataset.season, chip: getComputedStyle(document.querySelector('.season-chip')).display, line: document.querySelector('.season-note').textContent })`);
  expect(s.season === 'halloween' && s.chip !== 'none' && /Halloween/.test(s.line), JSON.stringify(s));
  await shot('halloween-1440-dark', 1440, 1000, true);
  await shot('halloween-375-light', 375, 812, false);
  await evaluate(`document.querySelector('.season-chip').click()`);
  expect((await evaluate(`document.querySelector('.season-chip').getAttribute('aria-pressed')`)) === 'false', 'the chip did not switch off');
});

await step('no console errors', async () => {
  expect(errors.length === 0, errors.join('\n'));
});

await b.close();
for (const s of [site, closed, open]) s.server.close();
console.log(failed ? `${failed} e2e step(s) failed` : 'all e2e steps passed');
process.exit(failed ? 1 : 0);
