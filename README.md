<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot-dark.svg">
    <img src="https://cdn.jsdelivr.net/gh/kwy404/installkite@main/assets/mascot.svg" width="150" alt="Skye, the installkite mascot: a kite shaped like an app icon with a tail of little download arrows">
  </picture>
</p>

<h1 align="center">installkite</h1>

<p align="center">Make a website installable and offline capable with one command.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/installkite"><img src="https://img.shields.io/npm/v/installkite?color=2b8ff0&label=npm" alt="npm version"></a>
  <a href="https://github.com/kwy404/installkite/actions/workflows/ci.yml"><img src="https://github.com/kwy404/installkite/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="https://github.com/kwy404/installkite/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/installkite?color=2b8ff0" alt="MIT license"></a>
</p>

<p align="center">
  <a href="https://kwy404.github.io/installkite/">Website</a> &middot;
  <a href="https://kwy404.github.io/installkite/app/">Check a site</a> &middot;
  <a href="https://kwy404.github.io/installkite/generator.html">Icon generator</a> &middot;
  <a href="https://kwy404.github.io/installkite/docs.html">Docs</a> &middot;
  <a href="https://github.com/kwy404/installkite/blob/main/i18n/README.pt-BR.md">Português</a>
</p>

Run `npx installkite init` in your site folder. It writes the web app manifest, every icon size from one PNG or SVG, a service worker with an offline page, and the head tags for your HTML. Browsers can then install your site on a phone or a computer, with its own icon and window, and open it without a network. Visitors who just browse see the same site as before.

## Quick start

```bash
npx installkite init --dry-run   # see a diff of every change first
npx installkite init             # answer a few questions, or add --yes
npx installkite doctor           # check what browsers look for
```

Deploy over HTTPS. After each later site build, refresh the list of cached files:

```bash
npx installkite build
```

It works on plain HTML folders and on Vite, Next.js (static export), Astro, WordPress and Laravel sites. The [recipes](https://kwy404.github.io/installkite/docs.html#recipes) cover each one.

## What you get

| File | What it is |
| --- | --- |
| `manifest.webmanifest` | Name, colors, start URL, display mode, icons and shortcuts |
| `icons/`, `apple-touch-icon.png`, `favicon.ico` | Ten sizes, maskable icons with safe zone padding, the iPhone icon and favicons |
| `sw.js` | A service worker that caches your pages with content hashes |
| `offline.html` | A page in your colors for when there is no network |
| `installkite.js` | A 4.4 kB script: install button, iPhone install steps, update toast and offline badge |
| `installkite.config.json` | What init decided, so later runs ask nothing |

The head tags go between `<!-- installkite:start -->` and `<!-- installkite:end -->` in every page. Running init again updates that block in place and keeps tags you already had.

## Commands

```text
npx installkite init        write everything and add the head tags
npx installkite build       refresh the cached file list after a site build (--check for CI)
npx installkite doctor      check the files on disk, or a live site with --url
npx installkite icons <img> only the icon set
npx installkite remove      take the installkite tags out of the HTML
```

Every option is in the [CLI docs](https://kwy404.github.io/installkite/docs.html#init).

## Your own install button

```html
<script src="/installkite.js" data-sw="/sw.js" data-install="auto" defer></script>
<button data-installkite-install hidden>Install the app</button>
```

The button stays hidden until the browser can install the site. On iPhone and iPad it shows the Add to Home Screen steps instead. For more control:

```js
installkite.on('installable', () => showMyButton());
const outcome = await installkite.install(); // 'accepted', 'dismissed', 'instructions' or 'unavailable'
installkite.on('update', ({ apply }) => showBanner('New version', apply));
```

See the [runtime API](https://kwy404.github.io/installkite/docs.html#runtime-api) and the [Node API](https://kwy404.github.io/installkite/docs.html#node-api).

## Limits

- SVG logos are drawn by a small built in renderer. Text, masks, filters and patterns are skipped with a warning, so convert text to outlines first.
- The CLI reads PNG and SVG. The online generator also reads JPEG and WebP.
- iPhone and iPad have no install prompt, and desktop Firefox does not install sites. The offline page still works there.

## Guides

- [What makes a website installable](https://kwy404.github.io/installkite/make-website-installable.html)
- [Installing a website on iPhone and iPad](https://kwy404.github.io/installkite/add-to-home-screen-ios.html)
- [An offline page with a service worker](https://kwy404.github.io/installkite/service-worker-offline-page.html)
- [App icon sizes and maskable icons](https://kwy404.github.io/installkite/pwa-icon-sizes.html)

## More from kwy404

[Monsoon](https://kwy404.github.io/monsoon/), [Voodoo.js](https://kwy404.github.io/Voodoo.js/), [breakhound](https://kwy404.github.io/breakhound/), [vueleap](https://kwy404.github.io/vueleap/), [graphemely](https://kwy404.github.io/graphemely/), [numberparrot](https://kwy404.github.io/numberparrot/), [edgegoat](https://kwy404.github.io/edgegoat/), [cookieowl](https://kwy404.github.io/cookieowl/), [a11ymedic](https://kwy404.github.io/a11ymedic/), [fontsketch](https://kwy404.github.io/fontsketch/) and [kastor](https://kwy404.github.io/kastor/).

## Author

Made by **Alexandre Kohler** ([GitHub](https://github.com/kwy404), [LinkedIn](https://www.linkedin.com/in/alexandre-silva-173687256/)). The website is built with [Monsoon](https://kwy404.github.io/monsoon/), and its interactive parts with [Voodoo.js](https://kwy404.github.io/Voodoo.js/).

## License

[MIT](https://github.com/kwy404/installkite/blob/main/LICENSE)
