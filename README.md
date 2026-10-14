<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot.svg" width="168" alt="Skye, the installkite mascot: a cheerful kite shaped like an app icon with a tail of little download arrows, flying on a string">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/banner-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/banner.svg" width="820" alt="installkite banner: make any website installable and offline capable with npx installkite init, which writes the manifest, icons, service worker, offline page and install button">
  </picture>
</p>

<h1 align="center">installkite: make any website installable and offline capable</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/v/installkite?color=2b8ff0&label=npm" alt="installkite npm version"></a>
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/dm/installkite" alt="installkite npm downloads per month"></a>
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/dt/installkite" alt="installkite total npm downloads"></a>
  <a href="https://github.com/kwy404/installkite/actions/workflows/ci.yml"><img src="https://github.com/kwy404/installkite/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/kwy404/installkite/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/installkite?color=2b8ff0" alt="MIT license"></a>
  <a href="https://github.com/kwy404/installkite/blob/main/scripts/size.mjs"><img src="https://img.shields.io/badge/runtime-4.4%20kB%20gzip-ff8a3d" alt="The runtime script is 4.4 kB gzipped"></a>
</p>

<p align="center">
  <a href="https://kwy404.github.io/installkite/">Website and live demo</a> &middot;
  <a href="https://kwy404.github.io/installkite/generator.html">Manifest and icon generator</a> &middot;
  <a href="https://kwy404.github.io/installkite/docs.html">Docs</a> &middot;
  <a href="https://kwy404.github.io/installkite/guides.html">Guides</a> &middot;
  <a href="https://github.com/kwy404/installkite/blob/main/i18n/README.pt-BR.md">Leia em Português (pt-BR)</a>
</p>

**installkite turns any website into an installable, offline capable progressive web app with one command.** Run `npx installkite init` in a static site folder (or a Vite, Next.js, Astro, WordPress or Laravel project). It writes the web app manifest, a complete icon set from one PNG or SVG (maskable icons with safe zone padding, apple-touch-icon, favicons), a service worker with sensible caching and an offline page, and injects the head tags into your HTML. A 4.4 kB runtime adds an install button, the iOS "Add to Home Screen" sheet, a "Refresh to update" toast and an offline badge. `installkite doctor` audits the result.

```bash
npx installkite init
```

<table>
  <tr>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/manifest.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/manifest.svg" width="32" alt="Manifest icon: PWA manifest generator"></picture><br><b>Web app manifest</b><br>Name, colors, display, start_url, scope, id, shortcuts and screenshot placeholders.</td>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/icons.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/icons.svg" width="32" alt="Icon grid icon: PWA icon sizes"></picture><br><b>Every icon size</b><br>48 to 512 px, maskable, apple-touch-icon, favicon.ico, from one image. Pure JS.</td>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/maskable.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/maskable.svg" width="32" alt="Safe zone icon: maskable icons"></picture><br><b>Maskable safe zone</b><br>The artwork is measured and scaled into the 80% circle, on a full bleed background.</td>
  </tr>
  <tr>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/service-worker.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/service-worker.svg" width="32" alt="Shield icon: service worker generator"></picture><br><b>Service worker</b><br>Hashed precache, network first pages with a timeout, stale while revalidate assets.</td>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/offline.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/offline.svg" width="32" alt="Wifi off icon: offline page"></picture><br><b>Offline page</b><br>Self contained, in your colors, with links to the pages saved on the device.</td>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/install.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/install.svg" width="32" alt="Download icon: install button"></picture><br><b>Install button</b><br>Catches beforeinstallprompt; iOS gets the Add to Home Screen steps.</td>
  </tr>
  <tr>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/update.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/update.svg" width="32" alt="Refresh icon: update toast"></picture><br><b>Update toast</b><br>"Refresh to update" when a new version is ready, then one clean reload.</td>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/doctor.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/doctor.svg" width="32" alt="Stethoscope icon: PWA audit"></picture><br><b>installkite doctor</b><br>Installability and offline audit, on files or a live URL, with a fix per rule.</td>
    <td width="33%" valign="top"><picture><source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/dark/github-pages.svg"><img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/icons/light/github-pages.svg" width="32" alt="Globe icon: GitHub Pages and Netlify"></picture><br><b>Any host, any base path</b><br>GitHub Pages project paths, Netlify, Vite, Next.js and Astro base settings.</td>
  </tr>
</table>

## Table of contents

- [Quick start](#quick-start)
- [What init writes](#what-init-writes)
- [Use with React, Vue, Angular, Next.js and more](#use-with-react-vue-angular-nextjs-and-more)
- [CLI](#cli)
- [Runtime script and API](#runtime-script-and-api)
- [Service worker](#service-worker)
- [installkite doctor](#installkite-doctor)
- [Config file](#config-file)
- [Node API](#node-api)
- [Online generator](#online-generator)
- [Doing it by hand compared with installkite](#doing-it-by-hand-compared-with-installkite)
- [Limits](#limits)
- [FAQ](#faq)
- [Guides](#guides)
- [More from kwy404](#more-from-kwy404)
- [Author](#author)
- [License](#license)

## Quick start

In the folder of your site:

```bash
npx installkite init --dry-run   # read a diff of every change first
npx installkite init             # answer a few questions, or add --yes
npx installkite doctor           # audit installability and offline readiness
```

Deploy over HTTPS (GitHub Pages, Netlify, Vercel and Cloudflare Pages all qualify) and the browser offers to install the site. After every later site build, refresh the precache list:

```bash
npx installkite build            # for CI: npx installkite build --check
```

Only want the runtime? It ships on the CDN, pinned to a version:

```html
<script src="https://cdn.jsdelivr.net/npm/installkite@0.1.0/dist/installkite.min.js" data-sw="/sw.js" data-install="auto" defer></script>
```

Or from npm:

```bash
npm install --save-dev installkite
```

## What init writes

From a real run on a three page site:

| File | What it is |
| --- | --- |
| `manifest.webmanifest` | id, name, short_name, description, lang, start_url, scope, display, colors, icons, shortcuts, screenshots |
| `icons/icon-48.png` to `icon-512.png` | Ten sizes with purpose `any`, transparency kept |
| `icons/maskable-192.png`, `maskable-512.png` | Full bleed, artwork scaled into the 40% radius safe zone |
| `icons/icon.svg` | Your SVG source as a scalable favicon (SVG sources only) |
| `apple-touch-icon.png` | 180 x 180, opaque, padded for transparent artwork |
| `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png` | The ICO holds 16, 32 and 48 px PNG images |
| `icons/screenshot-wide.png`, `screenshot-narrow.png` | Placeholders for the richer install dialog (doctor reminds you to replace them) |
| `offline.html` | Offline page in your colors, icon inlined, saved pages listed |
| `installkite.js` | The 4.4 kB runtime |
| `sw.js` | The service worker with the hashed precache list |
| `installkite.config.json` | What init decided, so `build` and `doctor` need no questions |

The head tags go into every HTML page between two marker comments. Running init again updates that block in place, and tags the page already has (a favicon, a manifest link, a theme color) are kept and not duplicated:

```html
<!-- installkite:start -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#e8590c">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Acme Bakery">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<script src="/installkite.js" data-sw="/sw.js" data-install="auto" data-offline="badge" defer></script>
<!-- installkite:end -->
```

No logo? installkite finds one from your favicon links and common file names, and when there is none it draws a monogram of your app's initials in the theme color.

## Use with React, Vue, Angular, Next.js and more

**Plain HTML.** Run `npx installkite init` in the folder with `index.html`. Every page gets the tags, and `installkite build` adds them to pages created later.

**React, Vue or Svelte with Vite.** init writes the files to `public/`, the tags into the source `index.html`, and appends `npx installkite build` to the `build` script so `dist/sw.js` precaches the hashed bundles. To use the runtime API from your components, import the module build:

```js
// src/main.jsx (React) or src/main.js (Vue)
import installkite from 'installkite/runtime';

installkite.init({ sw: '/sw.js', install: 'none' });
installkite.on('installable', () => setCanInstall(true));
```

```jsx
// A React install button
function InstallButton() {
  const [ready, setReady] = useState(installkite.canInstall);
  useEffect(() => installkite.on('installable', () => setReady(true)), []);
  return ready ? <button onClick={() => installkite.install()}>Install app</button> : null;
}
```

```vue
<!-- A Vue install button -->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import installkite from 'installkite/runtime';

const ready = ref(installkite.canInstall);
let off;
onMounted(() => (off = installkite.on('installable', () => (ready.value = true))));
onUnmounted(() => off?.());
</script>

<template>
  <button v-if="ready" @click="installkite.install()">Install app</button>
</template>
```

**Angular.** Angular 17 and newer serve `public/` and build to `dist/<app>/browser`:

```bash
npx installkite init --root dist/my-app/browser --public public --no-inject
```

```ts
// src/main.ts
import installkite from 'installkite/runtime';

installkite.init({ sw: '/sw.js', install: 'auto' });
```

Paste the printed tags into `src/index.html` and add `npx installkite build` after `ng build`.

**Next.js (static export).** With `output: 'export'` the site builds to `out/`. init writes to `public/`, updates the build script and prints the tags; put them in the root layout:

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const viewport: Viewport = { themeColor: '#2b8ff0' };
export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  appleWebApp: { title: 'Acme', statusBarStyle: 'default' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="/installkite.js" data-sw="/sw.js" data-install="auto" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

**Astro, WordPress, Laravel, GitHub Pages and Netlify** each have a recipe in the [docs](https://kwy404.github.io/installkite/docs.html#recipes). In short: Astro and Laravel use `public/`, WordPress serves the files from the site root with the tags printed from `wp_head`, GitHub Pages project sites get their `/repo/` base path detected from the git remote, and Netlify needs `npm run build && npx installkite build` as the build command.

## CLI

```text
npx installkite init [options]      manifest, icons, service worker, offline page and head tags
npx installkite build [options]     refresh the precache list after each site build (CI)
npx installkite doctor [options]    audit installability and offline readiness
npx installkite icons <image>       only the icon set from one PNG or SVG
npx installkite remove              take the installkite tags out of the HTML files
```

| init option | What it does |
| --- | --- |
| `--root <dir>` | The deployed folder that gets precached (detected: `.`, `dist`, `out`, `public`) |
| `--public <dir>` | Where generated files go (`public/` for Vite, Next.js, Astro) |
| `--base <path>` | URL path the site is served under, like `/my-repo/` on GitHub Pages |
| `--relative` | Relative URLs (`./`, `../`) in head tags, for sites served from any folder |
| `--icon <file>` | Source image, PNG or SVG, 512 px or larger |
| `--name`, `--short-name`, `--description`, `--lang` | Manifest text |
| `--theme-color`, `--theme-color-dark`, `--background-color` | Any CSS color |
| `--display <mode>` | `standalone` (default), `fullscreen`, `minimal-ui` or `browser` |
| `--start-url`, `--scope`, `--orientation` | Manifest fields (start_url and scope default to `./`) |
| `--cdn` | Link installkite.js from jsDelivr instead of copying it |
| `--no-runtime` | Leave out installkite.js and register the worker yourself |
| `--no-inject` | Do not edit HTML; the tags to paste are printed |
| `--no-install-button`, `--no-update-toast`, `--no-offline-indicator` | Turn off parts of the runtime interface |
| `--no-offline-page`, `--no-screenshots`, `--no-shortcuts`, `--no-postbuild` | Skip those outputs |
| `-y`, `--yes` | Accept detected values, ask nothing (also the behavior without a terminal) |
| `-n`, `--dry-run` | Print a unified diff of every change and write nothing |

`build --check` exits with code 1 when `sw.js` is out of date. `doctor --url <url>` audits a live site, `--json` prints the report, `--strict` fails on warnings. `icons` takes `--out`, `--background` and `--screenshots`. Every command takes `--cwd`, `--no-color` and `--quiet`. Exit codes: 0 success, 1 failure, 2 usage error.

## Runtime script and API

```html
<script src="/installkite.js" data-sw="/sw.js" data-install="auto" data-offline="badge" defer></script>
<button data-installkite-install hidden>Install the app</button>
```

| Attribute | Meaning |
| --- | --- |
| `data-sw` | Service worker URL (default: `sw.js` next to installkite.js) |
| `data-scope` | Registration scope (default: the worker folder) |
| `data-install="auto"` | A floating install button when the site can be installed; dismissing it hides it for 14 days |
| `data-update="none"` | No "Refresh to update" toast |
| `data-offline="badge"` | A small badge while offline |
| `data-manual` | Do not register; call `installkite.register()` yourself |

Elements with `data-installkite-install` stay hidden until the site can be installed and open the prompt (or the iOS sheet) when clicked.

```js
installkite.on('installable', () => showMyButton());
const outcome = await installkite.install(); // 'accepted', 'dismissed', 'instructions' (iOS) or 'unavailable'
installkite.on('installed', () => track('installed'));
installkite.on('update', ({ apply }) => showBanner('New version', apply));
installkite.on('offline', () => document.body.classList.add('offline'));
await installkite.cache(['/articles/one/']); // save pages for offline reading
```

| Member | What it does |
| --- | --- |
| `init(options)` | Start (the script tag build calls it with the data attributes). Options: `sw`, `scope`, `install`, `update`, `offline`, `manual`, `snoozeDays`, `text` |
| `register(url?, scope?)` | Register the service worker; resolves to the registration or `null` |
| `install()` | Show the install prompt, or the iOS sheet |
| `update()` | Activate a waiting worker and reload once it takes over |
| `cache(urls)` | Save pages to the offline page cache; resolves to the count saved |
| `showIOSInstructions()` | Open the Add to Home Screen sheet |
| `on(event, fn)`, `off(event, fn)` | Events: `ready`, `installable`, `installed`, `update`, `updated`, `offline`, `online`, `error`. Also dispatched on window as `installkite:<event>` |
| `canInstall`, `isInstalled`, `isIOS`, `online`, `registration`, `version` | Read only state |

The interface follows your `theme-color` meta tag and dark mode. Override it with `--installkite-accent`, `--installkite-on-accent`, `--installkite-surface`, `--installkite-text` (and `-dark` variants), and translate every string through `text`.

## Service worker

| Request | Strategy |
| --- | --- |
| Precached files (built HTML, CSS, JS, fonts, key icons) | Cache first from a versioned precache. Each file has a content hash, so a new version downloads only what changed and copies the rest |
| Page navigations | Network first, raced against a 3 s timeout, then the cached page (`/page/`, `/page/index.html` and `/page.html` are tried), then the offline page. Navigation preload when available |
| Scripts, styles, fonts, JSON (same origin and common CDNs) | Stale while revalidate, 120 entries |
| Images | Cache first, 60 entries, 30 days |
| POST, range requests, other origins, excluded paths | Not handled |

Options live under `sw` in the config: `offline`, `navigationTimeout`, `imageMaxEntries`, `imageMaxAge`, `assetMaxEntries`, `pageMaxEntries`, `exclude` (path prefixes or `"/regex/"`), `crossOrigin`, `skipWaiting`, `importScripts` (your own push or sync code), and `include` and `maxFileSize` for the precache.

## installkite doctor

```text
installkite doctor / (files on disk)

  pass  Page links a web app manifest: links /manifest.webmanifest
  pass  Opens in its own window: display: standalone
  pass  Icons 192 and 512: 13 icons
  pass  Service worker controls start_url: scope /
  pass  Precache list is current: 13 files, hashes match
  warn  Screenshots: 2 screenshots are still the installkite placeholder
        fix: Replace the screenshot files with real captures of your app (same file names and sizes).

  installable and offline ready, 1 warning
```

Doctor checks HTTPS, the viewport, the manifest link, JSON and content type, name and label length, display mode, start_url (set, same origin, inside scope, reachable), the id, colors, 192 and 512 icons, every icon file and its real pixel size, maskable icons (present, full bleed, not mixed with `any`), screenshots, the theme-color tag, the apple-touch-icon (180 px, opaque), the favicon, service worker registration, its content type, scope and fetch handler, the offline page, whether start_url is precached, and whether the precache list matches the files on disk.

## Config file

`installkite.config.json` sits next to your package.json, with a [JSON schema](https://kwy404.github.io/installkite/config.schema.json) for editor completion. Edit it and run `init --yes` again to apply.

```json
{
  "root": ".",
  "publicDir": ".",
  "base": "/",
  "icon": "logo.svg",
  "iconsDir": "icons",
  "html": ["**/*.html"],
  "app": { "name": "Acme Bakery", "display": "standalone", "themeColor": "#e8590c", "backgroundColor": "#ffffff", "startUrl": "./", "scope": "./", "screenshots": true },
  "runtime": { "mode": "local", "installButton": "auto", "updateToast": true, "offlineIndicator": true },
  "sw": { "navigationTimeout": 2500, "exclude": ["api/"] }
}
```

## Node API

Everything the CLI does is exported, typed, ESM and CommonJS:

```ts
import { applyPlan, doctorLocal, generateIcons, loadIconSource, maskableScale, planBuild, planInit } from 'installkite';

const plan = planInit(process.cwd(), { name: 'Acme Bakery', themeColor: '#e8590c' });
applyPlan(process.cwd(), plan.files);          // plan.files carry content and a diff
applyPlan(process.cwd(), planBuild(process.cwd()).files);

const { files } = generateIcons(loadIconSource(readFileSync('logo.svg'), 'logo.svg'));
maskableScale(Math.SQRT1_2);                    // 0.566: a full bleed square logo
const report = await doctorLocal(process.cwd());
```

Also exported: `generateManifest`, `injectHead`, `removeHead`, `buildPrecache`, `generateServiceWorker`, `createRouter` (the worker strategies against injected caches and fetch), `generateOfflinePage`, `scanSite`, `doctorRemote`, `rasterizeSvg`, `decodePng`, `encodePng`, `resize`, `encodeIco` and more. See the [Node API docs](https://kwy404.github.io/installkite/docs.html#node-api).

## Online generator

The [manifest and icon generator](https://kwy404.github.io/installkite/generator.html) does the manifest and icons in your browser, with nothing uploaded: drop a logo, type a name, preview the icon under every Android mask with the safe zone drawn on top, on the iOS home screen and on the splash screen, then download a zip with the manifest, all icons, favicon.ico and the head tags.

## Doing it by hand compared with installkite

| Task | By hand | installkite |
| --- | --- | --- |
| Manifest with every field | Write and keep JSON in sync | Generated from your page title, description, colors |
| Ten icon sizes, maskable, apple-touch-icon, favicon.ico | Export each from a design tool | One command from one PNG or SVG, pure JS |
| Maskable padding | Guess, then check every mask | Measured: farthest pixel inside the 40% radius |
| Service worker | Write install, activate and fetch handlers | Generated with four strategies and tests |
| Cache versioning | Bump a constant on every deploy | Content hashes, `installkite build` after each build |
| Offline page | Write and precache it | Generated in your colors, lists saved pages |
| Install button and iOS instructions | Handle `beforeinstallprompt` and iOS yourself | One script tag, 4.4 kB |
| Checking the result | Browser developer tools, by hand | `installkite doctor`, also against a live URL |

## Limits

- **SVG sources** use a built in rasterizer that covers what logos use: paths, shapes, gradients, strokes and dashes, transforms, opacity, clip paths, `use`, simple `<style>` rules and embedded PNG images. `<text>`, masks, filters and patterns are skipped with a warning; convert text to outlines first.
- **Raster sources** must be PNG for the CLI (the online generator also reads JPEG and WebP).
- **iOS** has no install prompt (the runtime shows instructions instead), and Firefox on desktop does not install sites; the service worker and offline page still work there.
- **Opaque cross origin responses** are never cached, to keep storage quotas small.

## FAQ

<details>
<summary><b>How do I make my website installable?</b></summary>

Browsers need a manifest with a name, a start URL, a standalone display mode and 192 and 512 px icons, HTTPS, and a service worker. `npx installkite init` writes all of it, `npx installkite doctor` checks each rule.
</details>

<details>
<summary><b>How do I convert a website to an app without rewriting it?</b></summary>

Make it a progressive web app: your site plus a manifest, icons and a service worker. Visitors install it from the browser with its own icon and window, and it keeps working as a website. See the [guide](https://kwy404.github.io/installkite/convert-website-to-app.html).
</details>

<details>
<summary><b>What PWA icon sizes do I need?</b></summary>

192 and 512 px icons with purpose `any`, maskable icons, a 180 px opaque apple-touch-icon and a favicon. installkite writes 48, 72, 96, 128, 144, 152, 192, 256, 384 and 512 px icons plus the rest. See [PWA icon sizes](https://kwy404.github.io/installkite/pwa-icon-sizes.html).
</details>

<details>
<summary><b>How do I show an offline page with a service worker?</b></summary>

Precache the page on install and serve it for navigations that fail. installkite's worker does that with a timeout for slow networks and lists the pages already saved. See the [offline page guide](https://kwy404.github.io/installkite/service-worker-offline-page.html).
</details>

<details>
<summary><b>How does Add to Home Screen work on iPhone?</b></summary>

Safari installs through Share, then Add to Home Screen, and has no install event. The runtime detects iOS and shows those steps when your install button is tapped. See the [iOS guide](https://kwy404.github.io/installkite/add-to-home-screen-ios.html).
</details>

<details>
<summary><b>Can I make a GitHub Pages site a PWA?</b></summary>

Yes. Project sites live under `/repo/`; installkite detects it from the git remote and writes the base path into every tag, or use `--relative`. See the [GitHub Pages guide](https://kwy404.github.io/installkite/github-pages-pwa.html).
</details>

<details>
<summary><b>How do updates reach installed apps?</b></summary>

Run `npx installkite build` after each site build. The browser sees the changed worker, downloads only changed files, and the runtime shows "Refresh to update".
</details>

<details>
<summary><b>Does it need a framework or a build step?</b></summary>

No. It works on a folder of HTML files. With a framework, it plugs into the build script.
</details>

## Guides

- [How to make a website installable](https://kwy404.github.io/installkite/make-website-installable.html)
- [Convert a website to an app without rewriting it](https://kwy404.github.io/installkite/convert-website-to-app.html)
- [PWA tutorial: turn a static site into a progressive web app](https://kwy404.github.io/installkite/pwa-tutorial.html)
- [Service worker offline page](https://kwy404.github.io/installkite/service-worker-offline-page.html)
- [Add to Home Screen on iOS](https://kwy404.github.io/installkite/add-to-home-screen-ios.html)
- [PWA manifest generator and every manifest field](https://kwy404.github.io/installkite/pwa-manifest-generator.html)
- [PWA icon sizes: the complete list](https://kwy404.github.io/installkite/pwa-icon-sizes.html)
- [Make a GitHub Pages site a PWA](https://kwy404.github.io/installkite/github-pages-pwa.html)

## More from kwy404

- [Monsoon](https://kwy404.github.io/monsoon/): utility-first CSS with no build step
- [Voodoo.js](https://kwy404.github.io/Voodoo.js/): reactive attributes for plain HTML
- [breakhound](https://kwy404.github.io/breakhound/): find bugs in any JavaScript library automatically
- [vueleap](https://kwy404.github.io/vueleap/): Vue 2 to Vue 3 migration
- [graphemely](https://kwy404.github.io/graphemely/): grapheme aware string utilities
- [numberparrot](https://kwy404.github.io/numberparrot/): parse localized numbers
- [edgegoat](https://kwy404.github.io/edgegoat/): edge case inputs for JavaScript testing
- [cookieowl](https://kwy404.github.io/cookieowl/): cookie consent that really blocks trackers before consent
- [a11ymedic](https://kwy404.github.io/a11ymedic/): WCAG checks with plain language explanations and exact HTML fixes

## Author

Created by **Alexandre Kohler** ([GitHub](https://github.com/kwy404) and [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)).

Built with [Monsoon](https://kwy404.github.io/monsoon/): the [docs site](https://kwy404.github.io/installkite/) is styled with Monsoon, and its interactive parts are built with [Voodoo.js](https://kwy404.github.io/Voodoo.js/).

## License

[MIT](https://github.com/kwy404/installkite/blob/main/LICENSE)
