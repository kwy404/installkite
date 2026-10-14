// Interactive parts of the installkite site, built with Voodoo.js
// (https://kwy404.github.io/Voodoo.js/). Voodoo is loaded with data-manual:
// this module publishes reactive stores and helpers on V.config.globals,
// then starts Voodoo. Pages declare behavior in HTML (v-data, @click,
// v-model, v-show, v-copy-from, v-theme-toggle, v-hotkey). Plain JavaScript
// is used where Voodoo cannot help: the flight of the app icon in the demo,
// the search index, the reading progress bar and the docs scroll spy.

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

// ---------- The demo: install, home screen, airplane mode ----------

const H = V.reactive({ step: 'site', installed: false, air: false, open: false, splash: false, page: 'home', done: 0, say: '' });
const SAY = {
  dialog: 'The browser asks: install Acme Bakery? installkite.js caught the install prompt and opened it from its button.',
  flying: 'Installing. The app icon flies to the home screen.',
  installed: 'Installed. Acme is on the home screen with its own icon and window. Now turn on airplane mode.',
  air: 'Airplane mode is on. The app opened from the precache: no network needed. Tap Specials, a page you never opened.',
  airBefore: 'Airplane mode is on. Install the site first to see it open offline.',
  offline: 'A page that was never cached shows the offline page, with the pages saved on this device.',
  online: 'Back online. Pages load fresh from the network again.',
};

function askInstall() {
  if (H.installed || H.step === 'flying') return;
  H.step = 'dialog';
  H.say = SAY.dialog;
}
function cancelInstall() {
  H.step = 'site';
  H.say = 'Install cancelled. The button stays available.';
}
function confirmInstall() {
  const from = $('#dlg-icon')?.getBoundingClientRect();
  const slot = $('#ph-slot .app-ic');
  H.step = 'flying';
  H.say = SAY.flying;
  const land = () => {
    H.installed = true;
    H.step = 'installed';
    H.done = Math.max(H.done, 2);
    H.say = SAY.installed;
  };
  if (!from || !slot || reduced || !Element.prototype.animate) {
    land();
    return;
  }
  const to = slot.getBoundingClientRect();
  const kite = document.createElement('span');
  kite.className = 'acme-ic flying-icon';
  Object.assign(kite.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(kite);
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const s = to.width / from.width;
  // A kite like arc: up and over, with a little sway.
  const anim = kite.animate(
    [
      { transform: 'translate(0, 0) rotate(0deg) scale(1)' },
      { transform: `translate(${dx * 0.35}px, ${Math.min(dy, 0) - 70}px) rotate(-14deg) scale(1.25)`, offset: 0.4 },
      { transform: `translate(${dx * 0.75}px, ${dy * 0.55 - 30}px) rotate(10deg) scale(1.1)`, offset: 0.72 },
      { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})` },
    ],
    { duration: 1150, easing: 'cubic-bezier(.45,.05,.3,1)' },
  );
  anim.onfinish = () => {
    kite.remove();
    land();
  };
}
function openApp() {
  if (!H.installed) return;
  H.open = true;
  H.page = 'home';
  H.splash = !reduced;
  setTimeout(() => (H.splash = false), 1400);
  if (H.air) {
    H.done = Math.max(H.done, 3);
    H.say = SAY.air;
  }
}
function closeApp() {
  H.open = false;
}
function airChanged() {
  if (H.air) {
    if (!H.installed) {
      H.say = SAY.airBefore;
      return;
    }
    openApp();
  } else {
    H.say = SAY.online;
  }
}
function resetDemo() {
  Object.assign(H, { step: 'site', installed: false, air: false, open: false, splash: false, page: 'home', done: 0, say: 'The demo is back at the start.' });
}
V.effect(() => {
  if (H.air && H.open && H.page === 'specials' && H.done < 4) {
    H.done = 4;
    H.say = SAY.offline;
  }
});

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
  askInstall,
  cancelInstall,
  confirmInstall,
  openApp,
  closeApp,
  airChanged,
  resetDemo,
});

setTimeout(loadSearch, 2500);
// Pages with their own module (the generator) start Voodoo once it has registered its globals.
if ($('script[data-start-later]')) window.__ikStart = () => V.start();
else V.start();
