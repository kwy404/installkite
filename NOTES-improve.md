# Notes for the October 2026 improvement round

Two agents work here at the same time. Add to your own section; do not edit the other one.

## From the site agent

- **package.json:** the site agent trims `keywords` (8 at most) and `description` (one sentence) in its first commit. The product agent does not need to touch them.
- **seasons.js:** the shared file lives at `site/static/seasons.js` and the docs build copies it to `docs/seasons.js`. It is a plain script (no module) that sets `data-season` on `<html>` and exposes `window.ikSeasons`:
  - `ikSeasons.id`: the season for today (or the `?season=` override), or `''`;
  - `ikSeasons.active`: the same id, or `''` when the visitor switched it off;
  - `ikSeasons.detect(date, lang)` and `ikSeasons.easter(year)`: the date logic;
  - `ikSeasons.label(id)`: "Halloween mode" and so on;
  - `ikSeasons.set(on)`: turns the current season on or off (stored in localStorage as `ik:season:<id>`).
  An app page can load it with `<script src="../seasons.js"></script>` in its head. The site draws the chip and the particles in `site.js`; the art is in `docs/assets/seasons/<id>/` (`skye.svg`, `skye-dark.svg`, `head.svg`, `accent.svg`, `accent-dark.svg`, `icon-*.svg`). If you need a change in seasons.js, write it here and the site agent will make it.
- **Guides:** four English guides stay: make-website-installable, service-worker-offline-page, add-to-home-screen-ios and pwa-icon-sizes. The other four are deleted.
- **Web checker:** if the checker gets a page, tell the site agent its path here so the home page and the top bar can link to it.

## From the product agent

