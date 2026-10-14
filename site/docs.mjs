// The docs page: the flight manual. CLI, config, runtime, service worker,
// doctor rules, Node API and framework recipes.
import { SITE } from './layout.mjs';
import { icon } from './ui.mjs';

const table = (head, rows) =>
  `<div class="table-wrap"><table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;

export const DOC_SECTIONS = [
  ['install', 'Install'],
  ['quick-start', 'Quick start'],
  ['init', 'installkite init'],
  ['build', 'installkite build'],
  ['doctor', 'installkite doctor'],
  ['icons-cmd', 'icons and remove'],
  ['files', 'What gets written'],
  ['config', 'Config file'],
  ['runtime', 'Runtime script'],
  ['runtime-api', 'Runtime API'],
  ['service-worker', 'Service worker'],
  ['base-paths', 'Base paths and scope'],
  ['recipes', 'Recipes'],
  ['node-api', 'Node API'],
  ['limits', 'Limits'],
];

export function docsBody(ctx) {
  const f = ctx.frame;
  const side = DOC_SECTIONS.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('');
  const recipes = RECIPES.map(
    (r) => `<section class="recipe" id="recipe-${r.id}"><h3><a href="#recipe-${r.id}" class="anchor" aria-hidden="true" tabindex="-1">#</a>${r.name}</h3>${r.body(f)}</section>`,
  ).join('');
  return `<div class="docs-top">
  <div class="sky" aria-hidden="true"><span class="cloud c1"></span><span class="stars"></span></div>
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><ol class="breadcrumbs"><li><a href="./">installkite</a></li><li><span aria-current="page">Docs</span></li></ol></nav>
    <h1>installkite docs</h1>
    <p class="lead">The flight manual: every command and flag, the config file, the runtime script, the service worker, the doctor rules, the Node API and recipes for each framework and host.</p>
  </div>
</div>
<div class="wrap docs">
  <aside class="docs-side" aria-label="On this page"><p class="side-title">Flight manual</p><ol>${side}</ol></aside>
  <article class="docs-main prose-ik">
<section id="install"><h2><a href="#install" class="anchor" aria-hidden="true" tabindex="-1">#</a>Install</h2>
<p>Nothing to install for a one off run: <code>npx</code> downloads the CLI. For CI and repeat builds add it as a dev dependency. Node 18 or newer.</p>
${f('npx installkite init\n\n# or keep it in the project for CI builds\nnpm install --save-dev installkite', { kind: 'terminal', lang: 'bash' })}
<p>The runtime script also ships on the CDN, pinned to a version:</p>
${f('<script src="https://cdn.jsdelivr.net/npm/installkite@0.1.0/dist/installkite.min.js" data-sw="/sw.js" data-install="auto" defer></script>', { lang: 'html', title: 'index.html' })}
</section>

<section id="quick-start"><h2><a href="#quick-start" class="anchor" aria-hidden="true" tabindex="-1">#</a>Quick start</h2>
<ol class="steps-list">
<li><b>Run init in the site folder.</b> It finds your pages, your logo and your colors and asks a few questions. Add <code>--yes</code> to accept the detected values.</li>
<li><b>Check it.</b> <code>npx installkite doctor</code> lists every installability and offline rule with a fix for each failure.</li>
<li><b>Deploy over HTTPS.</b> GitHub Pages, Netlify, Vercel and Cloudflare Pages all qualify. Open the site and the browser offers to install it.</li>
<li><b>After each site build</b> run <code>npx installkite build</code> (frameworks get it added to the build script) so the service worker precaches the new files.</li>
</ol>
${f('npx installkite init --dry-run   # preview every change as a diff\nnpx installkite init --yes       # write it\nnpx installkite doctor           # audit', { kind: 'terminal', lang: 'bash' })}
</section>

<section id="init"><h2><a href="#init" class="anchor" aria-hidden="true" tabindex="-1">#</a>installkite init</h2>
<p>Scans the project, then writes the manifest, icons, offline page, runtime, service worker and config, and injects the head tags into your HTML. It is idempotent: the tags live between <code>&lt;!-- installkite:start --&gt;</code> and <code>&lt;!-- installkite:end --&gt;</code>, a second run updates that block in place, and tags your page already has (a favicon, a manifest link, a theme color) are kept and not duplicated.</p>
${table(
  ['Flag', 'What it does'],
  [
    ['<code>--root &lt;dir&gt;</code>', 'The deployed folder that gets precached. Detected: the folder with index.html, <code>dist</code> for Vite and Astro, <code>out</code> for Next.js, <code>public</code> for Laravel.'],
    ['<code>--public &lt;dir&gt;</code>', 'Where generated files are written, so a framework copies them into every build. <code>public</code> for Vite, Next.js and Astro.'],
    ['<code>--base &lt;path&gt;</code>', 'The URL path the site is served under, like <code>/my-repo/</code> on GitHub Pages. Detected from the git remote and framework config.'],
    ['<code>--relative</code>', 'Write relative URLs in head tags (<code>./</code>, <code>../</code>) so the site works from any folder.'],
    ['<code>--icon &lt;file&gt;</code>', 'Source image, PNG or SVG, ideally 512 pixels or larger. Without one, a monogram of the initials is drawn.'],
    ['<code>--name</code>, <code>--short-name</code>, <code>--description</code>', 'Manifest text. The short name is the home screen label, 12 characters or fewer.'],
    ['<code>--theme-color</code>, <code>--theme-color-dark</code>, <code>--background-color</code>', 'Any CSS color. The theme color defaults to the page meta tag, then to the dominant color of the icon.'],
    ['<code>--display &lt;mode&gt;</code>', '<code>standalone</code> (default), <code>fullscreen</code>, <code>minimal-ui</code> or <code>browser</code>.'],
    ['<code>--start-url</code>, <code>--scope</code>, <code>--lang</code>, <code>--orientation</code>', 'Manifest fields. start_url and scope default to <code>./</code>.'],
    ['<code>--cdn</code>', 'Link installkite.js from jsDelivr instead of copying it into the site.'],
    ['<code>--no-runtime</code>', 'Leave out installkite.js and register the service worker yourself.'],
    ['<code>--no-inject</code>', 'Do not edit HTML files. The tags to paste are printed instead.'],
    ['<code>--no-install-button</code>, <code>--no-update-toast</code>, <code>--no-offline-indicator</code>', 'Turn off parts of the runtime interface.'],
    ['<code>--no-offline-page</code>, <code>--no-screenshots</code>, <code>--no-shortcuts</code>', 'Skip the offline page, the placeholder screenshots or the shortcuts taken from your navigation.'],
    ['<code>--no-postbuild</code>', 'Do not append <code>npx installkite build</code> to the package.json build script.'],
    ['<code>-y</code>, <code>--yes</code>', 'Accept detected values without questions. Also the behavior without a terminal.'],
    ['<code>-n</code>, <code>--dry-run</code>', 'Print a unified diff of every text file that would change. Nothing is written.'],
  ],
)}
${f(ctx.dryRun, { kind: 'output', lang: 'text', title: 'npx installkite init --dry-run' })}
</section>

<section id="build"><h2><a href="#build" class="anchor" aria-hidden="true" tabindex="-1">#</a>installkite build</h2>
<p>Run it after every site build. It hashes the deployed folder again, rewrites <code>sw.js</code> there with the new precache list, and injects the head tags into pages a site generator rebuilt without them. Browsers see a changed worker, download only the files whose hash changed and show the update toast.</p>
${f('# package.json\n"scripts": {\n  "build": "vite build && npx installkite build"\n}', { lang: 'json', title: 'package.json' })}
<p><code>--check</code> writes nothing and exits with code 1 when <code>sw.js</code> is out of date, which makes a cheap CI guard:</p>
${f('- run: npm run build\n- run: npx installkite build --check', { lang: 'yaml', title: '.github/workflows/ci.yml' })}
</section>

<section id="doctor"><h2><a href="#doctor" class="anchor" aria-hidden="true" tabindex="-1">#</a>installkite doctor</h2>
<p>Audits the files on disk (served as a static host would, under your base path) or a live site with <code>--url https://example.com/</code>. Exits with code 1 when a rule fails with an error, and with <code>--strict</code> also on warnings. <code>--json</code> prints the report for scripts.</p>
${table(['Rule', 'Checks', 'Level'], DOCTOR_RULES)}
${f(ctx.doctorJson, { lang: 'json', title: 'npx installkite doctor --json (excerpt)' })}
</section>

<section id="icons-cmd"><h2><a href="#icons-cmd" class="anchor" aria-hidden="true" tabindex="-1">#</a>icons and remove</h2>
<p><code>installkite icons &lt;image&gt;</code> writes only the icon set, for projects that already have a manifest. <code>--out</code> sets the folder, <code>--background</code> the color behind maskable icons and the apple-touch-icon, <code>--screenshots</code> adds placeholder screenshots.</p>
${f('npx installkite icons brand/logo.svg --out public --background "#0b1426"', { kind: 'terminal', lang: 'bash' })}
<p><code>installkite remove</code> takes the marked block out of every HTML file. Generated files stay where they are.</p>
</section>

<section id="files"><h2><a href="#files" class="anchor" aria-hidden="true" tabindex="-1">#</a>What gets written</h2>
${table(
  ['File', 'What it is'],
  [
    ['<code>manifest.webmanifest</code>', 'id, name, short_name, description, lang, start_url, scope, display, theme_color, background_color, icons, shortcuts and screenshots.'],
    ['<code>icons/icon-48.png</code> to <code>icon-512.png</code>', 'Ten sizes with purpose <code>any</code>, transparency kept.'],
    ['<code>icons/maskable-192.png</code>, <code>maskable-512.png</code>', 'Full bleed background, the artwork scaled so its farthest visible pixel sits inside the 40% radius safe zone.'],
    ['<code>icons/icon.svg</code>', 'The SVG source, used as a scalable favicon, when you started from SVG.'],
    ['<code>apple-touch-icon.png</code>', '180 by 180, opaque, padded for transparent artwork.'],
    ['<code>favicon.ico</code>, <code>favicon-16x16.png</code>, <code>favicon-32x32.png</code>', 'The ICO holds 16, 32 and 48 pixel PNG images.'],
    ['<code>icons/screenshot-wide.png</code>, <code>screenshot-narrow.png</code>', 'Placeholders for the richer install dialog. Replace them with real captures; doctor reminds you.'],
    ['<code>offline.html</code>', 'Self contained offline page in your colors, with the icon inlined and links to saved pages.'],
    ['<code>installkite.js</code>', 'The runtime, about 4.4 kB gzipped.'],
    ['<code>sw.js</code>', 'The service worker: one settings line with the precache list, then the strategies.'],
    ['<code>installkite.config.json</code>', 'What init decided, so build and doctor run without questions.'],
  ],
)}
</section>

<section id="config"><h2><a href="#config" class="anchor" aria-hidden="true" tabindex="-1">#</a>Config file</h2>
<p><code>installkite.config.json</code> sits next to your package.json. Edit it and run <code>init --yes</code> again to apply changes; a JSON schema at <a href="config.schema.json">config.schema.json</a> gives editors completion.</p>
${f(ctx.configSample, { lang: 'json', title: 'installkite.config.json' })}
${table(
  ['Key', 'Meaning'],
  [
    ['<code>root</code>', 'The deployed folder, precached by build.'],
    ['<code>publicDir</code>', 'Where generated files are written.'],
    ['<code>base</code>, <code>relative</code>', 'URL base path, or relative URLs per page.'],
    ['<code>url</code>', 'Your production URL; doctor checks that it is HTTPS.'],
    ['<code>icon</code>, <code>iconsDir</code>', 'Icon source (or <code>"monogram"</code>) and the icon folder.'],
    ['<code>html</code>', 'Files or globs that get head tags. Plain sites use <code>"**/*.html"</code>, so new pages are covered.'],
    ['<code>app</code>', 'Manifest values: name, shortName, description, lang, display, themeColor, themeColorDark, backgroundColor, startUrl, scope, orientation, categories, shortcuts, screenshots.'],
    ['<code>runtime</code>', '<code>mode</code> (local, cdn or none), <code>installButton</code>, <code>updateToast</code>, <code>offlineIndicator</code>.'],
    ['<code>sw</code>', 'Service worker options, listed below, plus <code>include</code>, <code>exclude</code> and <code>maxFileSize</code> for the precache.'],
  ],
)}
</section>

<section id="runtime"><h2><a href="#runtime" class="anchor" aria-hidden="true" tabindex="-1">#</a>Runtime script</h2>
<p>One tag, configured with data attributes. It registers the worker once the page has loaded, so it never competes with your own resources.</p>
${f('<script src="/installkite.js" data-sw="/sw.js" data-install="auto" data-offline="badge" defer></script>', { lang: 'html', title: 'index.html' })}
${table(
  ['Attribute', 'Meaning'],
  [
    ['<code>data-sw</code>', 'Service worker URL. Default: <code>sw.js</code> next to installkite.js.'],
    ['<code>data-scope</code>', 'Registration scope. Default: the worker folder.'],
    ['<code>data-install="auto"</code>', 'A floating install button when the site can be installed. Dismissing it hides it for 14 days.'],
    ['<code>data-update="none"</code>', 'No "Refresh to update" toast (listen to the update event instead).'],
    ['<code>data-offline="badge"</code>', 'A small badge while the device is offline.'],
    ['<code>data-manual</code>', 'Do not register the worker; call <code>installkite.register()</code> yourself.'],
  ],
)}
<p>Any element with <code>data-installkite-install</code> becomes an install button: it stays hidden until the site can be installed and opens the prompt, or the iOS sheet, on click.</p>
${f('<button class="btn" data-installkite-install hidden>Install the app</button>', { lang: 'html', title: 'header.html' })}
<p>The interface follows your <code>theme-color</code> meta tag. Override it with CSS variables:</p>
${f(':root {\n  --installkite-accent: #2b8ff0;      /* buttons */\n  --installkite-on-accent: #ffffff;   /* text on buttons */\n  --installkite-surface: #ffffff;     /* toast, sheet, button bar */\n  --installkite-text: #14213d;\n  --installkite-surface-dark: #18202f;\n  --installkite-text-dark: #eef2f8;\n}', { lang: 'css', title: 'site.css' })}
</section>

<section id="runtime-api"><h2><a href="#runtime-api" class="anchor" aria-hidden="true" tabindex="-1">#</a>Runtime API</h2>
${f(ctx.runtimeApi, { lang: 'js', title: 'app.js' })}
${table(
  ['Member', 'What it does'],
  [
    ['<code>init(options)</code>', 'Reads options and starts. The script tag build calls it for you with the data attributes. Options: <code>sw</code>, <code>scope</code>, <code>install</code>, <code>update</code>, <code>offline</code>, <code>manual</code>, <code>snoozeDays</code>, <code>text</code>.'],
    ['<code>register(url?, scope?)</code>', 'Registers the service worker, resolves to the registration or null.'],
    ['<code>install()</code>', 'Shows the browser prompt and resolves to <code>accepted</code> or <code>dismissed</code>; on iOS shows the sheet and resolves to <code>instructions</code>; otherwise <code>unavailable</code>.'],
    ['<code>update()</code>', 'Activates a waiting worker and reloads once it takes over.'],
    ['<code>cache(urls)</code>', 'Saves pages into the offline page cache, for "read later" buttons. Resolves to the number saved.'],
    ['<code>showIOSInstructions()</code>', 'Opens the Add to Home Screen sheet.'],
    ['<code>on(event, fn)</code>, <code>off(event, fn)</code>', 'Events: <code>ready</code>, <code>installable</code>, <code>installed</code>, <code>update</code>, <code>updated</code>, <code>offline</code>, <code>online</code>, <code>error</code>. <code>on</code> returns an unsubscribe function. Each is also a DOM event named <code>installkite:&lt;event&gt;</code> on window.'],
    ['<code>canInstall</code>, <code>isInstalled</code>, <code>isIOS</code>, <code>online</code>, <code>registration</code>, <code>version</code>', 'Read only state.'],
  ],
)}
<p>Every interface string can be translated through <code>text</code>:</p>
${f("installkite.init({\n  text: {\n    install: 'Instalar app',\n    iosTitle: 'Adicione a Tela de Inicio',\n    iosStep1: 'Toque em Compartilhar na barra',\n    iosStep2: 'Toque em Adicionar a Tela de Inicio',\n    iosStep3: 'Toque em Adicionar',\n    update: 'Nova versao disponivel',\n    refresh: 'Atualizar',\n    offline: 'Voce esta offline',\n    online: 'Conectado de novo',\n  },\n});", { lang: 'js', title: 'i18n.js' })}
</section>

<section id="service-worker"><h2><a href="#service-worker" class="anchor" aria-hidden="true" tabindex="-1">#</a>Service worker</h2>
<p>The generated <code>sw.js</code> starts with one line of settings, then the strategies. Precached files are stored in <code>installkite-precache-&lt;version&gt;</code>, where the version is a hash of every file hash; runtime caches are <code>installkite-pages</code>, <code>installkite-assets</code> and <code>installkite-images</code>.</p>
${table(
  ['Request', 'Strategy'],
  [
    ['A precached file (no query string)', 'Cache first from the precache. Install downloads each file once and copies unchanged ones from the previous version.'],
    ['A page navigation inside the scope', 'Network first, raced against <code>navigationTimeout</code>. On failure or timeout: the cached page (also tried as <code>/page/</code>, <code>/page/index.html</code>, <code>/page.html</code>), then the offline page. Successful pages refresh the page cache. Navigation preload is used when the browser has it.'],
    ['Scripts, styles, fonts, JSON, manifests (same origin or listed CDNs)', 'Stale while revalidate, capped at <code>assetMaxEntries</code>.'],
    ['Images', 'Cache first with <code>imageMaxEntries</code> and <code>imageMaxAge</code>. Opaque cross origin images are not cached.'],
    ['Anything else: POST, range requests, other origins, excluded paths', 'Not handled; the browser fetches normally.'],
  ],
)}
${table(
  ['sw option', 'Default', 'Meaning'],
  [
    ['<code>offline</code>', '<code>"offline.html"</code>', 'The fallback page, or null.'],
    ['<code>navigationTimeout</code>', '<code>3000</code>', 'Milliseconds before a slow page falls back to the cache.'],
    ['<code>imageMaxEntries</code>, <code>imageMaxAge</code>', '<code>60</code>, <code>2592000</code>', 'Image cache size and max age in seconds (30 days).'],
    ['<code>assetMaxEntries</code>, <code>pageMaxEntries</code>', '<code>120</code>, <code>50</code>', 'Caps for the runtime caches.'],
    ['<code>exclude</code>', '<code>[]</code>', 'Path prefixes relative to the scope, or <code>"/regex/"</code> strings, never handled. For example <code>"api/"</code>.'],
    ['<code>crossOrigin</code>', 'font hosts and CDNs', 'Origins whose scripts, styles and fonts are cached.'],
    ['<code>skipWaiting</code>', '<code>false</code>', 'Activate new versions at once instead of after "Refresh".'],
    ['<code>importScripts</code>', '<code>[]</code>', 'Your own worker code, for push or background sync handlers.'],
    ['<code>include</code>, <code>exclude</code>, <code>maxFileSize</code>', 'HTML, CSS, JS, fonts, key icons; 2 MiB', 'Which built files are precached.'],
  ],
)}
${f(ctx.swSample, { lang: 'js', title: 'sw.js (first lines)' })}
</section>

<section id="base-paths"><h2><a href="#base-paths" class="anchor" aria-hidden="true" tabindex="-1">#</a>Base paths and scope</h2>
<p>The manifest uses relative URLs (<code>"start_url": "./"</code>, <code>"scope": "./"</code>), so it works wherever it is served. The head tags need a base: <code>/</code> for a domain root, <code>/repo/</code> for a GitHub Pages project site. init detects it from <code>package.json</code> homepage, a Vite or Astro <code>base</code>, a Next.js <code>basePath</code>, or a GitHub remote with Pages evidence (a Pages workflow, a <code>docs/</code> site or the gh-pages package); a <code>CNAME</code> file means a custom domain at <code>/</code>. With <code>--relative</code> every page gets its own prefix such as <code>../</code>.</p>
<p>The worker controls the folder it is served from and everything below it. Keep <code>sw.js</code> at the site root (installkite writes it there) so its scope covers start_url; doctor fails when it does not.</p>
</section>

<section id="recipes"><h2><a href="#recipes" class="anchor" aria-hidden="true" tabindex="-1">#</a>Recipes</h2>
${recipes}
</section>

<section id="node-api"><h2><a href="#node-api" class="anchor" aria-hidden="true" tabindex="-1">#</a>Node API</h2>
<p>Every piece of the CLI is exported, typed, for build tools and scripts.</p>
${f(ctx.nodeApi, { lang: 'ts', title: 'build-pwa.ts' })}
${table(
  ['Export', 'What it does'],
  [
    ['<code>planInit(cwd, answers)</code>, <code>planBuild(cwd)</code>, <code>applyPlan(cwd, files)</code>', 'The init and build pipelines. Plans are lists of files with their new content and a diff; nothing is written until applyPlan.'],
    ['<code>generateIcons(source, options)</code>', 'The icon set from <code>loadIconSource(bytes)</code>. Returns PNG, ICO and SVG files.'],
    ['<code>maskableScale(radius)</code>, <code>maskablePadding(size, radius)</code>, <code>inSafeZone(x, y, size)</code>', 'The safe zone math.'],
    ['<code>generateManifest(options)</code>', 'A manifest object with fields in a readable order.'],
    ['<code>injectHead(html, options)</code>, <code>removeHead(html)</code>', 'Idempotent head tag injection.'],
    ['<code>buildPrecache(root, options)</code>, <code>generateServiceWorker(entries, options)</code>', 'The hashed precache list and sw.js.'],
    ['<code>createRouter(config, env)</code>', 'The service worker strategies against injected caches and fetch, for your own worker or tests.'],
    ['<code>doctorLocal(cwd)</code>, <code>doctorRemote(url)</code>, <code>runDoctor(context)</code>', 'The audit, on files or a live URL.'],
    ['<code>rasterizeSvg(svg, options)</code>, <code>decodePng</code>, <code>encodePng</code>, <code>resize</code>, <code>encodeIco</code>', 'The image toolkit, pure JavaScript.'],
  ],
)}
</section>

<section id="limits"><h2><a href="#limits" class="anchor" aria-hidden="true" tabindex="-1">#</a>Limits</h2>
<ul>
<li><b>SVG sources</b> are drawn by a built in rasterizer that covers what logos use: paths, shapes, gradients, strokes and dashes, transforms, opacity, clip paths, <code>use</code>, simple <code>&lt;style&gt;</code> rules and embedded PNG images. <code>&lt;text&gt;</code>, masks, filters and patterns are skipped with a warning: convert text to outlines before exporting.</li>
<li><b>Raster sources</b> must be PNG for the CLI. The online generator also reads JPEG and WebP through the browser.</li>
<li><b>iOS</b> has no install prompt, no theme color for the status bar in standalone mode beyond the status bar style, and clears storage of sites unused for weeks; installed apps keep theirs.</li>
<li><b>Firefox on desktop</b> does not install sites. The service worker and offline page still work there.</li>
<li><b>Opaque responses</b> (cross origin without CORS) are never cached, to avoid filling storage quotas.</li>
</ul>
</section>
  </article>
</div>`;
}

const DOCTOR_RULES = [
  ['<code>https</code>', 'The site is HTTPS or localhost (live), or the configured production URL is HTTPS (files).', 'error'],
  ['<code>page</code>, <code>viewport</code>', 'The start page loads; it has a viewport meta tag.', 'error, warn'],
  ['<code>manifest-link</code>, <code>manifest-fetch</code>, <code>manifest-type</code>', 'A manifest is linked, loads, is valid JSON and is served as JSON.', 'error, warn'],
  ['<code>manifest-name</code>, <code>short-name</code>', 'A name exists; the label fits in 12 characters.', 'error, warn'],
  ['<code>display</code>', 'standalone, fullscreen or minimal-ui (or a display_override).', 'error'],
  ['<code>start-url</code>, <code>scope</code>, <code>start-url-origin</code>, <code>start-url-reachable</code>', 'start_url is set, same origin, inside scope and loads.', 'error'],
  ['<code>id</code>, <code>description</code>', 'Stable app id; a description.', 'info'],
  ['<code>theme_color</code>, <code>background_color</code>', 'Present and valid CSS colors.', 'warn, error'],
  ['<code>icons</code>, <code>icon-file</code>, <code>icon-size</code>', '192 and 512 pixel icons; every file loads; real sizes match the declared ones.', 'error, warn'],
  ['<code>maskable</code>, <code>maskable-opaque</code>, <code>purpose</code>', 'A maskable icon exists, is full bleed, and is not mixed as "any maskable".', 'warn'],
  ['<code>screenshots</code>', 'Screenshots exist and are no longer the installkite placeholders.', 'info, warn'],
  ['<code>theme-color-meta</code>, <code>apple-touch-icon</code>, <code>favicon</code>', 'Head tags: theme color, a 180 pixel opaque apple-touch-icon, a favicon.', 'info, warn'],
  ['<code>sw-registered</code>, <code>sw-fetch</code>, <code>sw-scope</code>, <code>sw-fetch-handler</code>', 'A worker is registered, loads as JavaScript, controls start_url and handles fetch.', 'error'],
  ['<code>offline-page</code>, <code>start-url-precached</code>', 'The offline page exists and is precached; the start page opens offline.', 'warn'],
  ['<code>precache-fresh</code>', 'Files on disk: the precache list matches the current file hashes.', 'error'],
];

export const RECIPES = [
  {
    id: 'plain-html',
    name: 'Plain HTML',
    body: (f) => `<p>Run init in the folder with <code>index.html</code>. Every page gets the tags, including pages you add later when you run <code>build</code>.</p>${f('cd my-site\nnpx installkite init --yes\nnpx installkite doctor', { kind: 'terminal', lang: 'bash' })}`,
  },
  {
    id: 'vite',
    name: 'Vite',
    body: (f) => `<p>Generated files go to <code>public/</code>, the tags into the source <code>index.html</code>, and the build script gets <code>npx installkite build</code> so <code>dist/sw.js</code> precaches the hashed bundles. A <code>base</code> in <code>vite.config</code> is picked up.</p>${f('npx installkite init --yes\nnpm run build    # vite build && npx installkite build', { kind: 'terminal', lang: 'bash' })}${f('import { defineConfig } from \'vite\';\n\nexport default defineConfig({\n  base: \'/my-repo/\', // GitHub Pages project site\n});', { lang: 'ts', title: 'vite.config.ts' })}`,
  },
  {
    id: 'next-js',
    name: 'Next.js (static export)',
    body: (f) => `<p>With <code>output: 'export'</code> the site builds to <code>out/</code>. init writes the files to <code>public/</code>, adds <code>npx installkite build</code> to the build script and prints the tags; put them in the root layout.</p>${f("import type { Metadata, Viewport } from 'next';\nimport Script from 'next/script';\n\nexport const viewport: Viewport = { themeColor: '#2b8ff0' };\n\nexport const metadata: Metadata = {\n  manifest: '/manifest.webmanifest',\n  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },\n  appleWebApp: { title: 'Acme', statusBarStyle: 'default' },\n};\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>\n        {children}\n        <Script src=\"/installkite.js\" data-sw=\"/sw.js\" data-install=\"auto\" strategy=\"afterInteractive\" />\n      </body>\n    </html>\n  );\n}", { lang: 'tsx', title: 'app/layout.tsx' })}`,
  },
  {
    id: 'astro',
    name: 'Astro',
    body: (f) => `<p>Astro builds to <code>dist/</code> and copies <code>public/</code>. Paste the printed tags into your base layout; <code>base</code> from <code>astro.config.mjs</code> is detected.</p>${f('---\nconst { title } = Astro.props;\n---\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>{title}</title>\n    <link rel="manifest" href="/manifest.webmanifest" />\n    <meta name="theme-color" content="#2b8ff0" />\n    <link rel="icon" href="/favicon.ico" sizes="48x48" />\n    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />\n    <script is:inline src="/installkite.js" data-sw="/sw.js" data-install="auto" defer></script>\n  </head>\n  <body><slot /></body>\n</html>', { lang: 'astro', title: 'src/layouts/Base.astro' })}`,
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    body: (f) => `<p>Run init in your theme folder with <code>--public .</code>, upload the generated files to the site root (the worker must sit at <code>/sw.js</code> to control the whole site) and print the tags from <code>wp_head</code>. Exclude the admin and API from the worker.</p>${f("// functions.php\nadd_action('wp_head', function () {\n  echo '<link rel=\"manifest\" href=\"/manifest.webmanifest\">' . \"\\n\";\n  echo '<meta name=\"theme-color\" content=\"#2b8ff0\">' . \"\\n\";\n  echo '<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">' . \"\\n\";\n  echo '<script src=\"/installkite.js\" data-sw=\"/sw.js\" data-install=\"auto\" defer></script>' . \"\\n\";\n});", { lang: 'php', title: 'functions.php' })}${f('"sw": { "exclude": ["wp-admin/", "wp-json/", "wp-login.php", "/\\\\?/"] }', { lang: 'json', title: 'installkite.config.json' })}`,
  },
  {
    id: 'laravel',
    name: 'Laravel',
    body: (f) => `<p>Laravel serves <code>public/</code>, which init detects as both the root and the output folder. Put the tags in your main Blade layout and keep API and auth routes out of the worker.</p>${f('<head>\n    <meta charset="utf-8">\n    <link rel="manifest" href="{{ asset(\'manifest.webmanifest\') }}">\n    <meta name="theme-color" content="#2b8ff0">\n    <link rel="apple-touch-icon" href="{{ asset(\'apple-touch-icon.png\') }}">\n    <script src="{{ asset(\'installkite.js\') }}" data-sw="{{ asset(\'sw.js\') }}" data-install="auto" defer></script>\n</head>', { lang: 'blade', title: 'resources/views/layouts/app.blade.php' })}${f('"sw": { "exclude": ["api/", "login", "logout", "sanctum/"] }', { lang: 'json', title: 'installkite.config.json' })}`,
  },
  {
    id: 'github-pages',
    name: 'GitHub Pages',
    body: (f) => `<p>A project site lives at <code>https://user.github.io/repo/</code>, so every URL needs <code>/repo/</code>. init reads the repository from your git remote and writes the base for you; a <code>CNAME</code> file switches back to <code>/</code>. Turn on "Enforce HTTPS" in the Pages settings.</p>${f('npx installkite init --yes                # base detected from the git remote\nnpx installkite init --yes --base /repo/  # or set it yourself', { kind: 'terminal', lang: 'bash' })}`,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    body: (f) => `<p>Run the build step after your site build and serve the manifest with the right type. Netlify already serves HTTPS.</p>${f('[build]\n  command = "npm run build && npx installkite build"\n  publish = "dist"\n\n[[headers]]\n  for = "/manifest.webmanifest"\n  [headers.values]\n    Content-Type = "application/manifest+json"\n\n[[headers]]\n  for = "/sw.js"\n  [headers.values]\n    Cache-Control = "no-cache"', { lang: 'toml', title: 'netlify.toml' })}`,
  },
];

export function docsJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        headline: 'installkite docs: CLI, config, runtime, service worker and recipes',
        url: `${SITE}docs.html`,
        author: { '@type': 'Person', name: 'Alexandre Kohler', url: 'https://github.com/kwy404' },
        about: 'Progressive web app tooling',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'installkite', item: SITE },
          { '@type': 'ListItem', position: 2, name: 'Docs', item: `${SITE}docs.html` },
        ],
      },
    ],
  };
}

export { icon };
