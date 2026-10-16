# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The site checker at `/app/` on the docs site: paste a URL and see what the site still needs to be installed and to work offline, grouped into the page, the manifest, the icons and offline, with a fix for each problem. It runs the same rules as `installkite doctor` in the browser. When a site does not allow other pages to read its files (CORS), the checker says so in plain words and offers three ways forward: the one line `npx installkite doctor` command, pasting the page source and manifest, or the header that allows reading. Results can be shared by link and copied as text.
- `installkite doctor <url>`: the URL can be a plain argument, and `example.com` works too (https:// is added; http:// for localhost). `--url` still works.
- `--timeout <seconds>` for `doctor` on a live site.
- "Did you mean" hints for mistyped commands and options.
- `normalizeSiteUrl` in the Node API, and a `skip` status with a `skipped` count in doctor reports for rules that could not read a file (only the browser checker produces it).
- `npm run e2e`: an end to end test of the site checker in headless Edge or Chrome.

### Changed

- The doctor rules live in a module without Node APIs, shared by the CLI and the browser checker.
- doctor no longer stops when a PNG icon cannot be decoded; the pixel checks for that icon are left out.
- A screenshot that fails to load is no longer also reported as passing.

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

[Unreleased]: https://github.com/kwy404/installkite/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kwy404/installkite/releases/tag/v0.1.0
