// Interactive parts of the installkite site, built with Voodoo.js
// (https://kwy404.github.io/Voodoo.js/). Voodoo is loaded with data-manual:
// this module publishes reactive stores and helpers on V.config.globals,
// then starts Voodoo. Pages declare behavior in HTML (v-data, @click,
// v-model, v-show, v-copy-from, v-theme-toggle, v-hotkey). Plain JavaScript
// is used where Voodoo cannot help: the origami fold (one CSS variable per
// frame), the search index, Skye on her scroll string, the reading progress
// bar and the docs scroll spy.

const V = window.V;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const S = V.reactive({ ready: 0 });
// Search results link relative to the site root (the folder of this script),
// so they also work from the 404 page, which is served at any depth.
const ROOT = new URL('.', import.meta.url).href;
const link = (u) => new URL(u, ROOT).href;

// ---------- Search (Ctrl K) ----------

let index = [];
let loading = null;
function loadSearch() {
  if (!loading) {
    loading = fetch(link('search.json'))
      .then((r) => r.json())
      .then((j) => {
        index = j.map((e) => ({ ...e, hay: `${e.title} ${e.sub} ${e.kind}`.toLowerCase() }));
        S.ready++;
      })
      .catch(() => {
        loading = null;
      });
  }
  return loading;
}
function hits(q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return index.filter((e) => e.kind === 'Page' || e.kind === 'Guide').slice(0, 8);
  const words = query.split(/\s+/);
  return index
    .map((e) => {
      if (!words.every((w) => e.hay.includes(w))) return null;
      const t = e.title.toLowerCase();
      const score = (t.startsWith(query) ? 4 : t.includes(query) ? 2 : 0) + (e.kind === 'Guide' || e.kind === 'Command' ? 1 : 0);
      return { e, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.e);
}
const dialog = $('#search');
function openSearch() {
  if (!dialog) return;
  loadSearch();
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => $('#search-input')?.focus());
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-search-open]')) openSearch();
  if (dialog?.open && e.target.closest('#search a[href]')) dialog.close();
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) {
    e.preventDefault();
    openSearch();
  }
});

// ---------- The home page state ----------

const H = V.reactive({ stage: 0, part: 0, cut: false, page: 'home', say: '' });
const SAY = [
  'Folding. The manifest and the icons turn the page into an app with a name, colors and a square icon.',
  'Flying. installkite.js caught the install prompt and the app takes off.',
  '',
  'Landed. Acme Bakery is on the home screen with its own icon. Now cut the string further down the page.',
];

// ---------- The origami fold: one variable, --f, from 0 to 1 ----------

const stage = $('#fold-stage');
const range = $('#fold-range');
let f = 0;
let anim = 0;
function measure() {
  if (!stage) return;
  const home = $('#fold-home');
  const slot = $('#fold-slot');
  const s = stage.getBoundingClientRect();
  const h = home.getBoundingClientRect();
  const t = slot.getBoundingClientRect();
  const hx = h.left + h.width / 2 - s.left;
  const hy = h.top + h.height / 2 - s.top;
  const sx = t.left + t.width / 2 - s.left;
  const sy = t.top + t.height / 2 - s.top;
  stage.style.setProperty('--dx', `${(sx - hx).toFixed(1)}px`);
  stage.style.setProperty('--dy', `${(sy - hy).toFixed(1)}px`);
  stage.style.setProperty('--k', (slot.offsetWidth / home.offsetWidth).toFixed(3));
  stage.style.setProperty('--pr', getComputedStyle($('.paper-phone')).rotate || '0deg');
  stage.style.setProperty('--sx', `${sx.toFixed(1)}px`);
  stage.style.setProperty('--sy', `${sy.toFixed(1)}px`);
  // The arc of the flight: its peak matches the 110px lift in site.css.
  $('#fold-path').setAttribute('d', `M${hx.toFixed(1)} ${hy.toFixed(1)} Q${((hx + sx) / 2).toFixed(1)} ${((hy + sy) / 2 - 220).toFixed(1)} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
}
function setF(v) {
  f = Math.min(1, Math.max(0, v));
  stage.style.setProperty('--f', f.toFixed(4));
  if (range) range.value = String(Math.round(f * 100));
  const st = f >= 1 ? 3 : f >= 0.55 ? 1 : 0;
  if (st !== H.stage) {
    H.stage = st;
    if (f > 0) H.say = SAY[st];
  }
  stage.classList.toggle('is-landed', f >= 1);
}
function stop() {
  cancelAnimationFrame(anim);
  anim = 0;
}
function foldGo() {
  if (!stage || f >= 1) return;
  stop();
  measure();
  if (reduced) {
    setF(1);
    return;
  }
  const from = f;
  const dur = 2800 * (1 - from);
  const t0 = window.performance.now();
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  const tick = (now) => {
    const x = Math.min(1, (now - t0) / dur);
    setF(from + (1 - from) * ease(x));
    anim = x < 1 ? requestAnimationFrame(tick) : 0;
  };
  anim = requestAnimationFrame(tick);
}
function foldTo(v) {
  stop();
  setF(Number(v));
}
function foldReset() {
  stop();
  setF(0);
  H.say = 'The page is flat again.';
}
if (stage) {
  measure();
  if ('ResizeObserver' in window) new window.ResizeObserver(measure).observe(stage);
  addEventListener('resize', measure, { passive: true });
  document.fonts?.ready.then(measure);
}

// ---------- The assembly manual and cutting the string ----------

function pick(i) {
  H.part = i;
  const panel = $('#part-panel');
  if (panel && window.innerWidth < 1100) {
    const r = panel.getBoundingClientRect();
    if (r.top > innerHeight * 0.7 || r.bottom < 80) panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
}
function cutChanged() {
  H.say = H.cut
    ? 'String cut, no network. The app still opens from the precache. Open Specials, a page this phone never visited.'
    : 'String tied again. Pages load fresh from the network.';
}
V.effect(() => {
  if (H.cut && H.page === 'specials') H.say = 'A page that was never cached shows the offline page, with the pages saved on this device.';
});

// ---------- Skye on her string, in the margin of wide screens ----------

const fly = $('.skye-fly');
if (fly && !reduced) {
  const kite = $('.skye-kite', fly);
  const path = $('.skye-string path', fly);
  const head = $('.hero, .page-head, .nf');
  const foot = $('.site-foot');
  const pos = { x: 0, y: 0, r: 0 };
  let target = { x: 0, y: 0, r: 0 };
  let lastY = window.scrollY;
  let raf = 0;
  const wide = matchMedia('(min-width: 1380px)');
  const aim = () => {
    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const gutter = Math.max(0, (vw - 1216) / 2);
    const p = window.scrollY / Math.max(1, document.documentElement.scrollHeight - vh);
    const v = Math.max(-30, Math.min(30, (window.scrollY - lastY) * 0.6));
    lastY = window.scrollY;
    target = { x: vw - gutter / 2 - 30 + Math.sin(p * 13) * Math.min(18, gutter / 5), y: vh * 0.26 + Math.sin(p * 8) * vh * 0.07 + v * 1.5, r: Math.sin(p * 17) * 8 - v * 0.5 };
    const show = wide.matches && (!head || head.getBoundingClientRect().bottom < vh * 0.35) && (!foot || foot.getBoundingClientRect().top > vh * 0.6);
    fly.classList.toggle('is-on', show);
  };
  const step = () => {
    pos.x += (target.x - pos.x) * 0.08;
    pos.y += (target.y - pos.y) * 0.08;
    pos.r += (target.r - pos.r) * 0.08;
    kite.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) rotate(${pos.r.toFixed(2)}deg)`;
    const vw = document.documentElement.clientWidth;
    const ax = vw - 8;
    const ay = innerHeight + 12;
    const kx = pos.x + 30;
    const ky = pos.y + 52;
    path.setAttribute('d', `M${kx.toFixed(1)} ${ky.toFixed(1)} Q${((kx + ax) / 2 - 26).toFixed(1)} ${((ky + ay) / 2 + 60).toFixed(1)} ${ax} ${ay}`);
    const moving = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) + Math.abs(target.r - pos.r) > 0.3;
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  let settle = 0;
  const kick = () => {
    if (!wide.matches) {
      fly.classList.remove('is-on');
      return;
    }
    aim();
    if (!raf) raf = requestAnimationFrame(step);
    // Settle back to the resting sway once scrolling stops.
    window.clearTimeout(settle);
    settle = setTimeout(() => {
      aim();
      if (!raf) raf = requestAnimationFrame(step);
    }, 180);
  };
  if (wide.matches) {
    aim();
    Object.assign(pos, target);
    step();
  }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
}

// ---------- Reading progress and the docs scroll spy ----------

const bar = $('.read-progress');
if (bar) {
  const main = $('.read-main');
  const update = () => {
    const r = main.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.3 - r.top) / Math.max(1, r.height - innerHeight * 0.5)));
    bar.style.setProperty('--p', p.toFixed(4));
  };
  addEventListener('scroll', update, { passive: true });
  update();
}
const spyLinks = $$('.docs-side a, .read-toc a');
if (spyLinks.length && 'IntersectionObserver' in window) {
  const byId = new Map(spyLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const seen = new Set();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target.id);
        else seen.delete(e.target.id);
      }
      const first = [...byId.keys()].find((id) => seen.has(id));
      spyLinks.forEach((a) => a.classList.toggle('is-active', a === byId.get(first)));
    },
    { rootMargin: '-80px 0px -55% 0px' },
  );
  for (const id of byId.keys()) {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  }
}

Object.assign(V.config.globals, {
  S,
  H,
  hits: (q) => hits(q),
  link,
  go(q, sel) {
    const r = hits(q)[sel];
    if (!r) return;
    dialog?.close();
    location.href = link(r.url);
  },
  foldGo,
  foldTo,
  foldReset,
  pick,
  cutChanged,
});

setTimeout(loadSearch, 2500);
// Pages with their own module (the generator) start Voodoo once it has registered its globals.
if ($('script[data-start-later]')) window.__ikStart = () => V.start();
else V.start();
