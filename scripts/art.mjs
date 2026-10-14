// Skye, the installkite mascot, and the shared art: a cheerful kite shaped
// like an app icon, with a tail of little download arrows, flying on a
// string. Every SVG in assets/ and docs/assets/ is generated from here by
// scripts/build-art.mjs, so the art stays consistent.

export const COLORS = {
  sky: '#2b8ff0',
  skyLight: '#6cc3ff',
  skyDeep: '#1667d6',
  sunset: '#ff8a3d',
  sunsetDeep: '#f25f2a',
  ink: '#12233f',
  inkSoft: '#3b5579',
  cloud: '#ffffff',
  night: '#0b1426',
};

let uid = 0;
const id = (name) => `${name}${++uid}`;

/** The kite body, face, spars and highlight. Centered at (120, 92) in a 240 box. */
function kite({ rim = false, mood = 'happy' } = {}) {
  const g = id('kb');
  const shine = id('ks');
  const rimShape = rim
    ? `<rect x="-58" y="-58" width="116" height="116" rx="31" transform="translate(120 92) rotate(45)" fill="#eaf4ff"/>`
    : '';
  const mouth =
    mood === 'wow'
      ? `<ellipse cx="120" cy="111" rx="7" ry="8" fill="${COLORS.ink}"/><ellipse cx="120" cy="114" rx="4" ry="3" fill="#ff7a7a"/>`
      : `<path d="M104 104 Q120 124 136 104 Q120 111 104 104Z" fill="${COLORS.ink}"/><path d="M111 111 Q120 119 129 111 Q120 114 111 111Z" fill="#ff8f8f"/>`;
  return `<defs>
    <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.skyLight}"/><stop offset=".55" stop-color="${COLORS.sky}"/><stop offset="1" stop-color="${COLORS.skyDeep}"/></linearGradient>
    <linearGradient id="${shine}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  ${rimShape}
  <rect x="-52" y="-52" width="104" height="104" rx="26" transform="translate(120 92) rotate(45)" fill="url(#${g})"/>
  <rect x="-52" y="-52" width="104" height="104" rx="26" transform="translate(120 92) rotate(45)" fill="none" stroke="${COLORS.skyDeep}" stroke-opacity=".55" stroke-width="2.5"/>
  <path d="M120 33 L120 151 M61 92 L179 92" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>
  <path d="M120 36 C103 52 84 71 66 88 C78 79 98 70 120 66 C126 56 125 45 120 36Z" fill="url(#${shine})"/>
  <ellipse cx="102" cy="92" rx="7.5" ry="9.5" fill="${COLORS.ink}"/>
  <ellipse cx="138" cy="92" rx="7.5" ry="9.5" fill="${COLORS.ink}"/>
  <circle cx="104.5" cy="88" r="3" fill="#fff"/>
  <circle cx="140.5" cy="88" r="3" fill="#fff"/>
  <circle cx="100" cy="96" r="1.4" fill="#fff" fill-opacity=".8"/>
  <circle cx="136" cy="96" r="1.4" fill="#fff" fill-opacity=".8"/>
  <ellipse cx="88" cy="105" rx="8.5" ry="5.2" fill="#ffb3a1" fill-opacity=".85"/>
  <ellipse cx="152" cy="105" rx="8.5" ry="5.2" fill="#ffb3a1" fill-opacity=".85"/>
  ${mouth}`;
}

/** One download arrow bow on the tail: a small orange app tile with a white arrow. */
export function arrowBow(x, y, size, rotate = 0) {
  const g = id('ab');
  const s = size / 2;
  const k = size / 18;
  return `<g transform="translate(${x} ${y}) rotate(${rotate})">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.sunset}"/><stop offset="1" stop-color="${COLORS.sunsetDeep}"/></linearGradient></defs>
    <rect x="${-s}" y="${-s}" width="${size}" height="${size}" rx="${size * 0.28}" fill="url(#${g})"/>
    <path d="M0 ${-4.6 * k} V${3.4 * k} M${-3.6 * k} ${0.2 * k} L0 ${3.8 * k} L${3.6 * k} ${0.2 * k}" fill="none" stroke="#fff" stroke-width="${2.1 * k}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

/** The tail string with three arrow bows, from the kite's bottom tip. */
function tail({ rim = false } = {}) {
  const color = rim ? '#cfe3ff' : COLORS.inkSoft;
  return `<path d="M120 154 C112 170 134 180 120 198 C108 213 92 214 82 230" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
  ${arrowBow(124, 172, 19, -12)}
  ${arrowBow(110, 205, 16, 14)}
  ${arrowBow(84, 228, 13, -8)}`;
}

/** The flying string, toward the bottom right. */
function string({ rim = false } = {}) {
  return `<path d="M141 116 Q190 168 236 236" fill="none" stroke="${rim ? '#cfe3ff' : COLORS.inkSoft}" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>`;
}

function wind({ rim = false } = {}) {
  const c = rim ? '#9fd0ff' : '#8cc8ff';
  return `<path d="M22 70 Q40 62 56 70 M14 98 Q30 92 44 98 M28 126 Q42 120 54 126" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
}

/** The full mascot (240 x 240). */
export function mascot({ rim = false, title = 'Skye, the installkite mascot: a kite shaped like an app icon with a tail of download arrows' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${title}">
  <title>${title}</title>
  ${wind({ rim })}
  ${string({ rim })}
  ${tail({ rim })}
  ${kite({ rim })}
</svg>
`;
}

/** Just the kite head (for favicons and small spots). */
export function mascotHead({ rim = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="44 16 152 152" role="img" aria-label="Skye, the installkite kite">
  <title>Skye, the installkite kite</title>
  ${kite({ rim })}
</svg>
`;
}

/** The favicon: the kite diamond with a white download arrow, readable at 16 px. */
export function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.skyLight}"/><stop offset=".6" stop-color="${COLORS.sky}"/><stop offset="1" stop-color="${COLORS.skyDeep}"/></linearGradient></defs>
  <rect x="-20" y="-20" width="40" height="40" rx="10" transform="translate(32 30) rotate(45)" fill="url(#f)"/>
  <path d="M32 15 V37 M23.5 29 L32 37.5 L40.5 29" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="26" y="52" width="12" height="9" rx="3" fill="${COLORS.sunset}"/>
</svg>
`;
}

// ---------- Scenes for banners ----------

function cloud(x, y, s, fill = '#fff', opacity = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}" fill-opacity="${opacity}"><path d="M10 40 C0 40 -4 26 8 22 C8 8 26 2 34 14 C40 4 60 6 60 22 C72 22 74 40 62 40 Z"/></g>`;
}

function star(x, y, r, o = 0.9) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity="${o}"/>`;
}

/** A phone with a home screen, the installed app icon highlighted. */
export function phone(x, y, scale, { dark = false } = {}) {
  const frame = dark ? '#1c2a44' : '#13223d';
  const screenA = dark ? '#1b3157' : '#bfe3ff';
  const screenB = dark ? '#3a2350' : '#ffd8bd';
  const g = id('ph');
  const tiles = [];
  const palette = dark ? ['#2d4a78', '#3a3f6b', '#2a5a6b', '#4a3b6b', '#2f5d55', '#5a3f4f'] : ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];
  let k = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const tx = 14 + col * 28;
      const ty = 44 + row * 32;
      if (row === 1 && col === 1) {
        tiles.push(`<g transform="translate(${tx} ${ty})"><rect width="22" height="22" rx="6" fill="${COLORS.sky}"/><path d="M11 4.5 V14.5 M6.8 10.6 L11 14.8 L15.2 10.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="-3" y="-3" width="28" height="28" rx="8" fill="none" stroke="${COLORS.sunset}" stroke-width="2"/></g>`);
      } else {
        tiles.push(`<rect x="${tx}" y="${ty}" width="22" height="22" rx="6" fill="${palette[k++ % palette.length]}" fill-opacity="${dark ? 1 : 0.85}"/>`);
      }
    }
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${screenA}"/><stop offset="1" stop-color="${screenB}"/></linearGradient></defs>
    <rect width="112" height="200" rx="20" fill="${frame}"/>
    <rect x="6" y="6" width="100" height="188" rx="15" fill="url(#${g})"/>
    <rect x="40" y="12" width="32" height="8" rx="4" fill="${frame}"/>
    <text x="56" y="34" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10" font-weight="600" fill="${dark ? '#dbe8ff' : COLORS.ink}">9:41</text>
    ${tiles.join('\n    ')}
    <rect x="16" y="160" width="80" height="22" rx="11" fill="${dark ? '#ffffff' : '#ffffff'}" fill-opacity="${dark ? 0.12 : 0.6}"/>
  </g>`;
}

/** Feature pills, wrapped in rows of up to 290 px. */
function chips(words, x, y, dark) {
  let cx = 0;
  let cy = 0;
  const out = [];
  for (const w of words) {
    const width = Math.round(w.length * 8.6 + 26);
    if (cx + width > 290) {
      cx = 0;
      cy += 36;
    }
    out.push(`<g transform="translate(${cx} ${cy})"><rect width="${width}" height="28" rx="14" fill="${dark ? '#ffffff' : '#ffffff'}" fill-opacity="${dark ? 0.1 : 0.75}" stroke="${dark ? '#ffffff' : COLORS.sky}" stroke-opacity="${dark ? 0.18 : 0.35}"/><text x="${width / 2}" y="19" text-anchor="middle" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="15" font-weight="600" fill="${dark ? '#dbe6ff' : COLORS.inkSoft}">${w}</text></g>`);
    cx += width + 8;
  }
  return `<g transform="translate(${x} ${y})">${out.join('')}</g>`;
}

/** The README banner (1280 x 400), light or dark. */
export function banner({ dark = false } = {}) {
  const sky = id('sky');
  const sun = id('sun');
  const top = dark ? '#0b1426' : '#bfe6ff';
  const mid = dark ? '#1d2a55' : '#e3f4ff';
  const low = dark ? '#5a3a6b' : '#ffe2c8';
  const ink = dark ? '#f2f6ff' : COLORS.ink;
  const soft = dark ? '#b8c7e6' : COLORS.inkSoft;
  const stars = dark ? [star(80, 40, 1.6), star(220, 90, 1.2), star(420, 30, 1.4), star(610, 70, 1), star(900, 40, 1.5), star(1040, 110, 1.1), star(1200, 50, 1.4), star(760, 24, 1.2), star(340, 120, 0.9, 0.6)].join('') : '';
  const kiteSvg = mascot({ rim: dark })
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replace(/<title>[\s\S]*?<\/title>/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 400" role="img" aria-label="installkite: make any website installable and offline capable with one line">
  <title>installkite: make any website installable and offline capable with one line</title>
  <defs>
    <linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".62" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/></linearGradient>
    <radialGradient id="${sun}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${COLORS.sunset}" stop-opacity="${dark ? 0.55 : 0.45}"/><stop offset="1" stop-color="${COLORS.sunset}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1280" height="400" rx="28" fill="url(#${sky})"/>
  <circle cx="1080" cy="430" r="260" fill="url(#${sun})"/>
  ${stars}
  ${cloud(150, 300, 1.6, '#fff', dark ? 0.08 : 0.9)}
  ${cloud(560, 40, 1.1, '#fff', dark ? 0.06 : 0.75)}
  ${cloud(1150, 260, 1.3, '#fff', dark ? 0.08 : 0.85)}
  <g transform="translate(36 60) scale(1.18)">${kiteSvg}</g>
  <text x="352" y="170" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="78" font-weight="800" letter-spacing="-2" fill="${ink}">install<tspan fill="${COLORS.sky}">kite</tspan></text>
  <text x="356" y="222" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="27" font-weight="500" fill="${soft}">Make any website installable and offline capable.</text>
  <g transform="translate(356 258)">
    <rect width="356" height="54" rx="14" fill="${dark ? '#0f1b33' : COLORS.ink}"/>
    <text x="22" y="35" font-family="Cascadia Code, Consolas, monospace" font-size="21" fill="#9fd0ff">$</text>
    <text x="44" y="35" font-family="Cascadia Code, Consolas, monospace" font-size="21" fill="#fff">npx installkite init</text>
  </g>
  ${chips(['manifest', 'icons', 'service worker', 'offline page', 'install button'], 736, 254, dark)}
  ${phone(1062, 70, 1.12, { dark })}
</svg>
`;
}

// ---------- Icon set ----------

const ICON_PATHS = {
  manifest: (c) => `<rect x="12" y="9" width="24" height="30" rx="4"/><path d="M17 17h14M17 23h14M17 29h8"/><circle cx="33" cy="33" r="5" fill="${c.accent}" stroke="none"/>`,
  icons: (c) => `<rect x="9" y="9" width="13" height="13" rx="4"/><rect x="26" y="9" width="13" height="13" rx="4"/><rect x="9" y="26" width="13" height="13" rx="4"/><rect x="26" y="26" width="13" height="13" rx="4" fill="${c.accent}" stroke="none"/>`,
  maskable: (c) => `<rect x="8" y="8" width="32" height="32" rx="9"/><circle cx="24" cy="24" r="12.8" stroke-dasharray="3 3" stroke="${c.accent}"/><path d="M24 17v11m-4.5-4.5L24 28l4.5-4.5"/>`,
  'service-worker': (c) => `<path d="M24 7l14 6v10c0 9-6 15-14 18-8-3-14-9-14-18V13z"/><path d="M18 24l4.5 4.5L31 20" stroke="${c.accent}"/>`,
  offline: (c) => `<path d="M8 19a23 23 0 0 1 32 0M13 25a16 16 0 0 1 22 0M18.5 31a8 8 0 0 1 11 0"/><circle cx="24" cy="37" r="2.4" fill="${c.stroke}" stroke="none"/><path d="M9 9l30 30" stroke="${c.accent}"/>`,
  precache: (c) => `<ellipse cx="24" cy="12" rx="13" ry="5"/><path d="M11 12v24c0 2.8 5.8 5 13 5s13-2.2 13-5V12M11 24c0 2.8 5.8 5 13 5s13-2.2 13-5"/><path d="M30 33h6" stroke="${c.accent}"/>`,
  install: (c) => `<path d="M24 8v20m-7-7l7 7 7-7"/><path d="M10 30v6a4 4 0 0 0 4 4h20a4 4 0 0 0 4-4v-6" stroke="${c.accent}"/>`,
  'ios-share': (c) => `<path d="M24 28V8m-6 6l6-6 6 6"/><path d="M16 20h-3v20h22V20h-3" stroke="${c.accent}"/>`,
  update: (c) => `<path d="M38 24a14 14 0 1 1-4.1-9.9"/><path d="M38 9v7h-7" stroke="${c.accent}"/><path d="M24 18v7l4 3"/>`,
  doctor: (c) => `<path d="M15 8v9a9 9 0 0 0 18 0V8"/><path d="M24 26v5a7 7 0 0 0 14 0v-3"/><circle cx="38" cy="25" r="3" fill="${c.accent}" stroke="none"/>`,
  cli: (c) => `<rect x="7" y="10" width="34" height="28" rx="5"/><path d="M14 20l5 4-5 4"/><path d="M23 29h10" stroke="${c.accent}"/>`,
  'github-pages': (c) => `<circle cx="24" cy="24" r="16"/><path d="M8 24h32M24 8c5 5 5 27 0 32M24 8c-5 5-5 27 0 32"/><path d="M33 33l6 6" stroke="${c.accent}"/>`,
  frameworks: (c) => `<rect x="8" y="8" width="14" height="14" rx="3"/><circle cx="33" cy="15" r="7"/><path d="M15 26l8 14H7z"/><rect x="26" y="26" width="14" height="14" rx="3" fill="${c.accent}" stroke="none"/>`,
  size: (c) => `<path d="M10 16h28M10 24h20M10 32h12"/><path d="M34 28l4 4-4 4" stroke="${c.accent}"/>`,
  kite: (c) => `<rect x="-11" y="-11" width="22" height="22" rx="6" transform="translate(24 20) rotate(45)"/><path d="M24 36c-3 3 3 5 0 8" /><rect x="20" y="40" width="5" height="5" rx="1.5" fill="${c.accent}" stroke="none"/>`,
};

export const ICON_NAMES = Object.keys(ICON_PATHS);

/** One icon of the set (48 x 48), on a soft tile. */
export function icon(name, { dark = false, tile = true } = {}) {
  const c = dark ? { stroke: '#cfe6ff', accent: '#ff9d5c', tile: '#16233d', ring: '#2a3d63' } : { stroke: COLORS.skyDeep, accent: COLORS.sunsetDeep, tile: '#eaf5ff', ring: '#cfe6ff' };
  const body = ICON_PATHS[name](c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">${tile ? `<rect x="1" y="1" width="46" height="46" rx="12" fill="${c.tile}" stroke="${c.ring}"/>` : ''}<g fill="none" stroke="${c.stroke}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`;
}
