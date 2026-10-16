// Interactive parts of the installkite site, built with Voodoo.js
// (https://kwy404.github.io/Voodoo.js/). Voodoo is loaded with data-manual:
// this module publishes reactive stores and helpers on V.config.globals,
// then starts Voodoo. Pages declare behavior in HTML (v-data, @click,
// v-model, v-show, v-copy-from, v-theme-toggle, v-hotkey). Plain JavaScript
// is used where Voodoo cannot help: the before and after timeline, the
// search index, Skye on her scroll string, the seasonal decorations, the
// reading progress bar and the docs scroll spy.

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

const H = V.reactive({ ba: 'before', baPlay: false, part: 0, cut: false, page: 'home', say: '' });

// ---------- Before and after: one phone, five screens on a loop ----------
// Each step sets data-phase on #ba and CSS does the moving (transform and
// opacity only). The loop pauses off screen, in a hidden tab, and when the
// visitor picks Before or After. With reduced motion it never starts.

const ba = $('#ba');
const PHASES = [
  // [phase, how long it stays, when the finger taps, what it taps]
  ['site', 2600],
  ['prompt', 2300, 1500, 'install'],
  ['home', 2500, 1700, 'icon'],
  ['splash', 1200],
  ['app', 3800],
];
let baStep = 0;
let baTimer = 0;
let baTap = 0;
let baSeen = false;
function baSet(i) {
  baStep = i;
  ba.dataset.phase = PHASES[i][0];
  ba.dataset.tap = '';
  H.ba = i >= 2 ? 'after' : 'before';
}
function baStop() {
  clearTimeout(baTimer);
  clearTimeout(baTap);
}
function baRun() {
  baStop();
  if (!H.baPlay || !baSeen || document.hidden) return;
  const [, stay, tapAt, tap] = PHASES[baStep];
  if (tap) baTap = setTimeout(() => (ba.dataset.tap = tap), tapAt);
  baTimer = setTimeout(() => {
    baSet((baStep + 1) % PHASES.length);
    baRun();
  }, stay);
}
function baShow(which) {
  H.baPlay = false;
  baStop();
  baSet(which === 'after' ? 4 : 0);
  H.say = which === 'after' ? 'After: Acme Bakery runs as an app in its own window, with no address bar.' : 'Before: Acme Bakery is a page in a browser tab.';
}
function baToggle() {
  H.baPlay = !H.baPlay;
  if (H.baPlay && baStep === PHASES.length - 1) baSet(0);
  baRun();
}
if (ba) {
  baSet(0);
  H.baPlay = !reduced;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      baSeen = e.isIntersecting;
      baRun();
    }).observe(ba);
  } else baSeen = true;
  document.addEventListener('visibilitychange', baRun);
  baRun();
}

// ---------- Special dates: Skye in costume, a chip and a few particles ----------
// seasons.js (loaded in the head) has already set data-season on <html>.

const SEASON = window.ikSeasons;
const seasonArt = (name) => link(`assets/seasons/${SEASON.id}/${name}.svg`);
const SEASON_ICON = { newyear: 'fireworks', carnival: 'mask', easter: 'egg', valentine: 'heart', junina: 'bonfire', halloween: 'pumpkin', christmas: 'tree' };

function dressSkye(on) {
  for (const img of $$('[data-season-art]')) {
    if (!img.dataset.plain) img.dataset.plain = img.getAttribute('src');
    img.src = on ? seasonArt(img.dataset.seasonArt) : img.dataset.plain;
  }
  for (const img of $$('.brand img, .skye-kite')) {
    if (!img.dataset.plain) img.dataset.plain = img.getAttribute('src');
    img.src = on ? seasonArt('head') : img.dataset.plain;
  }
  const top = $('.hero, .page-head, .nf');
  let accent = $('.season-accent');
  if (on && top && !accent) {
    accent = document.createElement('span');
    accent.className = 'season-accent';
    accent.setAttribute('aria-hidden', 'true');
    accent.innerHTML = `<img class="art-light" src="${seasonArt('accent')}" width="320" height="180" alt=""><img class="art-dark" src="${seasonArt('accent-dark')}" width="320" height="180" alt="" loading="lazy">`;
    top.append(accent);
  }
  if (accent) accent.hidden = !on;
}

// One canvas over the top of the page, drawn only while it is on screen.
const PARTICLES = {
  halloween: { n: 16, colors: ['#e0752b', '#c9a24a', '#a4492a'], shape: 'leaf', fall: 1, bats: 3 },
  christmas: { n: 34, colors: ['#ffffff', '#eaf4ff'], shape: 'snow', fall: 1 },
  carnival: { n: 30, colors: ['#e85d9a', '#efbb45', '#2fb3a3', '#2b8ff0', '#7b5cd6'], shape: 'confetti', fall: 1 },
  easter: { n: 16, colors: ['#f6c1cf', '#fbe3a6', '#cfe6b8', '#cfe3ff'], shape: 'petal', fall: 1 },
  valentine: { n: 14, colors: ['#e8798a', '#f2a3a8', '#e8485f'], shape: 'heart', fall: -1 },
  junina: { n: 22, colors: ['#ffb534', '#f2702a', '#fff1b0'], shape: 'spark', fall: -1 },
  newyear: { n: 26, colors: ['#ffcd5e', '#f2a3a8', '#8fd0ff', '#fff4dc'], shape: 'spark', fall: 1, bursts: true },
};
let fx = null;
function startParticles() {
  const cfg = PARTICLES[SEASON.id];
  const host = $('.hero, .page-head, .nf');
  if (!cfg || !host || reduced || fx) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'season-fx';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let raf = 0;
  let seen = true;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => {
    w = host.clientWidth;
    h = host.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const make = (top) => ({
    x: rnd(0, w),
    y: top ? (cfg.fall > 0 ? rnd(-40, -10) : rnd(h + 10, h + 40)) : rnd(0, h),
    s: rnd(0.6, 1.2),
    vx: rnd(-0.25, 0.25),
    vy: rnd(0.35, 0.9) * cfg.fall,
    r: rnd(0, 6.28),
    vr: rnd(-0.03, 0.03),
    c: cfg.colors[Math.floor(rnd(0, cfg.colors.length))],
    a: rnd(0.45, 0.85),
    t: rnd(0, 100),
  });
  size();
  const parts = Array.from({ length: Math.round(cfg.n * Math.min(1, w / 1200 + 0.3)) }, () => make(false));
  const bats = Array.from({ length: cfg.bats || 0 }, (_, i) => ({ x: rnd(0, w), y: rnd(24, Math.min(140, h * 0.2)), v: rnd(0.5, 0.9) * (i % 2 ? -1 : 1), t: rnd(0, 6) }));
  const sparks = [];
  const drawShape = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.scale(p.s, p.s);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    if (cfg.shape === 'snow') ctx.arc(0, 0, 2.6, 0, 6.29);
    else if (cfg.shape === 'confetti') ctx.rect(-4, -2, 8, 4);
    else if (cfg.shape === 'spark') ctx.arc(0, 0, 1.8, 0, 6.29);
    else if (cfg.shape === 'heart') {
      ctx.moveTo(0, 4);
      ctx.bezierCurveTo(-7, -1, -6, -7, -3, -7);
      ctx.bezierCurveTo(-1.5, -7, 0, -5.5, 0, -4.5);
      ctx.bezierCurveTo(0, -5.5, 1.5, -7, 3, -7);
      ctx.bezierCurveTo(6, -7, 7, -1, 0, 4);
    } else ctx.ellipse(0, 0, cfg.shape === 'leaf' ? 6 : 4.5, cfg.shape === 'leaf' ? 3 : 2.6, 0, 0, 6.29);
    ctx.fill();
    ctx.restore();
  };
  const drawBat = (b) => {
    const flap = Math.sin(b.t * 6) * 4;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.v < 0 ? -1 : 1, 1);
    ctx.globalAlpha = 0.55;
    const t = document.documentElement.dataset.theme;
    ctx.fillStyle = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches) ? '#9a87c9' : '#3b2f52';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-8, -6 - flap, -16, -3 - flap);
    ctx.quadraticCurveTo(-10, 0, -9, 4);
    ctx.quadraticCurveTo(-4, 2, 0, 4);
    ctx.quadraticCurveTo(4, 2, 9, 4);
    ctx.quadraticCurveTo(10, 0, 16, -3 - flap);
    ctx.quadraticCurveTo(8, -6 - flap, 0, 2);
    ctx.fill();
    ctx.restore();
  };
  let last = 0;
  const frame = (now) => {
    const dt = Math.min(3, last ? (now - last) / 16.7 : 1);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.t += 0.02 * dt;
      p.x += (p.vx + Math.sin(p.t) * 0.3) * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      if (p.y > h + 40 || p.y < -50 || p.x < -40 || p.x > w + 40) parts[i] = make(true);
      drawShape(p);
    }
    for (const b of bats) {
      b.t += 0.016 * dt;
      b.x += b.v * dt;
      b.y += Math.sin(b.t * 2) * 0.3 * dt;
      if (b.x > w + 30) b.x = -30;
      if (b.x < -30) b.x = w + 30;
      drawBat(b);
    }
    if (cfg.bursts) {
      if (sparks.length < 40 && Math.random() < 0.012 * dt) {
        const cx = rnd(w * 0.1, w * 0.9);
        const cy = rnd(30, h * 0.4);
        const col = cfg.colors[Math.floor(rnd(0, cfg.colors.length))];
        for (let k = 0; k < 14; k++) sparks.push({ x: cx, y: cy, vx: Math.cos(k * 0.45) * rnd(1, 1.8), vy: Math.sin(k * 0.45) * rnd(1, 1.8), life: 1, c: col });
      }
      for (let k = sparks.length - 1; k >= 0; k--) {
        const s = sparks[k];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 0.02 * dt;
        s.life -= 0.016 * dt;
        if (s.life <= 0) {
          sparks.splice(k, 1);
          continue;
        }
        ctx.globalAlpha = s.life * 0.8;
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x - 1.2, s.y - 1.2, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (seen && !document.hidden && document.documentElement.dataset.season) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, w, h);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      run();
    }).observe(host);
  }
  if ('ResizeObserver' in window) new window.ResizeObserver(size).observe(host);
  document.addEventListener('visibilitychange', run);
  fx = { run };
  run();
}

function seasonChip() {
  const chip = document.createElement('div');
  chip.className = 'season-chip';
  chip.setAttribute('role', 'group');
  chip.setAttribute('aria-label', 'Seasonal theme');
  const ic = SEASON_ICON[SEASON.id];
  chip.innerHTML = `<span class="season-ic" aria-hidden="true"><img class="art-light" src="${seasonArt(`icon-${ic}`)}" width="28" height="28" alt=""><img class="art-dark" src="${seasonArt(`icon-${ic}-dark`)}" width="28" height="28" alt="" loading="lazy"></span><span class="season-name"></span><button type="button" class="season-switch" role="switch"><span class="sr-only"></span></button>`;
  const name = $('.season-name', chip);
  const sw = $('.season-switch', chip);
  name.textContent = SEASON.label();
  $('.sr-only', sw).textContent = SEASON.label();
  const sync = () => {
    const on = !!SEASON.active;
    sw.setAttribute('aria-checked', String(on));
    sw.title = on ? `Turn off ${SEASON.label()}` : `Turn on ${SEASON.label()}`;
    chip.classList.toggle('is-off', !on);
  };
  sw.addEventListener('click', () => {
    SEASON.set(!SEASON.active);
    sync();
    dressSkye(!!SEASON.active);
    if (SEASON.active) startParticles();
    fx?.run();
  });
  sync();
  document.body.append(chip);
}

if (SEASON?.id) {
  seasonChip();
  if (SEASON.active) {
    dressSkye(true);
    startParticles();
  }
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
  baShow,
  baToggle,
  pick,
  cutChanged,
});

setTimeout(loadSearch, 2500);
// Pages with their own module (the generator) start Voodoo once it has registered its globals.
if ($('script[data-start-later]')) window.__ikStart = () => V.start();
else V.start();
