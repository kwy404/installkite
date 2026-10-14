// The home page: the paper kite workshop. The hero is a live demo: the
// visitor presses Install (or drags the fold slider) and the bakery web page
// folds like origami into an app icon that flies onto a paper phone. Then a
// kite assembly manual lays out every generated part with its real code, and
// "cut the string" takes the network away while the app keeps working.
import { GUIDES, GITHUB, SITE, esc, hills } from './layout.mjs';
import { artTile, icon, scene } from './ui.mjs';

export const FAQ = [
  [
    'How do I make my website installable?',
    'A browser offers to install a site when it has a web app manifest with a name, a start URL, a standalone display mode and 192 and 512 pixel icons, is served over HTTPS and registers a service worker. <code>npx installkite init</code> writes all of that and links it from your pages, then <code>npx installkite doctor</code> checks each rule.',
  ],
  [
    'Can I convert a website to an app without a framework?',
    'Yes. installkite works on plain HTML folders, and on sites built with Vite, Next.js (static export), Astro, WordPress or Laravel. Your site keeps working as a website, and visitors can also install it as an app with its own icon and window.',
  ],
  [
    'Does it work on iPhone and iPad?',
    'iOS Safari installs sites through Share, then Add to Home Screen, and never fires an install prompt. The installkite runtime detects iOS and shows a short sheet with those three steps, and the generated apple-touch-icon is the opaque 180 pixel PNG iOS wants.',
  ],
  [
    'What happens offline?',
    'The service worker precaches your built pages and assets with content hashes, so the start page opens offline on first launch. Pages are network first with a three second timeout, so slow networks fall back to the cached copy, and a page that was never visited shows your offline page.',
  ],
  [
    'How do updates reach people who installed the app?',
    'Run <code>npx installkite build</code> after each site build. It re-hashes the files and rewrites sw.js, the browser notices the new worker, and the runtime shows a "Refresh to update" toast. Unchanged files are copied from the old cache, not downloaded again.',
  ],
  [
    'Does it work on GitHub Pages and Netlify?',
    'Yes. installkite detects a GitHub Pages project site from your git remote and writes the <code>/repo/</code> base path into every URL, or use <code>--relative</code> to work under any folder. Both hosts serve HTTPS, which installs need.',
  ],
  ['Is installkite free?', 'Yes, it is free and open source under the MIT license, with no account, no tracking and no runtime dependencies. The runtime script is about 4.4 kB gzipped.'],
];

const FOLD_STEPS = [
  ['Fold', 'The manifest and the icons turn the page into an app: a name, colors and a square icon.'],
  ['Fly', 'installkite.js catches the install prompt. One press and the app takes off.'],
  ['Land', 'The app lands on the home screen with its own icon, window and splash screen.'],
];

/** The Acme Bakery page, drawn small. Each fold quadrant shows a quarter of it. */
function miniSite() {
  return `<div class="mini"><div class="mini-bar"><span class="mini-logo"></span><b>Acme Bakery</b><span class="mini-nav"><i></i><i></i><i></i></span></div><div class="mini-hero"><b>Fresh bread daily</b><i></i><i class="short"></i><span class="mini-btn">Order now</span></div><div class="mini-cards"><span style="--b:#e9b872"><em>Sourdough</em></span><span style="--b:#f2c36b"><em>Croissant</em></span><span style="--b:#b9845a"><em>Rye loaf</em></span></div></div>`;
}

function foldStage() {
  const face = `<div class="face">${miniSite()}</div>`;
  const back = '<div class="face back"></div>';
  const tiles = ['#c5dcc0', '#d9c9ea', '#a9cff7', '#f2a3a8', '#e8d3b0', '#c5dcc0', '#d9c9ea', '#e8d3b0', '#a9cff7', '#f2a3a8', '#c5dcc0', '#d9c9ea']
    .map((c, i) => (i === 4 ? '<span class="ph-tile ph-slot" id="fold-slot"><b class="ph-label">Acme</b></span>' : `<span class="ph-tile" style="--t:${c}"></span>`))
    .join('');
  return `<div class="fold-stage" id="fold-stage" style="--f:0">
  <svg class="fold-path" aria-hidden="true" focusable="false"><path id="fold-path" d="M0 0"/></svg>
  <div class="fold-page-wrap">
    <p class="hand fold-note">acme-bakery.example</p>
    <div class="fold-page" id="fold-page" aria-hidden="true">
      <div class="fq fq-tl">${face}</div>
      <div class="fq fq-bl">${face}${back}</div>
      <div class="fold-right"><div class="fq fq-tr">${face}${back}</div><div class="fq fq-br">${face}${back}</div></div>
    </div>
    <span class="fold-home" id="fold-home" aria-hidden="true"></span>
  </div>
  <div class="fold-icon" id="fold-icon" aria-hidden="true"><span class="acme-ic"></span><span class="fold-tail"><i></i><i></i><i></i></span></div>
  <div class="paper-phone" role="img" aria-label="A paper phone home screen with an empty slot for the Acme Bakery app">
    <div class="ph-screen"><div class="ph-status"><span>9:41</span><span class="ph-dots"><i></i><i></i><i></i></span></div><div class="ph-grid">${tiles}</div><div class="ph-dock"><i></i><i></i><i></i><i></i></div></div>
  </div>
  <div class="confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
</div>`;
}

// ---------- The kite assembly manual ----------

const PART_SHAPES = {
  sail: '<path class="cut" d="M60 6 L104 44 L60 84 L16 44 Z"/><path class="crease" d="M60 6 V84 M16 44 H104"/>',
  bows: '<path class="string" d="M8 30 C30 10 46 60 70 40 S100 30 114 56"/><path class="cut" d="M14 18 l12 8 -12 8 Z M38 30 l10 7 -10 7 Z M60 34 l8 6 -8 6 Z M84 34 l6 5 -6 5 Z M104 46 l5 4 -5 4 Z"/>',
  spars: '<rect class="cut" x="56" y="4" width="8" height="82" rx="3"/><rect class="cut" x="14" y="36" width="92" height="8" rx="3"/><circle class="knot" cx="60" cy="40" r="6"/>',
  patch: '<rect class="cut" x="14" y="10" width="92" height="70" rx="10"/><path class="crease" d="M40 54 a10 10 0 0 1 3 -19 a13 13 0 0 1 24 -3 a10 10 0 0 1 10 22 Z"/>',
  bridle: '<path class="string" d="M16 14 L60 70 M60 12 L60 70 M104 14 L60 70"/><circle class="knot" cx="16" cy="14" r="5"/><circle class="knot" cx="60" cy="12" r="5"/><circle class="knot" cx="104" cy="14" r="5"/><circle class="cut" cx="60" cy="74" r="9"/>',
  handle: '<rect class="cut" x="30" y="22" width="60" height="46" rx="6"/><rect class="knot" x="22" y="14" width="76" height="10" rx="5"/><rect class="knot" x="22" y="66" width="76" height="10" rx="5"/><path class="string" d="M30 36 H90 M30 46 H90 M30 56 H90"/>',
  windsock: '<path class="cut" d="M14 22 L100 34 V56 L14 68 Z"/><path class="crease" d="M40 26 V64 M66 30 V60"/><path class="string" d="M14 22 V86"/>',
};

export function partsOf(ctx) {
  const size = (path) => (ctx.initFiles.find((f) => f.path === path) || {}).size || '';
  const iconFiles = ctx.initFiles.filter((f) => /icon|favicon|screenshot/.test(f.note) || /^icons\//.test(f.path));
  return [
    { id: 'manifest', name: 'The sail', file: 'manifest.webmanifest', shape: 'sail', size: size('manifest.webmanifest'), color: 'must', what: 'The sail carries your name and colors into the sky. The manifest gives the browser the app name, the home screen label, theme and background colors, the start URL, the display mode, every icon and shortcuts taken from your navigation.' },
    { id: 'icons', name: 'The tail bows', file: `${iconFiles.length} image files`, shape: 'bows', size: '48 to 512 px', color: 'pers', what: 'Ten manifest sizes, two maskable icons with the artwork scaled into the safe zone, the opaque 180 pixel apple-touch-icon, favicon.ico, favicon PNGs, an SVG favicon and placeholder screenshots. All from one logo, resized in pure JavaScript.' },
    { id: 'sw', name: 'The spars', file: 'sw.js', shape: 'spars', size: size('sw.js'), color: 'kite', what: 'The frame that keeps the app in the air. One settings line lists every precached file with its content hash, then the strategies follow: cache first for the precache, network first pages with a timeout, stale while revalidate assets and a capped image cache.' },
    { id: 'offline', name: 'The spare sail', file: 'offline.html', shape: 'patch', size: size('offline.html'), color: 'sage', what: 'When a page was never visited and the network is gone, the worker shows this page instead of the browser error. It is self contained, in your colors, with your icon inlined and links to the pages saved on the device.' },
    { id: 'head', name: 'The bridle', file: 'head tags', shape: 'bridle', size: 'one marked block', color: 'rose', what: 'The knots that tie every page to the kite. init writes one block between installkite:start and installkite:end into each page: the manifest link, theme color, favicons, the apple-touch-icon and the runtime script. Run it twice and the block is updated in place.' },
    { id: 'install', name: 'The handle', file: 'installkite.js', shape: 'handle', size: size('installkite.js'), color: 'kite', what: 'What the visitor holds. The runtime registers the worker after load, catches beforeinstallprompt and shows an install button, or turns any element with data-installkite-install into one. On iPhone it shows the Add to Home Screen steps instead.' },
    { id: 'update', name: 'The wind sock', file: 'installkite build', shape: 'windsock', size: 'after each build', color: 'must', what: 'It shows which way the wind turned. Run build after every site build: it hashes the files again and rewrites sw.js, the browser notices the new worker and the runtime shows a "Refresh to update" toast.' },
  ];
}

function manual(ctx) {
  const parts = partsOf(ctx);
  const pieces = parts
    .map(
      (p, i) => `<button type="button" class="part part-${p.color}" id="part-btn-${p.id}" @click="pick(${i})" :aria-pressed="H.part === ${i} ? 'true' : 'false'" aria-controls="part-panel">
        <span class="part-no">${i + 1}</span>
        <svg class="part-shape" viewBox="0 0 120 90" aria-hidden="true" focusable="false">${PART_SHAPES[p.shape]}</svg>
        <span class="part-name">${p.name}</span>
        <span class="part-file">${esc(p.file)}</span>
        <span class="part-size hand">${esc(p.size)}</span>
      </button>`,
    )
    .join('');
  const panels = parts
    .map(
      (p, i) => `<div class="part-detail" v-show="H.part === ${i}"${i ? ' style="display:none"' : ''}>
        <p class="part-head"><span class="part-no">${i + 1}</span><span><b>${p.name}</b><small>${esc(p.file)}<span aria-hidden="true">, </span>${esc(p.size)}</small></span></p>
        <p class="part-what">${p.what}</p>
        ${ctx.partFrames[p.id]}
      </div>`,
    )
    .join('');
  const files = ctx.initFiles.map((f) => `<li><span class="ft-name">${esc(f.path)}</span><span class="ft-dots" aria-hidden="true"></span><span class="ft-size">${esc(f.size)}</span></li>`).join('');
  return `<div class="manual">
    <div class="pattern-sheet">
      <div class="sheet-head"><p class="sheet-title">Pattern no. 1<span>Make any website installable</span></p><p class="hand sheet-note">Skill level: one command. Cut along the dashed lines.</p></div>
      <div class="parts" role="group" aria-label="Parts of the kit">${pieces}<p class="assembly hand"><b>Assembly</b>Run npx installkite init in the site folder. Tools: none. Glue: none. Wind: any HTTPS host.</p></div>
      <details class="bom"><summary>${icon('scissors')}Bill of materials: all ${ctx.initFiles.length} files from a real run</summary><ul class="bom-list">${files}</ul></details>
    </div>
    <div class="part-panel" id="part-panel" aria-live="polite">${panels}
      <div class="part-nav"><button type="button" class="btn btn-ghost btn-sm" @click="pick((H.part + ${parts.length - 1}) % ${parts.length})">${icon('arrow', 'ic flip')}Previous part</button><button type="button" class="btn btn-ghost btn-sm" @click="pick((H.part + 1) % ${parts.length})">Next part${icon('arrow')}</button></div>
    </div>
  </div>`;
}

// ---------- Cut the string ----------

function cutScene() {
  return `<div class="cut-stage" :class="{ 'is-cut': H.cut }">
  <svg class="cut-cloud" viewBox="0 0 120 76" aria-hidden="true" focusable="false"><path d="M14 66 a20 20 0 0 1 6 -38 a28 28 0 0 1 52 -6 a22 22 0 0 1 34 22 a16 16 0 0 1 -4 22 Z"/><path class="wifi" d="M46 44 a20 20 0 0 1 28 0 M38 36 a31 31 0 0 1 44 0"/><circle class="wifi-dot" cx="60" cy="52" r="3.5"/></svg>
  <p class="cut-label hand" aria-hidden="true"><span class="on-label">the network</span><span class="off-label">no network</span></p>
  <svg class="cut-string" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="s-left" pathLength="100" d="M21 41 C22 58 30 64 40 62"/><path class="s-right" pathLength="100" d="M56.5 34 C53 50 47 60 40 62"/></svg>
  <span class="cut-scissors" aria-hidden="true">${icon('scissors')}</span>
  <div class="app-phone">
    <div class="ap-status"><span>9:41</span><span class="ap-net"><span class="net-on">${icon('signal')}${icon('wifi')}</span><span class="net-off">${icon('wifi-off')}</span>${icon('battery')}</span></div>
    <div class="ap-bar"><span class="acme-ic sm"></span><b>Acme Bakery</b></div>
    <div class="ap-tabs" role="tablist" aria-label="App pages">
      <button type="button" role="tab" :aria-selected="H.page === 'home' ? 'true' : 'false'" @click="H.page = 'home'">Home</button>
      <button type="button" role="tab" :aria-selected="H.page === 'specials' ? 'true' : 'false'" @click="H.page = 'specials'">Specials</button>
    </div>
    <div class="ap-page" v-show="H.page === 'home' || !H.cut">
      <p class="ap-pill" v-show="H.cut">${icon('check')}Offline, from the cache</p>
      <b class="ap-h" v-text="H.page === 'home' ? 'Fresh bread daily' : 'This week: rye and figs'"></b>
      <i></i><i></i><i class="short"></i>
      <div class="ap-cards"><span style="--b:#e9b872"></span><span style="--b:#f2c36b"></span></div>
    </div>
    <div class="ap-off" v-show="H.page === 'specials' && H.cut" style="display:none">
      <span class="off-ic"><span class="acme-ic"></span><span class="off-badge">${icon('wifi-off')}</span></span>
      <b>You are offline</b>
      <small>Acme Bakery could not reach the network. This is offline.html.</small>
      <span class="off-btn">${icon('refresh')}Try again</span>
      <span class="off-saved">Saved on this device</span>
      <span class="off-links"><span>Home</span><span>Menu</span></span>
    </div>
  </div>
</div>`;
}

export function homeBody(ctx) {
  const steps = FOLD_STEPS.map(([t, d], i) => `<li :class="{ 'is-done': H.stage > ${i}, 'is-now': H.stage === ${i} }"><span class="step-no">${i + 1}</span><span><b>${t}</b><small>${d}</small></span></li>`).join('');
  const strategies = [
    ['Precached files', 'cache first', 'Built pages, CSS, JS and icons are saved on install, each with a content hash. A new version only fetches what changed.', ['install', 'cache', 'serve']],
    ['Page navigations', 'network first, 3 s', 'Fresh HTML when the network answers in time. On a slow or cut string: the cached page, then the offline page.', ['network', 'timeout', 'cache', 'offline']],
    ['Scripts, styles, fonts', 'stale while revalidate', 'The cached copy answers at once and the network refreshes it in the background, capped at 120 entries.', ['cache', 'serve', 'refresh']],
    ['Images', 'cache first, capped', 'Up to 60 images for 30 days, oldest out first, so photo heavy pages do not fill the disk.', ['cache', 'expire']],
  ]
    .map(([t, s, d, flow], i) => `<li class="knot-card"><span class="knot-no" aria-hidden="true">${i + 1}</span><div><h3>${t}<span class="tag">${s}</span></h3><p>${d}</p><ol class="flow" aria-label="Steps">${flow.map((f) => `<li>${f}</li>`).join('')}</ol></div></li>`)
    .join('');
  const guides = GUIDES.map((g) => {
    const m = ctx.guides.find((x) => x.meta.slug === g.slug).meta;
    return `<a href="${g.slug}.html" class="booklet">${artTile(g.icon, 'art-ic booklet-ic')}<span><b>${esc(m.h1)}</b><small>${esc(m.description)}</small><em class="hand">${esc(m.readTime)}</em></span></a>`;
  }).join('');
  const faq = FAQ.map(([q, a], i) => `<details class="collapse note-fold" name="faq"${i === 0 ? ' open' : ''}><summary class="collapse-title">${q}</summary><div class="collapse-content"><p>${a}</p></div></details>`).join('');
  const recipes = ['Plain HTML', 'Vite', 'Next.js', 'Astro', 'WordPress', 'Laravel', 'GitHub Pages', 'Netlify']
    .map((n, i) => `<li style="--r:${[-4, 3, -2, 5, -5, 2, -3, 4][i]}deg;--y:${Math.round(2 * ((i + 0.5) / 8) * (1 - (i + 0.5) / 8) * 52)}px"><a class="peg-tag" href="docs.html#recipe-${n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}"><span class="peg" aria-hidden="true"></span>${n}</a></li>`)
    .join('');
  return `<section class="hero" id="demo" v-data>
  <div class="hero-sky" aria-hidden="true">
    <span class="sun"></span>
    <svg class="garland" viewBox="0 0 1440 90" preserveAspectRatio="none" focusable="false"><path d="M-10 6 Q720 86 1450 6"/></svg>
    <div class="flags">${Array.from({ length: 15 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>
    <span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span>
    <span class="stars"></span>
  </div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="tag-kicker"><span class="tag-hole"></span>Free and open source, one command</p>
      <h1>Make any website <em>installable</em> and offline capable</h1>
      <p class="lead">installkite writes the web app manifest, every icon size from one image, a service worker with an offline page and the head tags. Your site folds into an app that installs on Android, iPhone, Windows and macOS.</p>
      <div class="ticket"><span class="ticket-dollar" aria-hidden="true">$</span><code id="hero-cmd">npx installkite init</code><button type="button" class="ticket-copy" v-copy-from="#hero-cmd" aria-label="Copy the command">${icon('copy')}<span>Copy</span></button></div>
      <div class="hero-cta"><a href="#what" class="btn btn-primary">See what it writes${icon('arrow')}</a><a href="generator.html" class="btn btn-outline">${icon('image')}Icon and manifest generator</a></div>
      <ul class="hero-facts hand"><li><b>${esc(ctx.sizes.runtime)}</b> runtime, gzipped</li><li><b>0</b> runtime dependencies</li><li><b>${ctx.tests}</b> tests</li></ul>
    </div>
    <div class="hero-demo">
      ${foldStage()}
      <div class="fold-controls">
        <button type="button" class="btn btn-primary" @click="foldGo()" :disabled="H.stage > 2">${icon('download')}<span v-text="H.stage > 2 ? 'Installed' : 'Install Acme Bakery'">Install Acme Bakery</span></button>
        <label class="fold-range"><span class="hand">or fold it by hand</span><input type="range" id="fold-range" class="range range-sm" min="0" max="100" step="1" value="0" aria-label="Fold the page into an app" @input="foldTo($event.target.value / 100)"></label>
        <button type="button" class="btn btn-ghost btn-sm" @click="foldReset()" aria-label="Unfold the page">${icon('reset')}<span class="reset-label">Unfold</span></button>
      </div>
      <ol class="fold-steps">${steps}</ol>
      <p class="sr-only" aria-live="polite" v-text="H.say"></p>
    </div>
  </div>
  ${hills('hills hero-hills')}
</section>

<section class="band" id="what">
  <div class="wrap">
    <div class="section-head split">
      <div>
        <p class="tag-kicker"><span class="tag-hole"></span>The kit, part by part</p>
        <h2>One command writes all of it</h2>
        <p class="lead">Run it in any static site folder, or in a Vite, Next.js or Astro project. It scans your pages, takes the name and colors from your home page, finds your logo and asks a few questions (or none with <code>--yes</code>). Run it twice and nothing changes. Pick a part to see the real file it wrote for a three page bakery site.</p>
      </div>
      ${scene('workbench', { cls: 'scene scene-head' })}
    </div>
    ${manual(ctx)}
    <div class="run-row">
      <div>
        <h3 class="mini-title">${icon('terminal')}The whole run, as printed</h3>
        <ul class="checks">
          <li>${icon('check')}<span><code>--dry-run</code> prints a diff of every file before writing</span></li>
          <li>${icon('check')}<span>Your own favicon, manifest link or theme color are kept, never duplicated</span></li>
          <li>${icon('check')}<span><code>installkite build</code> refreshes the precache after each site build</span></li>
        </ul>
      </div>
      ${ctx.frames.init}
    </div>
  </div>
</section>

<section class="band band-dusk" id="offline">
  <div class="wrap">
    <div class="section-head">
      <p class="tag-kicker"><span class="tag-hole"></span>Offline, by default</p>
      <h2>Cut the string. The app keeps flying.</h2>
      <p class="lead">The string is the network. Cut it and the installed app still opens from the precache. Open Specials, a page this phone never visited, and the worker answers with the offline page instead of a browser error.</p>
    </div>
    <div class="cut-grid">
      <div class="cut-demo">
        ${cutScene()}
        <label class="cut-toggle"><input type="checkbox" class="toggle toggle-lg" role="switch" v-model="H.cut" @change="cutChanged()"><span>${icon('scissors')}<b v-text="H.cut ? 'String cut: offline' : 'Cut the string'">Cut the string</b></span></label>
      </div>
      <ol class="knots">${strategies}</ol>
    </div>
  </div>
</section>

<section class="band" id="doctor">
  <div class="wrap two">
    <div>
      <p class="tag-kicker"><span class="tag-hole"></span>installkite doctor</p>
      <h2>A pre flight inspection, with fixes</h2>
      <p class="lead">Doctor checks the rules browsers use to decide whether a site can be installed, then the parts that make it work offline. Every failure comes with the fix. Point it at the files on disk or at a live URL with <code>--url</code>.</p>
      ${scene('inspection', { cls: 'scene scene-side' })}
    </div>
    <div class="term-col">
      <div class="tabs tabs-boxed doctor-tabs" role="tablist">
        <input type="radio" name="doctor-tabs" class="tab" aria-label="Before init" checked>
        <div class="tab-content" role="tabpanel">${ctx.frames.doctorBefore}</div>
        <input type="radio" name="doctor-tabs" class="tab" aria-label="After init">
        <div class="tab-content" role="tabpanel">${ctx.frames.doctorAfter}</div>
      </div>
      <ul class="checks">
        <li>${icon('check')}<span>Manifest fields, icon files and their real pixel sizes</span></li>
        <li>${icon('check')}<span>HTTPS, scope, start_url reachable and inside scope</span></li>
        <li>${icon('check')}<span>Service worker registered, scope, fetch handler, stale precache</span></li>
      </ul>
    </div>
  </div>
</section>

<section class="band band-kraft" id="runtime">
  <div class="wrap two">
    <div>
      <p class="tag-kicker"><span class="tag-hole"></span>installkite.js</p>
      <h2>A runtime the size of a small image</h2>
      <p class="lead">One script tag registers the service worker and adds the install button, the iOS sheet, the update toast and the offline badge. Each part is optional, styled from your theme color and translatable. Listen to its events to build your own install flow.</p>
      ${ctx.frames.runtime}
    </div>
    <div class="cutouts" aria-label="Runtime interface previews">
      <div class="cutout co-fab"><span class="tape" aria-hidden="true"></span><span class="uip-go">${icon('download')}Install app</span><span class="uip-x">${icon('x')}</span></div>
      <div class="cutout co-toast"><span class="tape" aria-hidden="true"></span><span>A new version is available</span><span class="uip-go">Refresh</span></div>
      <div class="cutout co-badge"><span class="tape" aria-hidden="true"></span><i></i>You are offline</div>
      <div class="cutout co-sheet"><span class="tape" aria-hidden="true"></span><b>Add to your Home Screen</b><span>${icon('upload')}Tap the Share button in the toolbar</span><span>${icon('sparkle')}Tap "Add to Home Screen"</span><span>${icon('check')}Tap "Add" in the top corner</span></div>
    </div>
  </div>
</section>

<section class="band" id="generator-teaser">
  <div class="wrap mat-teaser">
    <div class="mat-mini" aria-hidden="true">
      <img class="mask m-circle" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy"><img class="mask m-squircle" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy"><img class="mask m-rounded" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy"><img class="mask m-drop" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy">
    </div>
    <div>
      <p class="tag-kicker"><span class="tag-hole"></span>In your browser, nothing uploaded</p>
      <h2>Free PWA manifest and icon generator</h2>
      <p class="lead">Lay your logo on the cutting mat, type a name, pick colors. Preview the icon under every Android mask, on the iOS home screen and the splash screen, then download a zip with the manifest, all icon sizes, favicon.ico and the head tags.</p>
      <a href="generator.html" class="btn btn-primary">${icon('scissors')}Open the cutting mat</a>
    </div>
  </div>
</section>

<section class="band band-line" id="recipes">
  <div class="wrap">
    <div class="section-head center">
      <p class="tag-kicker"><span class="tag-hole"></span>Recipes</p>
      <h2>Works with your stack</h2>
    </div>
    <div class="line-wrap"><svg class="clothesline" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 8 Q600 60 1200 8"/></svg><ul class="pegs">${recipes}</ul></div>
  </div>
</section>

<section class="band" id="guides">
  <div class="wrap">
    <div class="section-head split">
      <div>
        <p class="tag-kicker"><span class="tag-hole"></span>Guides</p>
        <h2>Booklets from the workshop shelf</h2>
        <p class="lead">Each guide explains one rule of installable websites, shows the code and how installkite handles it.</p>
      </div>
      ${scene('shelf', { cls: 'scene scene-head' })}
    </div>
    <div class="booklets">${guides}</div>
  </div>
</section>

<section class="band band-kraft" id="faq">
  <div class="wrap narrow-wrap">
    <div class="section-head center">
      <p class="tag-kicker"><span class="tag-hole"></span>FAQ</p>
      <h2>Questions people search for</h2>
    </div>
    <div class="accordion notes collapse-plus">${faq}</div>
  </div>
</section>

<section class="takeoff">
  <div class="wrap takeoff-in">
    ${scene('takeoff', { cls: 'scene takeoff-art' })}
    <div>
      <h2>Ready for take off?</h2>
      <p class="lead">Free, MIT licensed, no account. Your site keeps working as a website.</p>
      <div class="ticket"><span class="ticket-dollar" aria-hidden="true">$</span><code id="cta-cmd">npx installkite init</code><button type="button" class="ticket-copy" v-copy-from="#cta-cmd" aria-label="Copy the command">${icon('copy')}<span>Copy</span></button></div>
      <a href="${GITHUB}" class="btn btn-outline">${icon('github')}Star on GitHub</a>
    </div>
  </div>
</section>`;
}

export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'installkite',
        url: SITE,
        inLanguage: 'en',
        publisher: { '@type': 'Person', name: 'Alexandre Kohler', url: 'https://github.com/kwy404' },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'installkite',
        description: 'Make any website installable and offline capable with one line: web app manifest, every PWA icon size, a service worker with an offline page, head tags and a tiny install runtime.',
        url: SITE,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Windows, macOS, Linux',
        softwareVersion: '0.1.0',
        license: 'https://opensource.org/licenses/MIT',
        downloadUrl: 'https://www.npmjs.com/package/installkite',
        codeRepository: GITHUB,
        image: `${SITE}og.png`,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: { '@type': 'Person', name: 'Alexandre Kohler', url: 'https://github.com/kwy404', sameAs: ['https://github.com/kwy404', 'https://www.linkedin.com/in/alexandre-silva-173687256/'] },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })),
      },
    ],
  };
}
