// UI icons for the site, as one inline SVG sprite, plus helpers that
// inline the folded paper icon set and place the workshop scenes
// (scripts/art.mjs, written to docs/assets/art/ by the docs build).
import { COLORS, SCENE_TITLES, icon as artIcon } from '../scripts/art.mjs';

const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  github:
    '<path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" fill="currentColor" stroke="none"/>',
  npm: '<path d="M3 7h18v9h-9v2H8v-2H3z" fill="currentColor" stroke="none"/><path d="M6 9.5v4.5M6 9.5h3v4.5M13 9.5v6M13 9.5h3v3h-3M18 9.5v4.5" stroke="var(--background)" stroke-width="1.4"/>',
  book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 21h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  linkedin:
    '<path d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3 9h3v12H3zM9 9h2.9v1.7c.4-.8 1.4-1.9 3.3-1.9 3.4 0 4 2.2 4 5.1V21h-3v-6.3c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V21H9z" fill="currentColor" stroke="none"/>',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 20V9m0 0-4.5 4.5M12 9l4.5 4.5M5 4h14"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  plane: '<path d="M10.2 13.8 3 11l1.6-1.6 8 1.1 4.6-4.6a2 2 0 0 1 2.9 2.9l-4.6 4.6 1.1 8L15 23l-2.8-7.2-3.4 3.4.4 2.5-1.4 1.4-1.6-3.3-3.3-1.6 1.4-1.4 2.5.4z"/>',
  wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.3a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
  'wifi-off': '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.3a5 5 0 0 1 7 0"/><path d="M12 20h.01M3 3l18 18"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  zip: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M10 6h1M10 9h1M10 12h1M9.5 15h2v3h-2z"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M12 7v5m-2-2 2 2 2-2"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><rect x="4" y="9" width="11" height="6" rx="1" fill="currentColor" stroke="none"/>',
  signal: '<path d="M4 18v-2M9 18v-5M14 18v-8M19 18V7"/>',
  reset: '<path d="M3 12a9 9 0 1 0 2.64-6.36"/><path d="M3 3v6h6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  fold: '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};

/** The sprite, inlined once per page. */
export function sprite() {
  const symbols = Object.entries(P)
    .map(([name, body]) => `<symbol id="i-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`)
    .join('');
  return `<svg class="sprite" aria-hidden="true" focusable="false">${symbols}</svg>`;
}

/** A sprite icon reference. */
export function icon(name, cls = 'ic') {
  if (!P[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

/** An art set icon (light and dark variants, switched by CSS). */
export function artTile(name, cls = 'art-ic') {
  const strip = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 48 48" class="art-light">${strip(artIcon(name))}</svg><svg viewBox="0 0 48 48" class="art-dark">${strip(artIcon(name, { dark: true }))}</svg></span>`;
}

/**
 * A workshop scene, light (dawn) and dark (dusk) files, swapped by CSS.
 * Both are lazy, so the hidden one is never fetched.
 */
export function scene(name, { cls = 'scene', eager = false, alt = SCENE_TITLES[name] } = {}) {
  if (!SCENE_TITLES[name]) throw new Error(`unknown scene ${name}`);
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<span class="${cls}"><img class="art-light" src="assets/art/light/${name}.svg" width="480" height="320" alt="${alt}" ${load} decoding="async"><img class="art-dark" src="assets/art/dark/${name}.svg" width="480" height="320" alt="${alt}" loading="lazy" decoding="async"></span>`;
}

export { COLORS };
