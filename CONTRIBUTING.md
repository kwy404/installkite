# Contributing to installkite

Thanks for helping Skye fly. Bug reports, fixes and new framework recipes are welcome.

## Setup

```bash
git clone https://github.com/kwy404/installkite.git
cd installkite
npm install
npm run build
npm test
```

Node 18 or newer. The tests run the real CLI from `dist/`, so `npm test` builds first when `dist/` is missing or older than the sources.

## Checks

Run what CI runs before you open a pull request:

```bash
npm run build
npm run typecheck
npm run lint        # ESLint plus the house rules check (scripts/check-chars.mjs)
npm test
npm run docs:links
npm run size
```

House rules for every file: no emoji, no en or em dash characters (write an escape in code if a test needs one), and no names of other CSS frameworks.

## Layout

- `src/core/`: PNG codec, image operations, SVG rasterizer, icons, manifest, head injection, precache, doctor, scanning and the init and build pipelines.
- `src/sw/`: the service worker strategies (`router.ts`, tested with mocked caches and fetch) and its entry.
- `src/runtime/`: the browser runtime.
- `src/cli/`: the command line.
- `site/` and `scripts/build-docs.mjs`: the docs site, built into `docs/`.
- `scripts/art.mjs`: the mascot, banners and icons; `npm run art` writes `assets/`, `npm run images` renders the social images with Edge headless.

## Docs

Edit the sources in `site/`, never `docs/` directly, then run `npm run build && npm run docs`. `npm run docs:check` verifies that `docs/` is current. The build highlights code with Shiki, from a local install or a sibling `graphemely` checkout.

## Commits

Small, focused commits with a message that says what changed and why. Add a test for every bug fix.
