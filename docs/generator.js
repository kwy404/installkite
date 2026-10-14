// The online PWA manifest and icon generator. Runs entirely in the browser:
// the image is drawn on canvases, encoded to PNG, packed into favicon.ico
// and a zip, and never uploaded. Uses the same rules as the installkite CLI:
// maskable artwork scaled so its farthest visible pixel sits inside the 40%
// safe zone, an opaque 180 pixel apple-touch-icon, and a tile background
// treated as the bleed color.

const V = window.V;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const SIZES = [48, 72, 96, 128, 144, 152, 192, 256, 384, 512];
const MASKABLE = [192, 512];
const SAFE = 0.4;

const G = V.reactive({
  name: 'My App',
  shortName: 'My App',
  description: '',
  theme: '#2b8ff0',
  bg: '#ffffff',
  display: 'standalone',
  startUrl: './',
  dir: 'icons',
  pad: 0.8,
  autoPad: true,
  zone: true,
  ready: false,
  fileName: '',
  warn: '',
  busy: false,
  summary: '',
  over: false,
  splashInk: '#111827',
  themeInk: '#ffffff',
});

let source = null; // { draw(ctx, x, y, w, h), svgText?, w, h }
let analysis = { radius: 0.5, tile: null, bounds: { x: 0, y: 0, w: 1, h: 1 } };
let shortTouched = false;

const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
const hex = (v, fallback) => (isHex(v) ? v : fallback);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function luminance([r, g, b]) {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ink = (h) => (luminance(rgb(h)) > 0.4 ? '#111827' : '#ffffff');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- Loading the image ----------

async function loadFile(file) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) {
    G.warn = 'That file is larger than 15 MB. Use a smaller logo.';
    return;
  }
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  try {
    if (isSvg) await useSvg(await file.text(), file.name);
    else await useBitmap(await createImageBitmap(file), file.name);
  } catch {
    G.warn = 'This image could not be read. Try a PNG or an SVG.';
  }
}

async function useSvg(text, name) {
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = 'async';
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = url;
  });
  const w = img.naturalWidth || 512;
  const h = img.naturalHeight || 512;
  source = { svgText: text, w, h, draw: (ctx, x, y, dw, dh) => ctx.drawImage(img, x, y, dw, dh) };
  G.warn = '';
  ready(name);
}

async function useBitmap(bmp, name) {
  source = { w: bmp.width, h: bmp.height, draw: (ctx, x, y, dw, dh) => ctx.drawImage(bmp, x, y, dw, dh) };
  const warn = [];
  if (Math.min(bmp.width, bmp.height) < 512) warn.push(`The image is ${bmp.width}x${bmp.height}: use 512x512 or larger so big icons stay sharp.`);
  if (bmp.width !== bmp.height) warn.push('The image is not square: it is centered on a square canvas.');
  G.warn = warn.join(' ');
  ready(name);
}

function ready(name) {
  G.fileName = name;
  G.ready = true;
  analysis = analyze();
  if (analysis.tile && G.bg === '#ffffff') G.bg = analysis.tile;
  render();
}

/** Draws the source fitted (contain) into a square canvas. */
function fitted(size) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const s = size / Math.max(source.w, source.h);
  const w = source.w * s;
  const h = source.h * s;
  source.draw(ctx, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

/** Measures the artwork: tile color, content radius and bounds (fractions of the size). */
function analyze() {
  const N = 256;
  const data = fitted(N).getContext('2d').getImageData(0, 0, N, N).data;
  const at = (x, y) => (y * N + x) * 4;
  const corners = [at(0, 0), at(N - 1, 0), at(0, N - 1), at(N - 1, N - 1)].map((o) => [data[o], data[o + 1], data[o + 2], data[o + 3]]);
  const c0 = corners[0];
  const tileLike = corners.every((c) => c[3] >= 250 && Math.abs(c[0] - c0[0]) + Math.abs(c[1] - c0[1]) + Math.abs(c[2] - c0[2]) <= 24);
  const tile = tileLike ? `#${c0.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('')}` : null;
  let max = 0;
  let minX = N;
  let minY = N;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const o = at(x, y);
      if (data[o + 3] <= 8) continue;
      if (tile && Math.abs(data[o] - c0[0]) + Math.abs(data[o + 1] - c0[1]) + Math.abs(data[o + 2] - c0[2]) <= 36) continue;
      const fx = Math.max(Math.abs(x - N / 2), Math.abs(x + 1 - N / 2));
      const fy = Math.max(Math.abs(y - N / 2), Math.abs(y + 1 - N / 2));
      max = Math.max(max, fx * fx + fy * fy);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    tile,
    radius: Math.sqrt(max) / N,
    bounds: maxX < 0 ? { x: 0, y: 0, w: 1, h: 1 } : { x: minX / N, y: minY / N, w: (maxX - minX + 1) / N, h: (maxY - minY + 1) / N },
  };
}

/** The scale of the artwork in maskable icons: automatic (safe zone) or the slider. */
function maskScale() {
  if (!G.autoPad) return G.pad;
  return analysis.radius > 0 ? Math.min(1, SAFE / analysis.radius) : 1;
}

function onBackground(size, scale, color) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const inner = Math.round(size * scale);
  ctx.drawImage(fitted(inner), (size - inner) / 2, (size - inner) / 2);
  return c;
}

function maskable(size) {
  return onBackground(size, maskScale(), hex(G.bg, '#ffffff'));
}

function appleIcon() {
  let scale = 0.8;
  if (!(analysis.tile && analysis.tile === G.bg)) {
    const b = analysis.bounds;
    const extent = Math.max(Math.abs(b.x - 0.5), Math.abs(b.x + b.w - 0.5), Math.abs(b.y - 0.5), Math.abs(b.y + b.h - 0.5)) * 2;
    if (extent > 0) scale = Math.min(1 / extent, 1.25) * 0.8;
  } else scale = 1;
  return onBackground(180, scale, hex(G.bg, '#ffffff'));
}

function paint(target, from) {
  const ctx = target.getContext('2d');
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(from, 0, 0, target.width, target.height);
}

// ---------- Text outputs ----------

function manifest() {
  const dir = (G.dir || '').replace(/^\/+|\/+$/g, '');
  const p = (f) => (dir ? `${dir}/${f}` : f);
  const icons = SIZES.map((s) => ({ src: p(`icon-${s}.png`), sizes: `${s}x${s}`, type: 'image/png', purpose: 'any' }));
  for (const s of MASKABLE) icons.push({ src: p(`maskable-${s}.png`), sizes: `${s}x${s}`, type: 'image/png', purpose: 'maskable' });
  if (source?.svgText) icons.push({ src: p('icon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' });
  const m = { id: G.startUrl || './', name: G.name || 'My App', short_name: G.shortName || G.name || 'App' };
  if (G.description) m.description = G.description;
  Object.assign(m, { start_url: G.startUrl || './', scope: './', display: G.display, theme_color: hex(G.theme, '#2b8ff0'), background_color: hex(G.bg, '#ffffff'), icons });
  return m;
}

function headTags() {
  const dir = (G.dir || '').replace(/^\/+|\/+$/g, '');
  const p = (f) => `/${dir ? `${dir}/` : ''}${f}`;
  return [
    '<link rel="manifest" href="/manifest.webmanifest">',
    `<meta name="theme-color" content="${hex(G.theme, '#2b8ff0')}">`,
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    source?.svgText ? `<link rel="icon" href="${p('icon.svg')}" type="image/svg+xml">` : '<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<meta name="mobile-web-app-capable" content="yes">',
    `<meta name="apple-mobile-web-app-title" content="${esc(G.shortName || G.name || 'App')}">`,
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  ].join('\n');
}

function highlightJson(text) {
  return esc(text).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|(\b\d+\b)/g, (m, str, colon, num) => {
    if (num) return `<span class="j-num">${num}</span>`;
    return colon ? `<span class="j-key">${str}</span>${colon}` : `<span class="j-str">${str}</span>`;
  });
}

function highlightHtml(text) {
  return esc(text).replace(/&lt;(\/?[\w-]+)|([\w-]+)=(&quot;.*?&quot;)/g, (m, tag, attr, val) => (tag ? `&lt;<span class="j-tag">${tag}</span>` : `<span class="j-attr">${attr}</span>=<span class="j-val">${val}</span>`));
}

function fileList() {
  const dir = (G.dir || '').replace(/^\/+|\/+$/g, '');
  const p = (f) => (dir ? `${dir}/${f}` : f);
  const files = [['manifest.webmanifest', 'manifest'], ...SIZES.map((s) => [p(`icon-${s}.png`), `${s} x ${s}`]), ...MASKABLE.map((s) => [p(`maskable-${s}.png`), `${s}, maskable`]), ['apple-touch-icon.png', '180 x 180'], ['favicon.ico', '16, 32, 48'], ['favicon-16x16.png', '16 x 16'], ['favicon-32x32.png', '32 x 32']];
  if (source?.svgText) files.push([p('icon.svg'), 'SVG favicon']);
  files.push(['head.html', 'tags to paste'], ['README.txt', 'what to do next']);
  return files;
}

// ---------- Rendering the previews ----------

let pending = 0;
function render() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(renderNow);
}

function renderNow() {
  if (G.autoPad && source) G.pad = Math.round(maskScale() * 100) / 100;
  G.splashInk = ink(hex(G.bg, '#ffffff'));
  G.themeInk = ink(hex(G.theme, '#2b8ff0'));
  const json = JSON.stringify(manifest(), null, 2);
  $('#gen-manifest').innerHTML = highlightJson(json);
  $('#gen-head').innerHTML = highlightHtml(headTags());
  if (!source) return;
  paint($('#gen-src'), fitted(192));
  const mask = maskable(320);
  paint($('#pv-android'), mask);
  paint($('#pv-ios'), appleIcon());
  paint($('#pv-fav'), fitted(64));
  paint($('#pv-splash-ic'), fitted(384));
  $$('.mask-cv').forEach((c) => paint(c, mask));
  $('#gen-files').innerHTML = fileList()
    .map(([f, d]) => `<li><code>${esc(f)}</code><span>${esc(d)}</span></li>`)
    .join('');
  G.summary = `${fileList().length} files. Maskable artwork at ${Math.round(maskScale() * 100)}% of the icon${G.autoPad ? ', fitted to the safe zone' : ''}.`;
}

// ---------- Encoding: PNG blobs, favicon.ico and the zip ----------

const toBlob = (c) => new Promise((res) => c.toBlob(res, 'image/png'));
const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

function ico(images) {
  const head = 6 + 16 * images.length;
  const total = head + images.reduce((n, i) => n + i.png.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(2, 1, true);
  v.setUint16(4, images.length, true);
  let off = head;
  images.forEach((img, i) => {
    const e = 6 + i * 16;
    out[e] = img.size >= 256 ? 0 : img.size;
    out[e + 1] = img.size >= 256 ? 0 : img.size;
    v.setUint16(e + 4, 1, true);
    v.setUint16(e + 6, 32, true);
    v.setUint32(e + 8, img.png.length, true);
    v.setUint32(e + 12, off, true);
    out.set(img.png, off);
    off += img.png.length;
  });
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip archive with stored (uncompressed) entries: PNGs are compressed already. */
function zip(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data] of files) {
    const n = enc.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + n.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, n.length, true);
    local.set(n, 30);
    const central = new Uint8Array(46 + n.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(42, offset, true);
    central.set(n, 46);
    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const size = centrals.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, size, true);
  ev.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, end], { type: 'application/zip' });
}

async function downloadZip() {
  if (!source || G.busy) return;
  G.busy = true;
  try {
    const dir = (G.dir || '').replace(/^\/+|\/+$/g, '');
    const p = (f) => (dir ? `${dir}/${f}` : f);
    const enc = new TextEncoder();
    const files = [['manifest.webmanifest', enc.encode(`${JSON.stringify(manifest(), null, 2)}\n`)]];
    for (const s of SIZES) files.push([p(`icon-${s}.png`), await bytes(await toBlob(fitted(s)))]);
    for (const s of MASKABLE) files.push([p(`maskable-${s}.png`), await bytes(await toBlob(maskable(s)))]);
    files.push(['apple-touch-icon.png', await bytes(await toBlob(appleIcon()))]);
    const fav = [];
    for (const s of [16, 32, 48]) fav.push({ size: s, png: await bytes(await toBlob(fitted(s))) });
    files.push(['favicon.ico', ico(fav)], ['favicon-16x16.png', fav[0].png], ['favicon-32x32.png', fav[1].png]);
    if (source.svgText) files.push([p('icon.svg'), enc.encode(source.svgText)]);
    files.push(['head.html', enc.encode(`${headTags()}\n`)]);
    files.push([
      'README.txt',
      enc.encode(
        `Your web app manifest and icons, made with installkite (https://kwy404.github.io/installkite/).\n\n1. Copy every file to the root of your site (icons go in ${dir || 'the root'}).\n2. Paste head.html into the <head> of every page.\n3. For offline support and an install button, run in your site folder:\n   npx installkite init\n   It writes a service worker, an offline page and the runtime script, and reuses these settings.\n`,
      ),
    ]);
    const blob = zip(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(G.shortName || G.name || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app'}-pwa-icons.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    G.summary = `Downloaded ${files.length} files, ${(blob.size / 1024).toFixed(0)} kB.`;
  } finally {
    G.busy = false;
  }
}

async function sample() {
  const res = await fetch('assets/mascot-head.svg');
  shortTouched = true;
  G.name = 'Skye Weather';
  G.shortName = 'Skye';
  G.description = 'Kite friendly forecasts';
  G.theme = '#2b8ff0';
  G.bg = '#e6f5ff';
  await useSvg(await res.text(), 'skye.svg');
}

// ---------- Wiring ----------

const drop = $('#gen-drop');
if (drop) {
  $('#gen-file').addEventListener('change', (e) => loadFile(e.target.files[0]));
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    G.over = true;
  });
  drop.addEventListener('dragleave', () => (G.over = false));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    G.over = false;
    loadFile(e.dataTransfer.files[0]);
  });
  document.addEventListener('paste', (e) => {
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'));
    if (file) loadFile(file);
  });
  $('#g-short').addEventListener('input', () => (shortTouched = true));
  // Keep the label in step with the name until it is edited.
  V.watch(
    () => G.name,
    (name) => {
      if (!shortTouched) G.shortName = name.length <= 12 ? name : name.split(/\s+/)[0].slice(0, 12);
    },
  );
  V.effect(() => {
    // Read every field so the effect re-runs when any of them changes.
    void [G.name, G.shortName, G.description, G.theme, G.bg, G.display, G.startUrl, G.dir, G.pad, G.autoPad];
    render();
  });
}

Object.assign(V.config.globals, {
  G,
  sample,
  downloadZip,
  setPad(e) {
    G.pad = Number(e.target.value) / 100;
    G.autoPad = false;
  },
});
window.__ikStart?.();
