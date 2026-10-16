// Skye, the installkite mascot, and the paper workshop art: a cheerful kite
// shaped like an app icon, a folded paper icon set and workshop scenes in a
// dawn (light) and a lantern lit dusk (dark) variant. Every SVG in assets/
// is generated from here by scripts/build-art.mjs, so the art stays consistent.

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

// ---------- The paper workshop: palette and primitives ----------
// Everything below is drawn as layered paper: flat cut shapes, a soft drop
// shadow under each layer, a crease that darkens one half of a fold, and
// dashed cut lines. Light is a dawn workshop, dark a lantern lit dusk.

export const PAPER = {
  light: {
    dark: false,
    paper: '#fffaf1',
    paper2: '#f6ecdc',
    kraft: '#e8d3b0',
    kraftDeep: '#c9a979',
    wood: '#d9b88a',
    woodDeep: '#b38c5c',
    ink: '#2b2420',
    inkSoft: '#6b5a4e',
    blue: '#3b86e6',
    blueDeep: '#2364c4',
    blueLight: '#a9cff7',
    pers: '#ec6a42',
    persDeep: '#c94e29',
    must: '#efbb45',
    mustDeep: '#d49d26',
    sage: '#8db897',
    sageDeep: '#679a76',
    sageFar: '#c5dcc0',
    rose: '#f2a3a8',
    lav: '#d9c9ea',
    mat: '#3f7d64',
    matDeep: '#2f6450',
    matLine: '#a9d6bf',
    sky1: '#fbd2bd',
    sky2: '#fde5cf',
    sky3: '#f9efe2',
    sun: '#ffb36b',
    sunCore: '#ffd29a',
    shade: '#6b4426',
    shadeO: 0.24,
    crease: 0.13,
    tile: '#fffaf1',
    tileFold: '#eadcc4',
    tileLine: '#2b2420',
  },
  dark: {
    dark: true,
    paper: '#2e2a3d',
    paper2: '#383148',
    kraft: '#54475f',
    kraftDeep: '#43384f',
    wood: '#5b4a52',
    woodDeep: '#463842',
    ink: '#f5ead8',
    inkSoft: '#c7b9a7',
    blue: '#62a6ff',
    blueDeep: '#3d82e2',
    blueLight: '#3b5d8f',
    pers: '#ff8f66',
    persDeep: '#e0663f',
    must: '#ffcd5e',
    mustDeep: '#e0aa3a',
    sage: '#557d6c',
    sageDeep: '#3f6155',
    sageFar: '#34474a',
    rose: '#e3878f',
    lav: '#4b3f63',
    mat: '#24493d',
    matDeep: '#1b392f',
    matLine: '#5f9c84',
    sky1: '#141127',
    sky2: '#251d3b',
    sky3: '#47304a',
    sun: '#fbe7c0',
    sunCore: '#fff4dc',
    shade: '#000000',
    shadeO: 0.5,
    crease: 0.22,
    tile: '#2e2a3d',
    tileFold: '#453d57',
    tileLine: '#f5ead8',
    lantern: '#ffb45e',
  },
};
export const pal = (dark) => (dark ? PAPER.dark : PAPER.light);

/** A drop shadow filter for one paper layer. */
export function shadowFilter(p, fid, { dy = 2.4, blur = 2, o = 1 } = {}) {
  return `<filter id="${fid}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="${p.shade}" flood-opacity="${(p.shadeO * o).toFixed(2)}"/></filter>`;
}
/** The darker half of a fold. */
export const crease = (p, d) => `<path d="${d}" fill="#000" fill-opacity="${p.crease}"/>`;

// ---------- Icon set: folded paper on a dog eared tile ----------

const ICON_GLYPHS = {
  manifest: (p) => `<g transform="rotate(-10 24 24)"><path d="M10 24 L17.5 15 H35.5 a2.5 2.5 0 0 1 2.5 2.5 V30.5 a2.5 2.5 0 0 1 -2.5 2.5 H17.5 Z" fill="${p.must}"/>${crease(p, 'M10 24 H38 V30.5 a2.5 2.5 0 0 1 -2.5 2.5 H17.5 Z')}<circle cx="17" cy="24" r="2.2" fill="${p.tile}"/><path d="M23 21 H33 M23 27 H30" stroke="${p.mustDeep}" stroke-width="2" stroke-linecap="round"/></g><path d="M14.6 23.2 C10 19 9 14 11 9" fill="none" stroke="${p.ink}" stroke-width="1.4" stroke-linecap="round"/>`,
  icons: (p) =>
    `<rect x="9" y="17" width="21" height="21" rx="5" fill="${p.blue}"/>${crease(p, 'M30 17 V33 a5 5 0 0 1 -5 5 H9 Z')}<rect x="21" y="10" width="17" height="17" rx="4" fill="${p.pers}"/>${crease(p, 'M38 10 V23 a4 4 0 0 1 -4 4 H21 Z')}<rect x="27" y="29" width="11" height="11" rx="3" fill="${p.must}"/>${crease(p, 'M38 29 V37 a3 3 0 0 1 -3 3 H27 Z')}`,
  maskable: (p) =>
    `<rect x="9" y="9" width="30" height="30" rx="8" fill="${p.must}"/>${crease(p, 'M39 9 V31 a8 8 0 0 1 -8 8 H9 Z')}<circle cx="24" cy="24" r="12" fill="none" stroke="${p.ink}" stroke-opacity=".55" stroke-width="1.3" stroke-dasharray="2.2 2.2"/><circle cx="24" cy="24" r="8.5" fill="${p.blue}"/>${crease(p, 'M24 15.5 a8.5 8.5 0 0 1 0 17 Z')}`,
  'service-worker': (p) =>
    `<path d="M24 7 L38 12.5 V23 C38 32 32 38 24 41 C16 38 10 32 10 23 V12.5 Z" fill="${p.blue}"/>${crease(p, 'M24 7 L38 12.5 V23 C38 32 32 38 24 41 Z')}<path d="M17.5 24 L22.5 29 L31 19.5" fill="none" stroke="${p.tile}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  offline: (p) =>
    `<path d="M14 26 a6.5 6.5 0 0 1 1.4 -12.8 a8.5 8.5 0 0 1 16 -1.6 a6.5 6.5 0 0 1 3.6 14.4 Z" fill="${p.blueLight}"/>${crease(p, 'M14 26 H35 a6.5 6.5 0 0 0 4 -7 H10 a6.5 6.5 0 0 0 4 7 Z')}<path d="M24 26 V30.5 M24 35.5 C24 38 26 39 25 41" fill="none" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round"/><path d="M20 31.5 L28 34.5 M20 34.5 L28 31.5" stroke="${p.pers}" stroke-width="2.2" stroke-linecap="round"/>`,
  precache: (p) =>
    `<rect x="16" y="9" width="11" height="14" rx="1.5" fill="${p.paper2}" transform="rotate(-9 21 16)"/><rect x="22" y="8" width="11" height="14" rx="1.5" fill="${p.blueLight}" transform="rotate(8 27 15)"/><path d="M12 22 L8 16 H21 L24 22 Z" fill="${p.mustDeep}"/><path d="M36 22 L40 16 H27 L24 22 Z" fill="${p.must}"/><rect x="12" y="22" width="24" height="17" rx="2" fill="${p.must}"/>${crease(p, 'M24 22 H36 V37 a2 2 0 0 1 -2 2 H24 Z')}<rect x="19" y="28" width="10" height="4.5" rx="1" fill="${p.tile}"/>`,
  install: (p) =>
    `<path d="M20 8 H28 V20 H34 L24 31 L14 20 H20 Z" fill="${p.blue}"/>${crease(p, 'M24 8 H28 V20 H34 L24 31 Z')}<path d="M9 30 H15 V34 H33 V30 H39 V37 a3 3 0 0 1 -3 3 H12 a3 3 0 0 1 -3 -3 Z" fill="${p.pers}"/>${crease(p, 'M9 36 H39 V37 a3 3 0 0 1 -3 3 H12 a3 3 0 0 1 -3 -3 Z')}`,
  'ios-share': (p) =>
    `<path d="M12 18 H19 V22 H16 V36 H32 V22 H29 V18 H36 V38 a2 2 0 0 1 -2 2 H14 a2 2 0 0 1 -2 -2 Z" fill="${p.pers}"/>${crease(p, 'M24 36 H32 V22 H29 V18 H36 V38 a2 2 0 0 1 -2 2 H24 Z')}<path d="M24 7 L31.5 14.5 H27 V29 H21 V14.5 H16.5 Z" fill="${p.blue}"/>${crease(p, 'M24 7 L31.5 14.5 H27 V29 H24 Z')}`,
  update: (p) => {
    const c = [24, 20];
    const pt = (r, a) => `${(c[0] + r * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(c[1] + r * Math.sin((a * Math.PI) / 180)).toFixed(2)}`;
    const cols = [p.blue, p.pers, p.must, p.sage];
    const blades = [0, 1, 2, 3]
      .map((k) => {
        const a = -135 + k * 90;
        return `<path d="M${pt(0, 0)} L${pt(14, a)} L${pt(9.5, a + 52)} Z" fill="${cols[k]}"/><path d="M${pt(0, 0)} L${pt(9.5, a + 52)} L${pt(5, a + 70)} Z" fill="#000" fill-opacity="${p.crease}"/>`;
      })
      .join('');
    return `<path d="M24 22 V42" stroke="${p.kraftDeep}" stroke-width="2.6" stroke-linecap="round"/>${blades}<circle cx="24" cy="20" r="2.2" fill="${p.ink}"/>`;
  },
  doctor: (p) =>
    `<rect x="10" y="10" width="21" height="29" rx="3" fill="${p.kraftDeep}"/><rect x="12.5" y="14" width="16" height="22.5" rx="1.5" fill="${p.paper}"/><rect x="16" y="8" width="9" height="5" rx="1.6" fill="${p.ink}"/><path d="M15 19 l1.6 1.6 3 -3.2 M15 26 l1.6 1.6 3 -3.2" fill="none" stroke="${p.sageDeep}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 19.5 H26 M22 26.5 H26" stroke="${p.inkSoft}" stroke-width="1.5" stroke-linecap="round"/><path d="M35 34 L40 39.5" stroke="${p.ink}" stroke-width="3.4" stroke-linecap="round"/><circle cx="31" cy="30" r="6.5" fill="${p.blueLight}" fill-opacity=".85" stroke="${p.blue}" stroke-width="2.8"/>`,
  cli: (p) =>
    `<rect x="8" y="11" width="32" height="26" rx="4" fill="${p.dark ? '#1b1726' : p.ink}"/><path d="M8 15 a4 4 0 0 1 4 -4 H36 a4 4 0 0 1 4 4 V17 H8 Z" fill="${p.blue}"/><path d="M15 23 L19.5 26.5 L15 30" fill="none" stroke="${p.must}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M22.5 30.5 H31" stroke="${p.pers}" stroke-width="2.4" stroke-linecap="round"/>`,
  'github-pages': (p) =>
    `<circle cx="24" cy="24" r="14.5" fill="${p.blue}"/><path d="M15 15 C19 14 21 18 19 21 C17 24 13 22 11.5 25 A14.5 14.5 0 0 1 15 15 Z M26 22 C30 20 35 22 37 26 C36 31 33 35 29 37 C28 32 24 30 26 22 Z" fill="${p.sage}"/>${crease(p, 'M24 9.5 a14.5 14.5 0 0 1 0 29 Z')}<path d="M24 9.5 V38.5" stroke="${p.tile}" stroke-opacity=".5" stroke-width="1"/>`,
  frameworks: (p) =>
    `<path d="M15 9 L25 27 H5 Z" fill="${p.pers}" transform="translate(4 2)"/>${crease(p, 'M19 11 L29 29 H19 Z')}<circle cx="31" cy="17" r="7.5" fill="${p.blue}"/>${crease(p, 'M31 9.5 a7.5 7.5 0 0 1 0 15 Z')}<rect x="20" y="25" width="15" height="15" rx="3" fill="${p.must}"/>${crease(p, 'M35 25 V37 a3 3 0 0 1 -3 3 H20 Z')}`,
  size: (p) =>
    `<path d="M36 8 C23 10 13 21 13 38 C27 35 36 24 36 8 Z" fill="${p.sage}"/>${crease(p, 'M36 8 C33 23 26 33 13 38 C27 35 36 24 36 8 Z')}<path d="M13 38 L33 12.5" stroke="${p.tile}" stroke-width="1.5" stroke-linecap="round"/><path d="M19 25 L23 26.5 M23 20 L27 21.5 M27 15.5 L30 16.5" stroke="${p.tile}" stroke-width="1.2" stroke-linecap="round"/><path d="M13 38 L9.5 42" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>`,
  kite: (p) =>
    `<path d="M24 6 L24 19 L13 19 Z" fill="${p.blue}"/><path d="M24 6 L35 19 L24 19 Z" fill="${p.blueDeep}"/><path d="M13 19 L24 19 L24 32 Z" fill="${p.pers}"/><path d="M24 19 L35 19 L24 32 Z" fill="${p.persDeep}"/><path d="M24 6 V32 M13 19 H35" stroke="${p.ink}" stroke-opacity=".35" stroke-width="1"/><path d="M24 32 C20 35 28 37 24 41 C22 43 23 44 22 45" fill="none" stroke="${p.ink}" stroke-width="1.3" stroke-linecap="round"/><path d="M21 35 l3 1.5 -3 1.5 Z M27 38 l-3 1.5 3 1.5 Z" fill="${p.must}"/>`,
  scissors: (p) =>
    `<path d="M14 12 L33 31 M34 12 L15 31" stroke="${p.dark ? '#9aa6b5' : '#8a96a6'}" stroke-width="3.6" stroke-linecap="round"/><path d="M14 12 L24 22 M34 12 L24 22" stroke="${p.dark ? '#d8e0ea' : '#c9d2dd'}" stroke-width="2.2" stroke-linecap="round"/><circle cx="24" cy="22" r="1.8" fill="${p.ink}"/><circle cx="14" cy="36" r="5.5" fill="none" stroke="${p.pers}" stroke-width="3.4"/><circle cx="34" cy="36" r="5.5" fill="none" stroke="${p.pers}" stroke-width="3.4"/>`,
  ruler: (p) =>
    `<g transform="rotate(-35 24 24)"><rect x="5" y="17" width="38" height="14" rx="2" fill="${p.must}"/>${crease(p, 'M5 24 H43 V29 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 Z')}<path d="M10 17 V22 M15 17 V20 M20 17 V22 M25 17 V20 M30 17 V22 M35 17 V20 M40 17 V22" stroke="${p.ink}" stroke-width="1.2"/></g>`,
};

export const ICON_NAMES = Object.keys(ICON_GLYPHS);

/** One icon (48 x 48): a folded paper glyph on a dog eared paper tile. */
export function icon(name, { dark = false, tile = true } = {}) {
  return tileIcon(ICON_GLYPHS[name], { dark, tile });
}

/** Any glyph, drawn with the paper palette, on the icon tile. */
export function tileIcon(glyph, { dark = false, tile = true } = {}) {
  const p = pal(dark);
  const f = id('isf');
  const g = id('igf');
  const tileSvg = tile
    ? `<path d="M13 3 H35 L45 13 V36 a9 9 0 0 1 -9 9 H12 a9 9 0 0 1 -9 -9 V13 a10 10 0 0 1 10 -10 Z" fill="${p.tile}" stroke="${p.tileLine}" stroke-opacity="${dark ? 0.14 : 0.1}" filter="url(#${f})"/><path d="M35 3 V10 a3 3 0 0 0 3 3 H45 Z" fill="${p.tileFold}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><defs>${shadowFilter(p, f, { dy: 1.2, blur: 1, o: 0.8 })}${shadowFilter(p, g, { dy: 1, blur: 0.7, o: 0.9 })}</defs>${tileSvg}<g filter="url(#${g})">${glyph(p)}</g></svg>
`;
}

// ---------- Scene primitives (all paper layers) ----------

const pt = (n) => Number(n.toFixed(1));

function cloudShape(x, y, s, fill, fid, o = 1) {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M6 30 a11 11 0 0 1 4 -21 a15 15 0 0 1 27 -3 a12 12 0 0 1 18 11 a9 9 0 0 1 -1 13 Z" fill="${fill}" fill-opacity="${o}" filter="url(#${fid})"/>`;
}

/** A diamond kite in four paper triangles, with a bowed tail. */
function paperKite(x, y, s, p, { rot = 0, a = p.blue, b = p.blueDeep, c = p.pers, d = p.persDeep, tail = true, fid = '' } = {}) {
  const t = tail
    ? `<path d="M0 34 C-8 44 8 52 -2 62 C-10 70 -4 78 -12 86" fill="none" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round"/><path d="M-6 44 l6 3 -6 3 Z M4 56 l-6 3 6 3 Z M-8 72 l6 3 -6 3 Z" fill="${p.must}"/>`
    : '';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" ${fid ? `filter="url(#${fid})"` : ''}>${t}<path d="M0 -34 L0 0 L-24 0 Z" fill="${a}"/><path d="M0 -34 L24 0 L0 0 Z" fill="${b}"/><path d="M-24 0 L0 0 L0 34 Z" fill="${c}"/><path d="M0 0 L24 0 L0 34 Z" fill="${d}"/><path d="M0 -34 V34 M-24 0 H24" stroke="${p.ink}" stroke-opacity=".3" stroke-width="1.2"/></g>`;
}

/** Skye, the mascot, placed with its kite center at (x, y). */
function skye(x, y, s) {
  return `<g transform="translate(${pt(x - 120 * s)} ${pt(y - 92 * s)}) scale(${s})">${kite()}</g>`;
}

function scissors(x, y, s, rot, p, { open = 18 } = {}) {
  const blade = p.dark ? '#c4cdd8' : '#b9c3cf';
  const bladeHi = p.dark ? '#e8eef5' : '#e3e9f0';
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><g transform="rotate(${-open / 2})"><path d="M0 -3 L46 -1 L46 1 L0 3 Z" fill="${blade}"/><path d="M0 -3 L46 -1 L46 0 L0 0 Z" fill="${bladeHi}"/><path d="M0 0 L-14 2" stroke="${p.pers}" stroke-width="5" stroke-linecap="round"/><ellipse cx="-24" cy="4" rx="10" ry="7" fill="none" stroke="${p.pers}" stroke-width="5"/></g><g transform="rotate(${open / 2})"><path d="M0 -3 L46 -1 L46 1 L0 3 Z" fill="${blade}"/><path d="M0 0 L-14 -2" stroke="${p.persDeep}" stroke-width="5" stroke-linecap="round"/><ellipse cx="-24" cy="-4" rx="10" ry="7" fill="none" stroke="${p.persDeep}" stroke-width="5"/></g><circle r="2.6" fill="${p.ink}"/></g>`;
}

function ruler(x, y, w, rot, p) {
  const ticks = [];
  for (let i = 6; i < w - 2; i += 6) ticks.push(`M${i} 0 V${i % 30 === 0 ? 7 : 4}`);
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="${w}" height="16" rx="2" fill="${p.must}"/><rect y="9" width="${w}" height="7" rx="2" fill="#000" fill-opacity="${p.crease * 0.8}"/><path d="${ticks.join(' ')}" stroke="${p.ink}" stroke-opacity=".7" stroke-width="1"/></g>`;
}

function pencil(x, y, len, rot, p) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="0" y="-4" width="${len}" height="8" fill="${p.blue}"/><rect x="0" y="0" width="${len}" height="4" fill="#000" fill-opacity="${p.crease}"/><rect x="-8" y="-4" width="9" height="8" rx="2" fill="${p.rose}"/><path d="M${len} -4 L${len + 12} 0 L${len} 4 Z" fill="${p.kraft}"/><path d="M${len + 8} -1.4 L${len + 12} 0 L${len + 8} 1.4 Z" fill="${p.ink}"/></g>`;
}

function spool(x, y, s, p) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-14" y="-12" width="28" height="24" rx="3" fill="${p.paper2}"/><path d="M-14 -6 H14 M-14 -1 H14 M-14 4 H14" stroke="${p.kraftDeep}" stroke-width="1.6"/><rect x="-18" y="-16" width="36" height="6" rx="3" fill="${p.woodDeep}"/><rect x="-18" y="10" width="36" height="6" rx="3" fill="${p.woodDeep}"/></g>`;
}

/** A sheet of paper with a dog ear and optional grid or lines. */
function sheet(x, y, w, h, p, { rot = 0, fid = '', grid = false, lines = 0, fill = p.paper } = {}) {
  const e = Math.min(16, w * 0.16);
  const gid = id('sg');
  let extra = '';
  if (grid) {
    const gl = [];
    for (let i = 12; i < w - 4; i += 12) gl.push(`M${i} 4 V${h - 4}`);
    for (let j = 12; j < h - 4; j += 12) gl.push(`M4 ${j} H${w - 4}`);
    extra += `<path d="${gl.join(' ')}" stroke="${p.blue}" stroke-opacity="${p.dark ? 0.22 : 0.16}" stroke-width="1"/>`;
  }
  for (let i = 0; i < lines; i++) extra += `<rect x="${w * 0.14}" y="${h * 0.24 + i * 12}" width="${w * (i % 3 === 2 ? 0.42 : 0.66)}" height="4" rx="2" fill="${p.inkSoft}" fill-opacity=".35"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot})" ${fid ? `filter="url(#${fid})"` : ''}><path id="${gid}" d="M0 3 a3 3 0 0 1 3 -3 H${w - e} L${w} ${e} V${h - 3} a3 3 0 0 1 -3 3 H3 a3 3 0 0 1 -3 -3 Z" fill="${fill}"/>${extra}<path d="M${w - e} 0 V${e - 2} a2 2 0 0 0 2 2 H${w} Z" fill="${p.tileFold}"/></g>`;
}

/** A paper phone with a home screen grid; `slot` marks the new app. */
function phoneP(x, y, s, p, { rot = 0, app = true, fid = '', screen = null } = {}) {
  const tiles = [];
  const cols = [p.sageFar, p.lav, p.blueLight, p.rose, p.kraft, p.sageFar, p.lav, p.kraft, p.rose];
  let k = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const tx = 12 + c * 24;
      const ty = 30 + r * 26;
      if (app && r === 1 && c === 1) tiles.push(`<g transform="translate(${tx} ${ty})"><rect width="18" height="18" rx="5" fill="${p.pers}"/><path d="M4 12 C4 6 14 6 14 12 Z" fill="${p.paper}"/><rect x="-3" y="-3" width="24" height="24" rx="7" fill="none" stroke="${p.must}" stroke-width="1.6" stroke-dasharray="3 2"/></g>`);
      else tiles.push(`<rect x="${tx}" y="${ty}" width="18" height="18" rx="5" fill="${cols[k++ % cols.length]}"/>`);
    }
  }
  const scr = screen || `${tiles.join('')}<rect x="14" y="118" width="64" height="16" rx="8" fill="${p.paper}" fill-opacity=".6"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" ${fid ? `filter="url(#${fid})"` : ''}><rect width="92" height="150" rx="16" fill="${p.dark ? '#171425' : p.ink}"/><rect x="5" y="5" width="82" height="140" rx="12" fill="${p.paper2}"/><rect x="34" y="10" width="24" height="6" rx="3" fill="${p.dark ? '#171425' : p.ink}"/>${scr}</g>`;
}

function grass(x, y, w, p, h = 14) {
  const d = [];
  for (let i = 0; i < w; i += 9) d.push(`M${x + i} ${y} l4 ${-h + ((i * 7) % 6)} l4 ${h - ((i * 7) % 6)} Z`);
  return `<path d="${d.join(' ')}" fill="${p.sageDeep}"/>`;
}

function stars(p, pts) {
  if (!p.dark) return '';
  return pts.map(([x, y, r]) => `<path d="M${x} ${y - r * 2.4} L${x + r * 0.7} ${y - r * 0.7} L${x + r * 2.4} ${y} L${x + r * 0.7} ${y + r * 0.7} L${x} ${y + r * 2.4} L${x - r * 0.7} ${y + r * 0.7} L${x - r * 2.4} ${y} L${x - r * 0.7} ${y - r * 0.7} Z" fill="#fff4dc" fill-opacity=".85"/>`).join('');
}

/** Dawn sun, or a dusk moon. */
function sunMoon(p, x, y, r, fid) {
  if (p.dark) return `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.sun}" filter="url(#${fid})"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.22}" fill="#000" fill-opacity=".06"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.3}" r="${r * 0.14}" fill="#000" fill-opacity=".06"/>`;
  return `<circle cx="${x}" cy="${y}" r="${r * 1.45}" fill="${p.sunCore}" fill-opacity=".55"/><circle cx="${x}" cy="${y}" r="${r}" fill="${p.sun}" filter="url(#${fid})"/>`;
}

/** Bunting in daylight, a string of lit paper lanterns at dusk. */
function garland(p, x1, x2, y, sag, fid, gid) {
  const n = Math.max(3, Math.round((x2 - x1) / 52));
  const items = [];
  const at = (t) => [x1 + (x2 - x1) * t, y + sag * 4 * t * (1 - t)];
  const cols = [p.pers, p.must, p.blue, p.sage, p.rose];
  for (let i = 1; i < n; i++) {
    const [lx, ly] = at(i / n);
    const c = cols[i % cols.length];
    if (p.dark) {
      items.push(`<circle cx="${pt(lx)}" cy="${pt(ly + 14)}" r="22" fill="url(#${gid})"/><g transform="translate(${pt(lx)} ${pt(ly)})" filter="url(#${fid})"><path d="M0 0 V4" stroke="${p.inkSoft}" stroke-width="1.2"/><rect x="-5" y="4" width="10" height="3" rx="1" fill="${p.woodDeep}"/><rect x="-8" y="7" width="16" height="15" rx="6" fill="${i % 2 ? p.lantern : p.pers}"/><path d="M-3 8 V21 M3 8 V21" stroke="#000" stroke-opacity=".15" stroke-width="1.2"/><rect x="-5" y="22" width="10" height="3" rx="1" fill="${p.woodDeep}"/></g>`);
    } else {
      items.push(`<path transform="translate(${pt(lx)} ${pt(ly)})" d="M-9 0 H9 L0 16 Z" fill="${c}" filter="url(#${fid})"/>`);
    }
  }
  const [mx, my] = at(0.5);
  return `<path d="M${x1} ${y} Q${pt(mx)} ${pt(my + sag)} ${x2} ${y}" fill="none" stroke="${p.inkSoft}" stroke-opacity=".7" stroke-width="1.2"/>${items.join('')}`;
}

/** The plate every scene sits on: a rounded sky card. */
function plate(p, w, h, body, title, { sky = true } = {}) {
  const k = id('sc');
  const defs = `<defs><linearGradient id="${k}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky1}"/><stop offset=".6" stop-color="${p.sky2}"/><stop offset="1" stop-color="${p.sky3}"/></linearGradient><radialGradient id="${k}glow"><stop offset="0" stop-color="${p.lantern || p.sun}" stop-opacity="${p.dark ? 0.55 : 0.4}"/><stop offset="1" stop-color="${p.lantern || p.sun}" stop-opacity="0"/></radialGradient>${shadowFilter(p, `${k}s`)}${shadowFilter(p, `${k}t`, { dy: 1.2, blur: 1, o: 0.8 })}${shadowFilter(p, `${k}l`, { dy: 5, blur: 5, o: 0.9 })}</defs>`;
  const ctx = { s: `${k}s`, t: `${k}t`, l: `${k}l`, glow: `${k}glow` };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${defs}${sky ? `<rect width="${w}" height="${h}" rx="22" fill="url(#${k}sky)"/>` : ''}${body(ctx)}</svg>\n`;
}

// ---------- Scenes (480 x 320) ----------

const SCENES = {
  workbench: {
    title: 'The kite workshop: a pattern sheet, scissors, a ruler and a kite being assembled on a workbench',
    draw: (p, c) => `
      ${garland(p, 20, 460, 26, 26, c.t, c.glow)}
      <rect x="300" y="64" width="128" height="96" rx="8" fill="${p.paper}" filter="url(#${c.s})"/>
      <rect x="308" y="72" width="112" height="80" rx="4" fill="${p.dark ? '#1c1830' : '#ffe3cb'}"/>
      ${p.dark ? stars(p, [[330, 92, 1.6], [395, 86, 1.2], [372, 120, 1]]) : `<circle cx="364" cy="140" r="22" fill="${p.sun}"/>`}
      <path d="M308 152 Q340 128 372 140 T420 132 V152 Z" fill="${p.sageFar}"/>
      <path d="M364 72 V152 M308 112 H420" stroke="${p.paper}" stroke-width="4"/>
      ${paperKite(96, 104, 1.25, p, { rot: -12, fid: c.s })}
      <rect x="20" y="214" width="440" height="22" rx="6" fill="${p.wood}" filter="url(#${c.s})"/>
      <rect x="20" y="228" width="440" height="8" rx="4" fill="${p.woodDeep}"/>
      <rect x="44" y="236" width="16" height="70" fill="${p.woodDeep}"/><rect x="420" y="236" width="16" height="70" fill="${p.woodDeep}"/>
      ${sheet(150, 150, 170, 74, p, { rot: -3, fid: c.s, grid: true })}
      <path d="M232 160 L262 184 L232 208 L202 184 Z" fill="none" stroke="${p.pers}" stroke-width="2" stroke-dasharray="5 4" transform="rotate(-3 235 187)"/>
      <circle cx="198" cy="166" r="8" fill="${p.ink}"/><text x="198" y="170" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10" font-weight="700" fill="${p.paper}">1</text>
      <circle cx="286" cy="200" r="8" fill="${p.ink}"/><text x="286" y="204" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10" font-weight="700" fill="${p.paper}">2</text>
      ${scissors(372, 196, 0.9, -24, p, { open: 22 })}
      ${ruler(40, 206, 120, -6, p)}
      ${pencil(330, 214, 70, -4, p)}
      ${spool(420, 196, 0.9, p)}
`,
  },
  fold: {
    title: 'A web page folds like origami into an app icon, then flies off as a kite',
    draw: (p, c) => `
      ${stars(p, [[60, 40, 1.4], [420, 54, 1.2], [250, 30, 1]])}
      ${cloudShape(330, 40, 1.1, p.paper, c.t, p.dark ? 0.22 : 0.95)}
      ${cloudShape(40, 230, 0.9, p.paper, c.t, p.dark ? 0.12 : 0.9)}
      <g filter="url(#${c.s})"><rect x="24" y="98" width="96" height="124" rx="6" fill="${p.paper}"/><rect x="24" y="98" width="96" height="16" rx="6" fill="${p.blue}"/><rect x="34" y="124" width="56" height="7" rx="3.5" fill="${p.ink}" fill-opacity=".75"/><rect x="34" y="138" width="74" height="4" rx="2" fill="${p.inkSoft}" fill-opacity=".4"/><rect x="34" y="147" width="62" height="4" rx="2" fill="${p.inkSoft}" fill-opacity=".4"/><rect x="34" y="162" width="34" height="38" rx="4" fill="${p.must}"/><rect x="74" y="162" width="34" height="38" rx="4" fill="${p.rose}"/></g>
      <path d="M24 160 H120" stroke="${p.ink}" stroke-opacity=".5" stroke-width="1.4" stroke-dasharray="5 4"/>
      <path d="M136 160 q14 -16 28 0" fill="none" stroke="${p.inkSoft}" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/><path d="M160 152 l6 8 -9 2" fill="none" stroke="${p.inkSoft}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <g filter="url(#${c.s})"><rect x="178" y="126" width="80" height="62" rx="6" fill="${p.paper}"/><path d="M178 160 H258 V182 a6 6 0 0 1 -6 6 H184 a6 6 0 0 1 -6 -6 Z" fill="${p.paper2}"/><rect x="178" y="126" width="80" height="13" rx="6" fill="${p.blue}"/><path d="M218 126 V188" stroke="${p.ink}" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="5 4"/></g>
      <path d="M268 160 q14 -16 28 0" fill="none" stroke="${p.inkSoft}" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/><path d="M292 152 l6 8 -9 2" fill="none" stroke="${p.inkSoft}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <g filter="url(#${c.s})"><rect x="308" y="134" width="46" height="46" rx="12" fill="${p.pers}"/><path d="M318 166 C318 150 344 150 344 166 Z" fill="${p.paper}"/><path d="M354 146 V168 a12 12 0 0 1 -12 12 H320 Z" fill="#000" fill-opacity="${p.crease}"/></g>
      <path d="M364 150 C384 120 396 110 404 100" fill="none" stroke="${p.inkSoft}" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round"/>
      ${paperKite(420, 82, 0.9, p, { rot: 14, a: p.pers, b: p.persDeep, c: p.must, d: p.mustDeep, fid: c.s })}
      <text x="72" y="250" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="${p.inkSoft}">page</text>
      <text x="218" y="214" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="${p.inkSoft}">fold</text>
      <text x="331" y="206" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" fill="${p.inkSoft}">app icon</text>
      <path d="M0 290 Q120 262 240 284 T480 276 V320 H0 Z" fill="${p.sageFar}"/><path d="M0 304 Q140 284 300 300 T480 296 V320 H0 Z" fill="${p.sage}"/>`,
  },
  'cut-string': {
    title: 'Scissors cut the string between the network cloud and a phone, and the app keeps flying',
    draw: (p, c) => `
      ${stars(p, [[300, 40, 1.4], [440, 120, 1.1], [200, 70, 1]])}
      ${sunMoon(p, 420, 60, 24, c.t)}
      ${cloudShape(36, 34, 1.9, p.paper, c.s, p.dark ? 0.9 : 1)}
      <path d="M84 70 a14 14 0 0 1 20 0 M78 62 a22 22 0 0 1 32 0" fill="none" stroke="${p.blue}" stroke-width="3" stroke-linecap="round" opacity=".55"/>
      <text x="94" y="96" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" fill="${p.inkSoft}">network</text>
      <path d="M110 110 C140 140 160 150 186 160" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>
      <path d="M214 172 C240 186 262 200 286 214" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>
      <path d="M186 160 c4 6 2 10 -2 14 M214 172 c-4 -2 -6 4 -2 8" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>
      <path d="M192 150 l-6 -8 M200 146 V136 M208 150 l6 -8" stroke="${p.pers}" stroke-width="2.4" stroke-linecap="round"/>
      ${scissors(200, 186, 1.05, -62, p, { open: 28 })}
      ${phoneP(300, 118, 1.05, p, { rot: 6, fid: c.s })}
      <path d="M0 288 Q120 260 240 280 T480 270 V320 H0 Z" fill="${p.sageFar}"/>${grass(10, 300, 460, p)}<rect y="298" width="480" height="22" rx="0" fill="${p.sage}"/>
      ${paperKite(400, 210, 0.55, p, { rot: -10, tail: false, fid: c.t })}`,
  },
  inspection: {
    title: 'Pre flight inspection: a magnifier over a kite and a checklist with every rule ticked',
    draw: (p, c) => `
      ${garland(p, 0, 480, 18, 22, c.t, c.glow)}
      <rect x="20" y="222" width="440" height="20" rx="6" fill="${p.wood}" filter="url(#${c.s})"/><rect x="20" y="234" width="440" height="8" rx="4" fill="${p.woodDeep}"/>
      ${paperKite(150, 176, 1.15, p, { rot: 90, tail: false, fid: c.s })}
      <path d="M190 176 C220 190 236 200 262 214" fill="none" stroke="${p.ink}" stroke-width="1.6"/>
      <g filter="url(#${c.s})"><rect x="290" y="70" width="128" height="160" rx="8" fill="${p.kraftDeep}"/><rect x="300" y="88" width="108" height="134" rx="4" fill="${p.paper}"/><rect x="334" y="62" width="40" height="18" rx="5" fill="${p.ink}"/></g>
      ${[0, 1, 2, 3, 4]
        .map((i) => `<path d="M312 ${110 + i * 22} l5 5 9 -10" fill="none" stroke="${i === 4 ? p.must : p.sageDeep}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="334" y="${108 + i * 22}" width="${[58, 44, 62, 50, 40][i]}" height="5" rx="2.5" fill="${p.inkSoft}" fill-opacity=".45"/>`)
        .join('')}
      <g filter="url(#${c.l})"><path d="M208 150 L246 192" stroke="${p.ink}" stroke-width="10" stroke-linecap="round"/><circle cx="178" cy="118" r="44" fill="${p.blueLight}" fill-opacity="${p.dark ? 0.45 : 0.5}" stroke="${p.blue}" stroke-width="9"/><path d="M152 100 a30 30 0 0 1 22 -12" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/></g>`,
  },
  takeoff: {
    title: 'Skye takes off from a paper hill, the string tied to a spool in the grass',
    draw: (p, c) => `
      ${stars(p, [[60, 50, 1.6], [150, 30, 1.1], [250, 70, 1.3], [430, 40, 1]])}
      ${sunMoon(p, 92, 92, 30, c.t)}
      ${cloudShape(260, 54, 1.2, p.paper, c.t, p.dark ? 0.2 : 0.95)}
      ${cloudShape(20, 150, 0.8, p.paper, c.t, p.dark ? 0.1 : 0.85)}
      <path d="M0 236 Q90 190 190 220 T390 200 T480 214 V320 H0 Z" fill="${p.sageFar}" filter="url(#${c.s})"/>
      <path d="M0 270 Q120 230 250 262 T480 248 V320 H0 Z" fill="${p.sage}" filter="url(#${c.s})"/>
      <path d="M0 296 Q160 276 300 294 T480 290 V320 H0 Z" fill="${p.sageDeep}" filter="url(#${c.s})"/>
      <path d="M150 258 C220 200 300 160 352 96" fill="none" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round"/>
      ${spool(150, 262, 0.9, p)}
      ${skye(372, 80, 0.62)}`,
  },
  'cutting-mat': {
    title: 'A cutting mat with a ruler edge, a craft knife and an app icon being cut out in every mask shape',
    draw: (p, c) => {
      const lines = [];
      for (let i = 40; i < 480; i += 20) lines.push(`M${i} 24 V296`);
      for (let j = 40; j < 300; j += 20) lines.push(`M24 ${j} H456`);
      return `
      <rect x="12" y="12" width="456" height="296" rx="18" fill="${p.mat}" filter="url(#${c.s})"/>
      <path d="${lines.join(' ')}" stroke="${p.matLine}" stroke-opacity=".35" stroke-width="1"/>
      <path d="M40 24 V296 M24 40 H456" stroke="${p.matLine}" stroke-opacity=".8" stroke-width="1.4"/>
      <path d="M100 40 A60 60 0 0 1 40 100" fill="none" stroke="${p.matLine}" stroke-opacity=".6" stroke-width="1.2"/>
      ${ruler(60, 262, 360, 0, p)}
      <g filter="url(#${c.s})"><rect x="180" y="72" width="128" height="128" rx="32" fill="${p.pers}"/><path d="M204 170 C204 118 284 118 284 170 Z" fill="${p.paper}"/><path d="M226 140 l6 -9 M244 136 V125 M262 140 l-6 -9" stroke="${p.pers}" stroke-width="5" stroke-linecap="round"/></g>
      <circle cx="244" cy="136" r="51" fill="none" stroke="${p.paper}" stroke-width="2" stroke-dasharray="6 5"/>
      <g filter="url(#${c.t})"><circle cx="96" cy="112" r="30" fill="${p.must}"/><rect x="72" y="166" width="54" height="54" rx="16" fill="${p.blue}"/><path d="M366 86 h52 a8 8 0 0 1 8 8 v24 a30 30 0 0 1 -30 30 h-30 Z" fill="${p.sage}"/><path d="M362 172 a26 26 0 0 1 52 0 v26 h-52 Z" fill="${p.rose}"/></g>
      <g transform="translate(330 214) rotate(-38)" filter="url(#${c.s})"><rect x="0" y="-7" width="96" height="14" rx="5" fill="${p.blue}"/><rect x="0" y="0" width="96" height="7" rx="3" fill="#000" fill-opacity="${p.crease}"/><path d="M0 -6 L-30 0 L0 6 Z" fill="${p.dark ? '#c4cdd8' : '#b9c3cf'}"/><rect x="2" y="-8" width="10" height="16" rx="2" fill="${p.ink}"/></g>`;
    },
  },
  shelf: {
    title: 'A workshop shelf of folded guide booklets, rolled patterns and a kite on the wall',
    draw: (p, c) => `
      ${garland(p, 20, 460, 22, 20, c.t, c.glow)}
      ${paperKite(392, 98, 0.95, p, { rot: 8, a: p.must, b: p.mustDeep, c: p.blue, d: p.blueDeep, fid: c.s })}
      <rect x="30" y="196" width="420" height="16" rx="4" fill="${p.wood}" filter="url(#${c.s})"/><rect x="30" y="206" width="420" height="6" rx="3" fill="${p.woodDeep}"/>
      <path d="M70 212 l-10 30 h12 Z M400 212 l10 30 h-12 Z" fill="${p.woodDeep}"/>
      ${[
        [52, 30, 120, p.pers],
        [86, 26, 104, p.blue],
        [116, 34, 128, p.must],
        [154, 24, 96, p.sage],
        [182, 30, 112, p.rose],
      ]
        .map(([x, w, h, col]) => `<g filter="url(#${c.t})"><rect x="${x}" y="${196 - h}" width="${w}" height="${h}" rx="3" fill="${col}"/><rect x="${x + w / 2}" y="${196 - h}" width="${w / 2}" height="${h}" fill="#000" fill-opacity="${p.crease}"/><rect x="${x + 5}" y="${210 - h}" width="${w - 10}" height="5" rx="2" fill="${p.paper}" fill-opacity=".8"/></g>`)
        .join('')}
      <g transform="translate(232 196) rotate(-14)" filter="url(#${c.t})"><rect x="0" y="-104" width="30" height="104" rx="3" fill="${p.lav}"/><rect x="15" y="-104" width="15" height="104" fill="#000" fill-opacity="${p.crease}"/></g>
      <g filter="url(#${c.t})"><rect x="290" y="160" width="110" height="36" rx="18" fill="${p.paper}"/><ellipse cx="400" cy="178" rx="9" ry="18" fill="${p.paper2}"/><path d="M296 170 H392" stroke="${p.blue}" stroke-opacity=".3" stroke-width="1.5"/><rect x="330" y="160" width="10" height="36" fill="${p.pers}"/></g>
      <path d="M0 268 Q120 250 240 266 T480 258 V320 H0 Z" fill="${p.paper2}"/>
      <g transform="translate(110 284)"><rect x="-16" y="-10" width="32" height="26" rx="5" fill="${p.pers}"/><path d="M0 -10 C-10 -30 -24 -34 -26 -44 C-12 -40 -4 -30 0 -10 Z M0 -10 C6 -34 18 -40 28 -42 C22 -30 10 -22 0 -10 Z" fill="${p.sage}"/></g>`,
  },
  'pattern-envelope': {
    title: 'An open pattern envelope with numbered paper parts sliding out: the docs',
    draw: (p, c) => `
      ${stars(p, [[50, 40, 1.4], [420, 34, 1.2], [460, 150, 1]])}
      ${cloudShape(340, 30, 1, p.paper, c.t, p.dark ? 0.2 : 0.9)}
      ${sheet(140, 40, 150, 190, p, { rot: -10, fid: c.s, grid: true })}
      ${sheet(200, 52, 150, 186, p, { rot: 7, fid: c.s, lines: 6 })}
      <g filter="url(#${c.l})"><path d="M90 150 H390 V284 a8 8 0 0 1 -8 8 H98 a8 8 0 0 1 -8 -8 Z" fill="${p.kraft}"/><path d="M90 150 L240 230 L390 150" fill="none" stroke="${p.kraftDeep}" stroke-width="3"/><path d="M90 150 L240 230 L390 150 V284 a8 8 0 0 1 -8 8 H98 a8 8 0 0 1 -8 -8 Z" fill="#000" fill-opacity="${p.crease * 0.5}"/></g>
      <rect x="150" y="244" width="180" height="30" rx="4" fill="${p.paper}" fill-opacity=".9"/>
      <text x="240" y="265" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="2" fill="${p.ink}">PATTERN NO. 2</text>
      ${[
        [70, 90, p.pers, '1'],
        [408, 104, p.blue, '2'],
        [56, 210, p.must, '3'],
        [426, 220, p.sage, '4'],
      ]
        .map(([x, y, col, n]) => `<g filter="url(#${c.t})"><path d="M${x - 18} ${y} L${x - 10} ${y - 12} H${x + 18} V${y + 12} H${x - 10} Z" fill="${col}"/><circle cx="${x - 10}" cy="${y}" r="2.6" fill="${p.paper}"/><text x="${x + 5}" y="${y + 5}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" fill="${p.paper}">${n}</text></g>`)
        .join('')}`,
  },
  'lost-kite': {
    title: 'Skye tangled in a paper tree after drifting off course',
    draw: (p, c) => `
      ${stars(p, [[60, 40, 1.6], [200, 30, 1.2], [440, 60, 1.4], [330, 24, 1]])}
      ${sunMoon(p, 400, 70, 26, c.t)}
      ${cloudShape(40, 40, 1.1, p.paper, c.t, p.dark ? 0.2 : 0.95)}
      <path d="M0 260 Q140 230 260 252 T480 242 V320 H0 Z" fill="${p.sageFar}"/>
      <g filter="url(#${c.s})"><path d="M224 300 C226 250 220 220 210 190 L232 190 C238 220 244 250 246 300 Z" fill="${p.woodDeep}"/><path d="M226 222 C200 210 186 196 178 180 M238 214 C262 200 280 186 288 170" stroke="${p.woodDeep}" stroke-width="9" stroke-linecap="round" fill="none"/></g>
      <g filter="url(#${c.s})"><circle cx="170" cy="150" r="54" fill="${p.sageDeep}"/><circle cx="288" cy="138" r="60" fill="${p.sageDeep}"/><circle cx="228" cy="104" r="66" fill="${p.sage}"/><circle cx="196" cy="128" r="30" fill="${p.sage}"/></g>
      <path d="M250 168 C280 190 260 210 300 214 C330 216 320 250 350 262 C370 270 380 290 400 300" fill="none" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M262 176 c-12 -10 6 -22 12 -8 c4 10 -14 14 -12 2" fill="none" stroke="${p.ink}" stroke-width="1.4"/>
      ${skye(258, 124, 0.42)}
      <g transform="translate(372 224) rotate(8)" filter="url(#${c.t})"><path d="M-30 0 L-20 -14 H34 V14 H-20 Z" fill="${p.must}"/><circle cx="-20" cy="0" r="3" fill="${p.paper}"/><text x="8" y="6" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="800" fill="#2b2420">404</text></g>
      ${grass(0, 300, 480, p)}<rect y="298" width="480" height="22" fill="${p.sage}"/>`,
  },
  'paper-plane': {
    title: 'A paper plane delivers a new version tag through the clouds: the update toast',
    draw: (p, c) => `
      ${stars(p, [[60, 40, 1.4], [300, 30, 1.2], [440, 90, 1]])}
      ${cloudShape(40, 60, 1.3, p.paper, c.t, p.dark ? 0.22 : 0.95)}
      ${cloudShape(300, 196, 1.6, p.paper, c.t, p.dark ? 0.12 : 0.9)}
      <path d="M30 250 C120 250 150 170 230 160 S330 150 350 110" fill="none" stroke="${p.inkSoft}" stroke-width="2.2" stroke-dasharray="4 7" stroke-linecap="round"/>
      <g transform="translate(372 96) rotate(-18)" filter="url(#${c.s})"><path d="M-60 0 L40 -26 L-30 14 Z" fill="${p.paper}"/><path d="M-30 14 L40 -26 L-16 30 Z" fill="${p.paper2}"/><path d="M-30 14 L-22 34 L-16 30 Z" fill="${p.kraft}"/></g>
      <path d="M326 112 C318 140 300 150 292 170" fill="none" stroke="${p.ink}" stroke-width="1.4"/>
      <g transform="translate(284 188) rotate(-8)" filter="url(#${c.t})"><path d="M-34 0 L-24 -16 H40 V16 H-24 Z" fill="${p.blue}"/><circle cx="-24" cy="0" r="3.2" fill="${p.paper}"/><text x="8" y="6" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" fill="#ffffff">v2</text></g>
      <g transform="translate(62 186)" filter="url(#${c.s})"><rect width="150" height="44" rx="22" fill="${p.dark ? '#171425' : p.ink}"/><text x="20" y="27" font-family="Segoe UI, Arial, sans-serif" font-size="12.5" font-weight="600" fill="#fff4e6">New version</text><rect x="96" y="9" width="46" height="26" rx="13" fill="${p.must}"/><path d="M111 22 a7 7 0 1 0 2 -5 M113 13 v4 h4" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/></g>`,
  },
  meadow: {
    title: 'A paper phone stands in a meadow while a new app icon lands on its home screen',
    draw: (p, c) => `
      ${stars(p, [[50, 50, 1.6], [180, 34, 1.1], [420, 40, 1.3]])}
      ${sunMoon(p, 80, 78, 26, c.t)}
      ${cloudShape(330, 44, 1.1, p.paper, c.t, p.dark ? 0.2 : 0.95)}
      <path d="M0 240 Q120 200 240 230 T480 220 V320 H0 Z" fill="${p.sageFar}" filter="url(#${c.s})"/>
      ${phoneP(196, 96, 1.2, p, { app: true, fid: c.l })}
      <path d="M120 80 C160 70 210 96 236 132" fill="none" stroke="${p.inkSoft}" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>
      ${[
        [70, 270, p.pers],
        [130, 286, p.must],
        [360, 276, p.rose],
        [420, 290, p.blue],
        [330, 296, p.must],
      ]
        .map(([x, y, col]) => `<path d="M${x} ${y} V${y + 30}" stroke="${p.sageDeep}" stroke-width="3"/><g transform="translate(${x} ${y})" filter="url(#${c.t})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="6" ry="10" transform="rotate(${a}) translate(0 -9)" fill="${col}"/>`).join('')}<circle r="4.5" fill="${p.paper}"/></g>`)
        .join('')}
      <path d="M0 290 Q120 270 240 286 T480 282 V320 H0 Z" fill="${p.sage}" filter="url(#${c.s})"/>
      ${grass(0, 306, 480, p, 12)}`,
  },
};

export const SCENE_NAMES = Object.keys(SCENES);

/** One workshop scene (480 x 320) for light (dawn) or dark (dusk). */
export function scene(name, { dark = false } = {}) {
  const s = SCENES[name];
  const p = pal(dark);
  return plate(p, 480, 320, (c) => s.draw(p, c), s.title);
}

export const SCENE_TITLES = Object.fromEntries(Object.entries(SCENES).map(([k, v]) => [k, v.title]));

// ---------- The README banner (1280 x 400) ----------

export function banner({ dark = false } = {}) {
  const p = pal(dark);
  const tags = ['manifest', 'icons', 'service worker', 'offline page', 'install button'];
  return plate(
    p,
    1280,
    400,
    (c) => {
      let x = 700;
      const tagSvg = tags
        .map((t, i) => {
          const w = Math.round(t.length * 9.4 + 40);
          if (i === 3) x = 740;
          const cx = x;
          x += w + 14;
          const y = i < 3 ? 262 + (i % 2) * 6 : 318 + (i % 2) * 6;
          const col = [p.must, p.blue, p.pers, p.sage, p.rose][i];
          return `<g transform="translate(${cx} ${y}) rotate(${i % 2 ? 3 : -3})" filter="url(#${c.t})"><path d="M0 0 L12 -16 H${w} V16 H12 Z" fill="${col}"/><circle cx="12" cy="0" r="3.2" fill="${p.paper}"/><text x="${(w + 18) / 2}" y="6" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="${i === 1 ? '#ffffff' : '#2b2420'}">${t}</text></g>`;
        })
        .join('');
      return `
    ${stars(p, [[90, 50, 2], [260, 30, 1.4], [520, 60, 1.6], [880, 40, 1.4], [1180, 70, 1.8], [1010, 120, 1.2]])}
    ${sunMoon(p, 1150, 110, 46, c.t)}
    ${cloudShape(560, 30, 1.6, p.paper, c.t, dark ? 0.12 : 0.9)}
    ${cloudShape(960, 160, 1.2, p.paper, c.t, dark ? 0.1 : 0.85)}
    ${garland(p, 0, 1280, 8, 30, c.t, c.glow)}
    <path d="M0 300 Q200 250 420 290 T860 280 T1280 270 V400 H0 Z" fill="${p.sageFar}" filter="url(#${c.s})"/>
    <path d="M0 350 Q260 320 520 346 T1280 330 V400 H0 Z" fill="${p.sage}" filter="url(#${c.s})"/>
    <path d="M60 380 C120 300 170 250 200 190" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>
    ${skye(196, 150, 0.95)}
    <text x="352" y="170" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="80" font-weight="800" letter-spacing="-2" fill="${p.ink}">install<tspan fill="${p.pers}">kite</tspan></text>
    <text x="356" y="220" font-family="Segoe UI, Inter, Arial, sans-serif" font-size="27" font-weight="500" fill="${p.inkSoft}">Make any website installable and offline capable.</text>
    <g transform="translate(356 252)" filter="url(#${c.s})"><path d="M0 4 a4 4 0 0 1 4 -4 H336 a4 4 0 0 1 4 4 V14 a10 10 0 0 0 0 20 V44 a4 4 0 0 1 -4 4 H4 a4 4 0 0 1 -4 -4 V34 a10 10 0 0 0 0 -20 Z" fill="${p.paper}"/><path d="M300 6 V42" stroke="${p.inkSoft}" stroke-opacity=".5" stroke-width="1.6" stroke-dasharray="4 4"/><text x="24" y="31" font-family="Cascadia Code, Consolas, monospace" font-size="20" fill="${p.pers}">$</text><text x="44" y="31" font-family="Cascadia Code, Consolas, monospace" font-size="20" fill="${p.ink}">npx installkite init</text><circle cx="320" cy="24" r="5" fill="${p.pers}"/></g>
    ${tagSvg}
    ${phoneP(1150, 196, 0.95, p, { rot: 8, fid: c.l })}`;
    },
    'installkite: make any website installable and offline capable with one line',
  );
}
