// The home page: the sky and the home screen. The hero is a live demo: the
// visitor installs a bakery site, watches it land on the home screen as an
// app icon, then flips on airplane mode to see the offline page.
import { GUIDES, GITHUB, SITE, esc } from './layout.mjs';
import { artTile, icon } from './ui.mjs';

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

const STEPS = [
  ['1', 'Install', 'The browser offers to install the bakery site. installkite.js caught the prompt and shows the button.'],
  ['2', 'Home screen', 'The site lands on the home screen as an app icon, with its own window and name.'],
  ['3', 'Airplane mode', 'No network. The service worker still opens the app from the precache.'],
  ['4', 'Offline page', 'A page you never opened shows the friendly offline page, with the pages saved on the device.'],
];

const PRODUCTS = [
  ['Sourdough', '#e9b872'],
  ['Croissant', '#f2c36b'],
  ['Rye loaf', '#b9845a'],
];

function miniSite() {
  const cards = PRODUCTS.map(([n, c]) => `<div class="ms-card"><span class="ms-bread" style="--b:${c}"></span><b>${n}</b><i></i></div>`).join('');
  return `<div class="ms" aria-hidden="true">
    <div class="ms-head"><span class="ms-logo"></span><b>Acme Bakery</b><span class="ms-nav"><i></i><i></i><i></i></span></div>
    <div class="ms-hero"><b>Fresh bread daily</b><i></i><i class="short"></i><span class="ms-btn">Order now</span></div>
    <div class="ms-cards">${cards}</div>
  </div>`;
}

function stage() {
  const tiles = ['#7cc4ff', '#ffb37a', '#9be0c0', '#c7b4ff', '#ffd76e', '#8fd3e8', '#ff9fb3', '#b8c4d8', '#a5e3d0', '#ffc2a8', '#b4c8ff', '#f7d9a0']
    .map((c, i) => (i === 5 ? '<div class="tile slot" :class="{ \'is-filled\': H.installed }" id="ph-slot"><button type="button" class="app-ic" @click="openApp()" :tabindex="H.installed ? 0 : -1" aria-label="Open the Acme app"><span class="acme-ic"></span></button><span class="tile-label">Acme</span></div>' : `<div class="tile"><span class="app-ic" style="--t:${c}"></span><span class="tile-label"></span></div>`))
    .join('');
  return `<div class="stage" :class="{ 'is-air': H.air, 'is-installed': H.installed, 'is-open': H.open, 'is-dialog': H.step === 'dialog', 'is-flying': H.step === 'flying' }">
  <div class="laptop">
    <div class="lap-screen">
      <div class="win-bar">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="url" v-show="!H.installed">${icon('shield')}<span>acme-bakery.example</span><button type="button" class="url-install" @click="askInstall()" title="Install Acme Bakery" aria-label="Install Acme Bakery">${icon('monitor')}</button></span>
        <span class="app-title" v-show="H.installed"><span class="acme-ic sm"></span>Acme Bakery</span>
      </div>
      <div class="lap-view">
        ${miniSite()}
        <button type="button" class="mini-fab" v-show="!H.installed && H.step !== 'dialog'" @click="askInstall()" id="lap-fab"><span class="acme-dl">${icon('download')}</span>Install app</button>
        <div class="install-dlg" v-show="H.step === 'dialog'" role="dialog" aria-label="Install app">
          <p class="dlg-title">Install app?</p>
          <div class="dlg-app"><span class="acme-ic" id="dlg-icon"></span><span><b>Acme Bakery</b><small>acme-bakery.example</small></span></div>
          <div class="dlg-actions"><button type="button" class="btn btn-sm btn-ghost" @click="cancelInstall()">Cancel</button><button type="button" class="btn btn-sm btn-primary" @click="confirmInstall()">Install</button></div>
        </div>
        <div class="lap-offline" v-show="H.air && H.installed">${icon('wifi-off')}You are offline. Cached pages still open.</div>
      </div>
    </div>
    <div class="lap-base" aria-hidden="true"></div>
  </div>
  <div class="phone" aria-label="Phone home screen">
    <div class="ph-screen">
      <div class="ph-status"><span>9:41</span><span class="ph-icons"><span v-show="H.air" class="ph-air">${icon('plane')}</span><span v-show="!H.air">${icon('signal')}</span><span v-show="!H.air">${icon('wifi')}</span>${icon('battery')}</span></div>
      <div class="ph-home" v-show="!H.open">${tiles}<div class="ph-dock" aria-hidden="true"><span style="--t:#5fb0ff"></span><span style="--t:#6fd39b"></span><span style="--t:#ffb35f"></span><span style="--t:#ff7f9f"></span></div></div>
      <div class="ph-app" v-show="H.open">
        <div class="ph-splash" v-show="H.splash"><span class="acme-ic lg"></span><b>Acme Bakery</b></div>
        <div class="ph-app-bar"><button type="button" class="ph-back" @click="closeApp()" aria-label="Back to the home screen">${icon('x')}</button><span class="acme-ic sm"></span><b>Acme Bakery</b></div>
        <div class="ph-tabs" role="tablist" aria-label="App pages">
          <button type="button" role="tab" :aria-selected="H.page === 'home' ? 'true' : 'false'" @click="H.page = 'home'">Home</button>
          <button type="button" role="tab" :aria-selected="H.page === 'specials' ? 'true' : 'false'" @click="H.page = 'specials'">Specials</button>
        </div>
        <div class="ph-page" v-show="H.page === 'home' || !H.air">
          <div class="ph-offline-pill" v-show="H.air">${icon('wifi-off')}Offline, from the cache</div>
          <b class="ph-h" v-text="H.page === 'home' ? 'Fresh bread daily' : 'This week: rye and figs'"></b>
          <i></i><i></i><i class="short"></i>
          <div class="ph-cards"><span style="--b:#e9b872"></span><span style="--b:#f2c36b"></span></div>
        </div>
        <div class="ph-offpage" v-show="H.page === 'specials' && H.air">
          <span class="off-ic"><span class="acme-ic"></span><span class="off-signal">${icon('wifi-off')}</span></span>
          <b>You are offline</b>
          <small>Acme Bakery could not reach the network.</small>
          <span class="off-btn">${icon('refresh')}Try again</span>
          <span class="off-saved">Saved on this device</span>
          <span class="off-link">Home</span><span class="off-link">Menu</span>
        </div>
      </div>
    </div>
  </div>
  <img class="skye" src="assets/mascot.svg" width="150" height="150" alt="">
</div>`;
}

export function homeBody(ctx) {
  const steps = STEPS.map(
    ([n, t, d], i) => `<li :class="{ 'is-done': H.done > ${i}, 'is-now': H.done === ${i} }"><span class="step-no">${n}</span><span><b>${t}</b><small>${d}</small></span></li>`,
  ).join('');
  const features = [
    ['manifest', 'Web app manifest', 'Name, short name, colors, display, start_url, scope, id, shortcuts from your navigation and screenshot placeholders.'],
    ['icons', 'Every icon size', 'One PNG or SVG in, 48 to 512 pixel icons, favicon.ico, favicon PNGs and the apple-touch-icon out. Pure JS resizing.'],
    ['maskable', 'Maskable icons', 'The artwork is measured and scaled into the 80% safe zone, on a full bleed background, so Android masks never crop it.'],
    ['service-worker', 'Service worker', 'Precache with content hashes, network first pages with a timeout, stale while revalidate assets, capped image cache.'],
    ['offline', 'Offline page', 'A self contained page in your colors, with your icon inlined and links to the pages saved on the device.'],
    ['install', 'Install button', 'Catches beforeinstallprompt and shows a small button, or turns any element with data-installkite-install into one.'],
    ['ios-share', 'iOS instructions', 'iPhone and iPad never fire an install prompt, so Skye shows the three Add to Home Screen steps instead.'],
    ['update', 'Update toast', 'When a new version is ready the runtime shows "Refresh to update", then activates it and reloads once.'],
    ['doctor', 'installkite doctor', 'Audits the files on disk or a live URL: manifest fields, icon sizes, HTTPS, scope, start_url and the worker.'],
    ['precache', 'CI friendly build', 'installkite build re-hashes the precache after every site build; --check fails a pipeline when it is stale.'],
    ['github-pages', 'Any host, any base', 'Detects GitHub Pages project paths, Vite, Astro and Next.js base settings, or writes relative URLs.'],
    ['size', 'Tiny runtime', `${esc(ctx.sizes.runtime)} gzipped, no dependencies. The service worker logic adds ${esc(ctx.sizes.sw)}.`],
  ]
    .map(([ic, t, d]) => `<article class="app-card">${artTile(ic, 'art-ic app-card-ic')}<h3>${t}</h3><p>${d}</p></article>`)
    .join('');
  const strategies = [
    ['Precached files', 'cache first', 'Built pages, CSS, JS and icons are downloaded on install, each with a content hash. A new version only fetches what changed.', ['install', 'cache', 'serve']],
    ['Page navigations', 'network first, 3 s timeout', 'Fresh HTML when the network answers in time. On a slow or missing network: the cached page, then the offline page.', ['network', 'timeout', 'cache', 'offline']],
    ['Scripts, styles, fonts', 'stale while revalidate', 'The cached copy answers at once and the network refreshes it in the background, capped at 120 entries.', ['cache', 'serve', 'refresh']],
    ['Images', 'cache first, capped', 'Up to 60 images for 30 days, oldest out first, so photo heavy pages do not fill the disk.', ['cache', 'expire']],
  ]
    .map(
      ([t, s, d, flow]) => `<article class="lane"><header><h3>${t}</h3><span class="tag tag-primary">${s}</span></header><p>${d}</p><ol class="flow" aria-label="Steps">${flow.map((f) => `<li>${f}</li>`).join('')}</ol></article>`,
    )
    .join('');
  const guides = GUIDES.map((g) => {
    const m = ctx.guides.find((x) => x.meta.slug === g.slug).meta;
    return `<a href="${g.slug}.html" class="guide-tile">${artTile(g.icon, 'art-ic guide-tile-ic')}<span><b>${esc(m.h1)}</b><small>${esc(m.description)}</small></span></a>`;
  }).join('');
  const faq = FAQ.map(([q, a], i) => `<details class="collapse" name="faq"${i === 0 ? ' open' : ''}><summary class="collapse-title">${q}</summary><div class="collapse-content"><p>${a}</p></div></details>`).join('');
  const files = ctx.initFiles
    .map((f) => `<li><span class="ft-name">${esc(f.path)}</span><span class="ft-size">${esc(f.size)}</span><span class="ft-note">${esc(f.note)}</span></li>`)
    .join('');
  return `<section class="hero" id="demo" v-data>
  <div class="sky" aria-hidden="true"><span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span><span class="stars"></span></div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="kicker">${icon('sparkle')}Free and open source, one command</p>
      <h1>Make any website <em>installable</em> and offline capable</h1>
      <p class="lead">installkite writes the web app manifest, every icon size from one image, a service worker with an offline page and the head tags. Then your site installs like an app, on Android, iPhone, Windows and macOS.</p>
      <div class="cmd-box"><code id="hero-cmd">npx installkite init</code><button type="button" class="copy-btn" v-copy-from="#hero-cmd" aria-label="Copy the command">${icon('copy')}Copy</button></div>
      <div class="hero-cta"><a href="#what" class="btn btn-primary">See what it writes${icon('arrow')}</a><a href="generator.html" class="btn btn-outline">${icon('image')}Icon and manifest generator</a></div>
      <ul class="hero-facts"><li><b>${esc(ctx.sizes.runtime)}</b> runtime, gzipped</li><li><b>0</b> runtime dependencies</li><li><b>${ctx.tests}</b> tests</li></ul>
    </div>
    <div class="hero-demo">
      ${stage()}
      <div class="demo-controls">
        <button type="button" class="btn btn-primary btn-sm" @click="askInstall()" :disabled="H.installed || H.step === 'dialog'">${icon('download')}Install</button>
        <label class="air-switch"><input type="checkbox" class="toggle toggle-accent" role="switch" v-model="H.air" @change="airChanged()"><span>${icon('plane')}Airplane mode</span></label>
        <button type="button" class="btn btn-ghost btn-sm" @click="openApp()" :disabled="!H.installed">Open the app</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="resetDemo()">${icon('reset')}Reset</button>
      </div>
      <ol class="demo-steps">${steps}</ol>
      <p class="sr-only" aria-live="polite" v-text="H.say"></p>
    </div>
  </div>
</section>

<section class="band" id="what">
  <div class="wrap two">
    <div>
      <p class="kicker">${icon('terminal')}One line</p>
      <h2>One command writes all of it</h2>
      <p class="lead">Run it in any static site folder, or in a Vite, Next.js or Astro project. It scans your pages, takes the name and colors from your home page, finds your logo and asks a few questions (or none with <code>--yes</code>). Run it twice and nothing changes: the head tags live in one marked block.</p>
      <ul class="checks">
        <li>${icon('check')}<span><code>--dry-run</code> prints a diff of every file before writing</span></li>
        <li>${icon('check')}<span>Your own favicon, manifest link or theme color are kept, never duplicated</span></li>
        <li>${icon('check')}<span><code>installkite build</code> refreshes the precache after each site build</span></li>
      </ul>
    </div>
    <div class="term-col">
      ${ctx.frames.init}
    </div>
  </div>
  <div class="wrap">
    <h3 class="files-title">The files, from a real run on a three page bakery site</h3>
    <ul class="file-grid">${files}</ul>
  </div>
</section>

<section class="band band-alt" id="features">
  <div class="wrap">
    <p class="kicker">${icon('sparkle')}What lands on the home screen</p>
    <h2>Everything a website needs to become an app</h2>
    <div class="app-grid">${features}</div>
  </div>
</section>

<section class="band" id="offline">
  <div class="wrap">
    <p class="kicker">${icon('wifi-off')}Offline, by default</p>
    <h2>A service worker with sensible strategies</h2>
    <p class="lead narrow">Four routes cover what a website loads. Everything else, such as API calls, form posts and video ranges, goes straight to the network.</p>
    <div class="lanes">${strategies}</div>
    ${ctx.frames.sw}
  </div>
</section>

<section class="band band-alt" id="doctor">
  <div class="wrap two">
    <div>
      <p class="kicker">${icon('shield')}installkite doctor</p>
      <h2>An audit with fixes, before you deploy</h2>
      <p class="lead">Doctor checks the rules browsers use to decide whether a site can be installed, then the parts that make it work offline. Every failure comes with the fix. Point it at the files on disk or at a live URL with <code>--url</code>.</p>
      <ul class="checks">
        <li>${icon('check')}<span>Manifest fields, icon files and their real pixel sizes</span></li>
        <li>${icon('check')}<span>HTTPS, scope, start_url reachable and inside scope</span></li>
        <li>${icon('check')}<span>Service worker registered, scope, fetch handler, stale precache</span></li>
      </ul>
    </div>
    <div class="term-col">
      <div class="tabs tabs-boxed doctor-tabs" role="tablist">
        <input type="radio" name="doctor-tabs" class="tab" aria-label="Before init" checked>
        <div class="tab-content" role="tabpanel">${ctx.frames.doctorBefore}</div>
        <input type="radio" name="doctor-tabs" class="tab" aria-label="After init">
        <div class="tab-content" role="tabpanel">${ctx.frames.doctorAfter}</div>
      </div>
    </div>
  </div>
</section>

<section class="band" id="runtime">
  <div class="wrap two">
    <div>
      <p class="kicker">${icon('download')}installkite.js</p>
      <h2>A runtime the size of a small image</h2>
      <p class="lead">One script tag registers the service worker and adds the install button, the iOS sheet, the update toast and the offline badge. Each part is optional, styled from your theme color and translatable. Listen to its events to build your own install flow.</p>
      ${ctx.frames.runtime}
    </div>
    <div class="ui-previews" aria-label="Runtime interface previews">
      <div class="uip uip-fab"><span class="uip-go">${icon('download')}Install app</span><span class="uip-x">${icon('x')}</span></div>
      <div class="uip uip-toast"><span>A new version is available</span><span class="uip-go">Refresh</span></div>
      <div class="uip uip-badge"><i></i>You are offline</div>
      <div class="uip uip-sheet"><b>Add to your Home Screen</b><span>${icon('upload')}Tap the Share button in the toolbar</span><span>${icon('sparkle')}Tap "Add to Home Screen"</span><span>${icon('check')}Tap "Add" in the top corner</span></div>
    </div>
  </div>
</section>

<section class="band band-alt" id="generator-teaser">
  <div class="wrap gen-teaser">
    <div class="gen-art" aria-hidden="true">
      <img class="mask m-circle" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy"><img class="mask m-squircle" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy"><img class="mask m-rounded" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy"><img class="mask m-drop" src="icons/maskable-192.png" width="192" height="192" alt="" loading="lazy">
    </div>
    <div>
      <p class="kicker">${icon('image')}In your browser, nothing uploaded</p>
      <h2>Free PWA manifest and icon generator</h2>
      <p class="lead">Drop a logo, type a name, pick colors. Preview the icon under every Android mask, the iOS home screen and the splash screen, then download a zip with the manifest, all icon sizes, favicon.ico and the head tags.</p>
      <a href="generator.html" class="btn btn-primary">${icon('image')}Open the generator</a>
    </div>
  </div>
</section>

<section class="band" id="recipes">
  <div class="wrap">
    <p class="kicker">${icon('link')}Recipes</p>
    <h2>Works with your stack</h2>
    <div class="recipe-row">
      ${['Plain HTML', 'Vite', 'Next.js', 'Astro', 'WordPress', 'Laravel', 'GitHub Pages', 'Netlify']
        .map((n) => `<a class="recipe-chip" href="docs.html#recipe-${n.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '')}">${n}</a>`)
        .join('')}
    </div>
  </div>
</section>

<section class="band band-alt" id="guides">
  <div class="wrap">
    <p class="kicker">${icon('book')}Guides</p>
    <h2>Learn the parts</h2>
    <div class="guide-grid">${guides}</div>
  </div>
</section>

<section class="band" id="faq">
  <div class="wrap narrow-wrap">
    <p class="kicker">${icon('sparkle')}FAQ</p>
    <h2>Questions people search for</h2>
    <div class="accordion collapse-plus">${faq}</div>
  </div>
</section>

<section class="takeoff">
  <div class="wrap takeoff-in">
    <img src="assets/mascot.svg" width="130" height="130" alt="" loading="lazy">
    <div><h2>Ready for take off?</h2><p>Free, MIT licensed, no account. Your site keeps working as a website.</p></div>
    <div class="cmd-box"><code id="cta-cmd">npx installkite init</code><button type="button" class="copy-btn" v-copy-from="#cta-cmd" aria-label="Copy the command">${icon('copy')}Copy</button></div>
    <a href="${GITHUB}" class="btn btn-outline">${icon('github')}Star on GitHub</a>
  </div>
</section>`;
}

export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
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
