# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-13

### Added

- `installkite init`: scans a static site or a Vite, Next.js, Astro, WordPress or Laravel project, asks a few questions (or none with `--yes`) and writes the web app manifest, the icon set, an offline page, the runtime script, the service worker and `installkite.config.json`, then injects the head tags into the HTML files between marker comments. Idempotent, with `--dry-run` diffs.
- Icon generation from one PNG or SVG in pure JavaScript: a PNG codec, Lanczos resampling in premultiplied alpha, an SVG rasterizer for logos, ten manifest sizes, maskable icons scaled into the 40% radius safe zone, an opaque apple-touch-icon, favicon.ico with 16, 32 and 48 px images, placeholder screenshots and a monogram fallback.
- A service worker with a content hashed precache that reuses unchanged files between versions, network first navigations with a timeout and cached page fallbacks, stale while revalidate assets, a capped image cache, an offline page, navigation preload and messages for skip waiting and saving pages.
- `installkite build` (and `--check` for CI) to re-hash the precache list after each site build.
- `installkite doctor`: an installability and offline audit on the files on disk or a live URL, with a fix for every rule and `--json` output.
- `installkite icons` and `installkite remove`.
- The runtime script (`installkite.js`, 4.4 kB gzipped): service worker registration, an install button from `beforeinstallprompt`, the iOS Add to Home Screen sheet, the "Refresh to update" toast, an offline badge and events. Also an ES module build at `installkite/runtime`.
- Base path detection for GitHub Pages project sites and framework configs, and `--relative` URLs.
- A typed Node API for every step.
- The docs site with a live install demo, an in browser manifest and icon generator, docs and eight guides.

[0.1.0]: https://github.com/kwy404/installkite/releases/tag/v0.1.0
