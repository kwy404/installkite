// Seasonal art for the special dates: Skye in costume, four paper icons and
// one hero vignette per season, each in a light (dawn) and a dark (dusk)
// variant. Drawn here as SVG and written to assets/seasons/<id>/ by
// scripts/build-art.mjs. The costume layers sit on the regular mascot from
// scripts/art.mjs: "behind" and "ears" go under the kite, "wear" and
// "props" over it. The small head (top bar, flying Skye) keeps ears and wear.
import { crease, mascot, mascotHead, pal, shadowFilter, tileIcon } from './art.mjs';

export const SEASON_IDS = ['newyear', 'carnival', 'easter', 'valentine', 'junina', 'halloween', 'christmas'];

let uid = 0;
const nid = (name) => `s${name}${++uid}`;

/** Costume colors, light and dark. Dark ones are a step brighter and get a soft rim. */
function colors(dark) {
  const rim = dark ? 'stroke="#eaf4ff" stroke-opacity=".5" stroke-width="1.4"' : '';
  return dark
    ? {
        dark, rim,
        hat: '#6a55a0', orange: '#ff9a45', orangeDeep: '#e07a26', stem: '#7fb05a', face: '#ffd36b', gold: '#ffcd5e', bat: '#9a87c9', batEye: '#ffd36b',
        red: '#ef6670', redDeep: '#d14a56', cream: '#fff3ea', snow: '#f4f8ff', snowLine: '#cfe3ff', flake: '#dbe9ff',
        pink: '#ff7fb3', purple: '#9d83ff', teal: '#4fd1c0',
        ear: '#f4ecff', earIn: '#f6a6b8', basket: '#b48d5c', basketDeep: '#8d6a40', egg1: '#8fc2ff', egg2: '#f6a6b8', egg3: '#b6dc8f', egg4: '#ffd970',
        heart: '#ff6b80', heartDeep: '#e04a62', string: '#cfe3ff',
        straw: '#e3c06a', strawDeep: '#b8963e', patch: '#6aa9ff', log: '#a06a40', logDeep: '#7d5030', flame: '#ff8a3d', flame2: '#ffc94a', flame3: '#fff1b0',
        blue: '#4aa3ff', yellow: '#ffcd5e', pom: '#ff8f66', rose: '#f2a3a8', sky: '#8fd0ff', star: '#fff4dc', green: '#5fa37a', greenDeep: '#3f7d5c',
      }
    : {
        dark, rim,
        hat: '#4a3a6e', orange: '#f28c28', orangeDeep: '#d26a14', stem: '#5c8a3a', face: '#5a2c0c', gold: '#e9b23a', bat: '#3b2f52', batEye: '#ffd36b',
        red: '#d9434b', redDeep: '#b3313a', cream: '#fff6ee', snow: '#ffffff', snowLine: '#a9cff7', flake: '#7fb7f0',
        pink: '#e85d9a', purple: '#7b5cd6', teal: '#2fb3a3',
        ear: '#fffaf4', earIn: '#f6a6b8', basket: '#c9a06a', basketDeep: '#a07a48', egg1: '#a9cff7', egg2: '#f2a3a8', egg3: '#c5e3a8', egg4: '#f5d77a',
        heart: '#e8485f', heartDeep: '#c22f47', string: '#3b5579',
        straw: '#e8c46a', strawDeep: '#c9a24a', patch: '#3b86e6', log: '#8a5a34', logDeep: '#6b4426', flame: '#f2702a', flame2: '#ffb534', flame3: '#fff1b0',
        blue: '#2b8ff0', yellow: '#efbb45', pom: '#ec6a42', rose: '#e8798a', sky: '#5aaef5', star: '#efbb45', green: '#4f8a62', greenDeep: '#3a6b4b',
      };
}

// ---------- Shared shapes ----------

const heartPath = 'M0 8 C-12 0 -12 -10 -6 -12 C-2 -13 0 -10 0 -8 C0 -10 2 -13 6 -12 C12 -10 12 0 0 8Z';
const heart = (x, y, s, fill, rot = 0, extra = '') => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="${heartPath}" fill="${fill}" ${extra}/>`;

function bat(x, y, s, c) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 2 C-3 -3 -9 -6 -17 -5 C-13 -2 -14 2 -16 5 C-11 3 -7 4 -5 7 C-3 4 -1.5 3.5 0 4 C1.5 3.5 3 4 5 7 C7 4 11 3 16 5 C14 2 13 -2 17 -5 C9 -6 3 -3 0 2Z" fill="${c.bat}" ${c.rim}/><path d="M-2.6 0 L-1.8 -4 L-0.6 -0.8 Z M2.6 0 L1.8 -4 L0.6 -0.8 Z" fill="${c.bat}"/><circle cx="-1.1" cy="1.2" r=".75" fill="${c.batEye}"/><circle cx="1.1" cy="1.2" r=".75" fill="${c.batEye}"/></g>`;
}

function pumpkin(x, y, s, c) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-1 -16 C-1 -23 3 -27 9 -28" fill="none" stroke="${c.stem}" stroke-width="4" stroke-linecap="round"/><ellipse cx="-9" cy="0" rx="14" ry="17" fill="${c.orangeDeep}"/><ellipse cx="9" cy="0" rx="14" ry="17" fill="${c.orangeDeep}"/><ellipse cx="0" cy="0" rx="13" ry="18" fill="${c.orange}"/><path d="M-15 -3 l5 -6 l5 6z M5 -3 l5 -6 l5 6z" fill="${c.face}"/><path d="M-12 5 Q0 15 12 5 Q9 12 5 10 L3 13 L0 10 L-3 13 L-5 10 Q-9 12 -12 5Z" fill="${c.face}"/></g>`;
}

function flake(x, y, r, c, w = 2) {
  const a = (r * 0.87).toFixed(1);
  const h = (r / 2).toFixed(1);
  const b = (r * 0.3).toFixed(1);
  const t = (r * 0.75).toFixed(1);
  const m = (r * 0.5).toFixed(1);
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${c.flake}" stroke-width="${w}" stroke-linecap="round"><path d="M0 ${-r} V${r} M${-a} ${-h} L${a} ${h} M${-a} ${h} L${a} ${-h}"/><path d="M${-b} ${-t} L0 ${-m} L${b} ${-t} M${-b} ${t} L0 ${m} L${b} ${t}"/></g>`;
}

function burst(x, y, r, col, dot) {
  let rays = '';
  let dots = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + 0.2;
    const x1 = (x + Math.cos(a) * r * 0.38).toFixed(1);
    const y1 = (y + Math.sin(a) * r * 0.38).toFixed(1);
    const x2 = (x + Math.cos(a) * r * 0.82).toFixed(1);
    const y2 = (y + Math.sin(a) * r * 0.82).toFixed(1);
    rays += `M${x1} ${y1} L${x2} ${y2} `;
    dots += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${(r / 12).toFixed(1)}" fill="${dot}"/>`;
  }
  return `<path d="${rays}" stroke="${col}" stroke-width="${(r / 9).toFixed(1)}" stroke-linecap="round"/>${dots}<circle cx="${x}" cy="${y}" r="${(r / 7).toFixed(1)}" fill="${dot}"/>`;
}

const sparkle = (x, y, r, fill) => `<path transform="translate(${x} ${y})" d="M0 ${-r} C${r * 0.15} ${-r * 0.15} ${r * 0.15} ${-r * 0.15} ${r} 0 C${r * 0.15} ${r * 0.15} ${r * 0.15} ${r * 0.15} 0 ${r} C${-r * 0.15} ${r * 0.15} ${-r * 0.15} ${r * 0.15} ${-r} 0 C${-r * 0.15} ${-r * 0.15} ${-r * 0.15} ${-r * 0.15} 0 ${-r}Z" fill="${fill}"/>`;

function egg(x, y, rx, ry, rot, fill, deco, c) {
  const d =
    deco === 'zig'
      ? `<path d="M${x - rx * 0.8} ${y} l${rx * 0.27} ${-rx * 0.3} l${rx * 0.27} ${rx * 0.3} l${rx * 0.27} ${-rx * 0.3} l${rx * 0.27} ${rx * 0.3} l${rx * 0.27} ${-rx * 0.3} l${rx * 0.25} ${rx * 0.3}" fill="none" stroke="${c.cream}" stroke-width="1.6" stroke-linejoin="round"/>`
      : deco === 'dots'
        ? `<circle cx="${x - rx * 0.35}" cy="${y - ry * 0.25}" r="${rx * 0.16}" fill="${c.cream}"/><circle cx="${x + rx * 0.35}" cy="${y - ry * 0.05}" r="${rx * 0.16}" fill="${c.cream}"/><circle cx="${x - rx * 0.1}" cy="${y + ry * 0.35}" r="${rx * 0.16}" fill="${c.cream}"/>`
        : `<path d="M${x - rx * 0.92} ${y + ry * 0.1} Q${x} ${y + ry * 0.35} ${x + rx * 0.92} ${y + ry * 0.1}" fill="none" stroke="${c.cream}" stroke-width="2"/>`;
  return `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>${d}<ellipse cx="${x - rx * 0.4}" cy="${y - ry * 0.45}" rx="${rx * 0.22}" ry="${ry * 0.16}" fill="#fff" fill-opacity=".45"/></g>`;
}

function basket(x, y, s, c) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-21 -9 C-21 -36 21 -36 21 -9" fill="none" stroke="${c.basketDeep}" stroke-width="3.5"/>${egg(-10, -12, 7, 9, -14, c.egg1, 'dots', c)}${egg(1, -15, 7, 9.5, 0, c.egg2, 'zig', c)}${egg(11, -11, 6.5, 8.5, 16, c.egg3, 'band', c)}<path d="M-24 -8 H24 L19 14 a4 4 0 0 1 -4 3 H-15 a4 4 0 0 1 -4 -3Z" fill="${c.basket}"/><path d="M-22 0 H22 M-20 8 H20" stroke="${c.basketDeep}" stroke-width="1.6"/><path d="M-12 -8 L-10 17 M0 -8 V17 M12 -8 L10 17" stroke="${c.basketDeep}" stroke-opacity=".6" stroke-width="1.4"/><rect x="-25" y="-11" width="50" height="5" rx="2.5" fill="${c.basketDeep}"/></g>`;
}

function bonfire(x, y, s, c) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="9" rx="28" ry="6" fill="${c.flame2}" fill-opacity="${c.dark ? 0.35 : 0.25}"/><rect x="-22" y="1" width="44" height="7" rx="3.5" fill="${c.log}" transform="rotate(-16)"/><rect x="-22" y="1" width="44" height="7" rx="3.5" fill="${c.logDeep}" transform="rotate(16)"/><path d="M0 4 C-14 1 -13 -15 -5 -23 C-5 -15 1 -15 -1 -30 C10 -22 15 -9 10 0 C8 4 4 5 0 4Z" fill="${c.flame}"/><path d="M0 3 C-8 1 -8 -9 -3 -14 C-2 -9 2 -10 1 -19 C7 -13 9 -5 6 0 C4 3 2 3.5 0 3Z" fill="${c.flame2}"/><path d="M0 2.5 C-3 1.5 -3.5 -3 -1 -6 C0 -3 2 -4 2 -8 C4 -5 4.5 -1 3 1 C2 2.4 1 2.6 0 2.5Z" fill="${c.flame3}"/><circle cx="-8" cy="-34" r="1.4" fill="${c.flame2}"/><circle cx="7" cy="-40" r="1.1" fill="${c.flame}"/><circle cx="2" cy="-46" r=".9" fill="${c.flame2}"/></g>`;
}

function flags(x1, y1, x2, y2, sag, n, cols, c) {
  let out = `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}" fill="none" stroke="${c.string}" stroke-width="1.2"/>`;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag * 2) + t * t * y2;
    out += `<path d="M${(x - 6).toFixed(1)} ${y.toFixed(1)} H${(x + 6).toFixed(1)} V${(y + 13).toFixed(1)} L${x.toFixed(1)} ${(y + 9).toFixed(1)} L${(x - 6).toFixed(1)} ${(y + 13).toFixed(1)} Z" fill="${cols[i % cols.length]}"/>`;
  }
  return out;
}

const confettiBits = (pts, c) =>
  pts
    .map(([x, y, r, k], i) => {
      const col = [c.pink, c.yellow, c.teal, c.blue, c.purple][k % 5];
      return i % 3 === 2 ? `<circle cx="${x}" cy="${y}" r="2.6" fill="${col}"/>` : `<rect x="${x - 4}" y="${y - 2}" width="8" height="4" rx="1" fill="${col}" transform="rotate(${r} ${x} ${y})"/>`;
    })
    .join('');

/** Skye's eyes, redrawn over a mask. */
const EYES = '<ellipse cx="102" cy="92" rx="7.5" ry="9.5" fill="#12233f"/><ellipse cx="138" cy="92" rx="7.5" ry="9.5" fill="#12233f"/><circle cx="104.5" cy="88" r="3" fill="#fff"/><circle cx="140.5" cy="88" r="3" fill="#fff"/>';

// ---------- The seasons ----------

export const SEASONS = {
  newyear: {
    name: 'New Year',
    title: 'Skye in a striped party hat, with paper fireworks',
    behind: (c) => `${burst(42, 46, 24, c.gold, c.yellow)}${burst(204, 50, 19, c.rose, c.pink)}${burst(212, 150, 12, c.sky, c.blue)}`,
    wear: (c) => `<g transform="rotate(14 122 40)"><path d="M104 44 L124 4 L142 44 Q123 50 104 44Z" fill="${c.blue}" ${c.rim}/><path d="M110 34 H137 M115 24 H132 M120 14 H127.5" stroke="${c.yellow}" stroke-width="3.6"/><path d="M104 44 Q123 50 142 44" fill="none" stroke="${c.pom}" stroke-width="3" stroke-linecap="round"/><circle cx="124" cy="5" r="5" fill="${c.pom}"/></g>`,
    props: (c) => `${sparkle(30, 128, 5, c.star)}${sparkle(214, 100, 4, c.star)}${sparkle(190, 20, 3.5, c.star)}`,
  },
  carnival: {
    name: 'Carnival',
    title: 'Skye in a feathered carnival mask, with confetti',
    behind: (c) => `<path d="M16 30 c10 6 4 14 14 18 s4 14 14 16" fill="none" stroke="${c.pink}" stroke-width="3" stroke-linecap="round"/><path d="M226 30 c-9 7 -2 15 -12 20 s-3 14 -13 17" fill="none" stroke="${c.teal}" stroke-width="3" stroke-linecap="round"/>`,
    wear: (c) => {
      const g = nid('mask');
      return `<defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.pink}"/><stop offset="1" stop-color="${c.purple}"/></linearGradient></defs><path d="M157 84 C167 70 169 52 163 34 C176 47 178 70 159 88Z" fill="${c.teal}"/><path d="M158 86 C162 70 164 54 163 37" fill="none" stroke="${c.gold}" stroke-width="1.6"/><path d="M160 86 C172 78 182 66 184 52 C190 64 184 80 162 89Z" fill="${c.pink}"/><path d="M82 86 Q90 76 102 80 Q112 84 120 86 Q128 84 138 80 Q150 76 158 86 Q158 100 146 104 Q134 108 124 98 Q120 95 116 98 Q106 108 94 104 Q82 100 82 86Z" fill="url(#${g})" stroke="${c.gold}" stroke-width="2.2"/>${EYES}<circle cx="88" cy="84" r="1.6" fill="${c.gold}"/><circle cx="152" cy="84" r="1.6" fill="${c.gold}"/><circle cx="120" cy="90" r="1.8" fill="${c.gold}"/>`;
    },
    props: (c) => confettiBits([[34, 52, 20, 0], [52, 150, -30, 1], [26, 180, 0, 2], [200, 30, 40, 3], [214, 118, -15, 4], [196, 196, 25, 0], [44, 214, 60, 1], [182, 148, 10, 2], [30, 98, -40, 3], [216, 74, 0, 4], [66, 26, 15, 1], [176, 12, 0, 2]], c),
  },
  easter: {
    name: 'Easter',
    title: 'Skye with bunny ears and a basket of painted eggs',
    ears: (c) => `<g transform="rotate(-10 108 40)"><path d="M100 48 C93 30 93 10 102 2 C111 9 113 28 111 48Z" fill="${c.ear}" ${c.rim}/><path d="M102.5 42 C98.5 30 98.5 16 102.5 9 C106.5 16 107.5 30 106.5 42Z" fill="${c.earIn}"/></g><g transform="rotate(10 132 40)"><path d="M129 48 C127 28 129 9 138 2 C147 10 147 30 140 48Z" fill="${c.ear}" ${c.rim}/><path d="M133.5 42 C132.5 30 133.5 16 137.5 9 C141.5 16 141.5 30 137.5 42Z" fill="${c.earIn}"/></g>`,
    wear: () => '',
    props: (c) => `${basket(50, 196, 1, c)}${egg(196, 196, 9, 12, 12, c.egg4, 'zig', c)}`,
  },
  valentine: {
    name: "Valentine's",
    title: 'Skye holding a heart balloon on a string',
    behind: (c) => `<path d="M42 51 C40 64 50 76 60 90" fill="none" stroke="${c.string}" stroke-width="1.6" stroke-linecap="round"/>`,
    wear: (c) => `${heart(90, 60, 0.75, c.heart, -24)}`,
    props: (c) => `${heart(42, 36, 1.75, c.heart, -8, c.rim)}<path d="M30 26 C32 22 36 21 39 22" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/><path d="M40 51 l2 3 l2 -3 Z" fill="${c.heartDeep}"/>${heart(204, 46, 0.7, c.rose, 12)}${heart(218, 84, 0.5, c.heart, -10)}${heart(194, 22, 0.42, c.rose, 0)}`,
  },
  junina: {
    name: 'Festa Junina',
    title: 'Skye in a straw hat, next to a small bonfire',
    wear: (c) => `<g transform="rotate(-6 120 44)"><ellipse cx="120" cy="46" rx="50" ry="10" fill="${c.straw}" ${c.rim}/><path d="M74 47 C98 55 142 55 166 47" fill="none" stroke="${c.strawDeep}" stroke-width="1.4" stroke-dasharray="3 3"/><path d="M71 44 l-4 -2 M70 48 l-5 1 M169 44 l4 -2 M170 48 l5 1" stroke="${c.strawDeep}" stroke-width="1.4" stroke-linecap="round"/><path d="M96 45 C96 26 104 16 120 16 C136 16 144 26 144 45 C136 49 104 49 96 45Z" fill="${c.straw}"/><path d="M98 34 C110 37 130 37 142 34 M101 26 C112 29 128 29 139 26" fill="none" stroke="${c.strawDeep}" stroke-width="1.3"/><path d="M96.4 39 C108 43 132 43 143.6 39 L144 45 C136 49 104 49 96 45Z" fill="${c.red}"/><g transform="rotate(12 128 25)"><rect x="123.5" y="20.5" width="9" height="8" rx="1" fill="${c.patch}"/><rect x="124.5" y="21.5" width="7" height="6" rx=".5" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".8" stroke-dasharray="1.4 1.2"/></g></g>`,
    props: (c) => bonfire(46, 196, 1, c),
  },
  halloween: {
    name: 'Halloween',
    title: 'Skye in a witch hat, with a carved pumpkin and paper bats',
    wear: (c) => `<g transform="rotate(-12 120 42)"><path d="M80 46 C96 36 144 36 160 46 C146 54 94 54 80 46Z" fill="${c.hat}" ${c.rim}/><path d="M97 43 C103 30 110 18 116 9 C120 3 127 1 134 4 C128 7 127 12 129 17 C133 26 138 35 143 43 C128 48 112 48 97 43Z" fill="${c.hat}" ${c.rim}/><path d="M99.5 37.5 C112 41.5 128 41.5 140.5 37.5 L143 43 C128 48 112 48 97 43Z" fill="${c.orange}"/><rect x="115" y="38.5" width="10" height="7" rx="1.5" fill="none" stroke="${c.gold}" stroke-width="2"/></g>`,
    props: (c) => `${pumpkin(46, 196, 1, c)}${bat(200, 40, 1.3, c)}${bat(222, 74, 0.85, c)}${bat(30, 36, 0.8, c)}`,
  },
  christmas: {
    name: 'Christmas',
    title: 'Skye with a snow cap and a striped scarf, in falling snow',
    wear: (c) =>
      `<path d="M100 47 C102 36 110 28 120 25 C130 28 138 36 140 47 C135 43 131 46 127 44 C123 40 118 44 114 42 C109 41 105 45 100 47Z" fill="${c.snow}" stroke="${c.snowLine}" stroke-width="1.2"/>` +
      `<path d="M104 128 C98 140 94 152 92 166 L104 168 C105 154 108 142 114 132Z" fill="${c.redDeep}"/><path d="M95 150 L108 152" stroke="${c.cream}" stroke-width="3"/><path d="M93 168 v6 M97 168.4 v6 M101 168.8 v6" stroke="${c.redDeep}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M80 116 C100 124 140 124 160 116 L154 132 C136 139 104 139 86 132 Z" fill="${c.red}"/><path d="M83 124 C102 131 138 131 157 124" fill="none" stroke="${c.cream}" stroke-width="12" stroke-dasharray="3.5 8"/><path d="M80 116 C100 124 140 124 160 116" fill="none" stroke="${c.redDeep}" stroke-width="1.5"/>`,
    props: (c) => `${flake(34, 44, 9, c)}${flake(206, 54, 7, c)}${flake(214, 138, 6, c, 1.6)}${flake(30, 172, 7, c)}${flake(190, 196, 5, c, 1.5)}`,
  },
};

/** Skye in costume (240 x 240). */
export function seasonMascot(id, { dark = false } = {}) {
  const s = SEASONS[id];
  const c = colors(dark);
  const base = mascot({ rim: dark, title: `Skye, the installkite kite: ${s.title.replace(/^Skye /, '')}` });
  const under = `${s.behind ? s.behind(c) : ''}${s.ears ? s.ears(c) : ''}`;
  return base.replace('</title>', `</title>\n  ${under}`).replace('</svg>', `  ${s.wear(c)}${s.props ? s.props(c) : ''}\n</svg>`);
}

/** The small head, for the top bar and the flying kite: ears and wear only. */
export function seasonHead(id) {
  const s = SEASONS[id];
  const c = colors(false);
  return mascotHead()
    .replace('viewBox="44 16 152 152"', 'viewBox="34 -4 172 172"')
    .replace('</title>', `</title>\n  ${s.ears ? s.ears(c) : ''}`)
    .replace('</svg>', `  ${s.wear(c)}\n</svg>`);
}

// ---------- Icons: four per season, on the paper tile ----------

const ICONS = {
  newyear: {
    fireworks: (p, c) => `${burst(24, 22, 14, c.gold, c.pom)}`,
    clock: (p, c) => `<circle cx="24" cy="25" r="14" fill="${c.blue}"/>${crease(p, 'M24 11 a14 14 0 0 1 0 28 Z')}<circle cx="24" cy="25" r="10.5" fill="${p.tile}"/><path d="M24 25 V17 M24 25 L27.5 22" stroke="${p.ink}" stroke-width="2.2" stroke-linecap="round"/><path d="M24 15.6 v1.6 M33.4 25 h-1.6 M24 34.4 v-1.6 M14.6 25 h1.6" stroke="${p.ink}" stroke-width="1.4"/><path d="M16 9 l4 3 M32 9 l-4 3" stroke="${c.pom}" stroke-width="2.6" stroke-linecap="round"/>`,
    'party-hat': (p, c) => `<path d="M13 39 L24 8 L35 39 Q24 43 13 39Z" fill="${c.blue}"/>${crease(p, 'M24 8 L35 39 Q30 41 24 41 Z')}<path d="M18 28 H30.4 M21 19 H27.5" stroke="${c.yellow}" stroke-width="3"/><circle cx="24" cy="8" r="3.6" fill="${c.pom}"/>`,
    sparkler: (p, c) => `<path d="M14 40 L27 21" stroke="${p.kraftDeep}" stroke-width="2.6" stroke-linecap="round"/>${sparkle(29, 18, 10, c.yellow)}${sparkle(38, 10, 3.4, c.pom)}${sparkle(38, 28, 2.6, c.pom)}${sparkle(19, 10, 2.8, c.pom)}`,
  },
  carnival: {
    mask: (p, c) => `<path d="M7 20 Q12 13 19 15.5 Q23 17 24 18 Q25 17 29 15.5 Q36 13 41 20 Q41 30 34 32 Q28 33 25.5 28 Q24 26.5 22.5 28 Q20 33 14 32 Q7 30 7 20Z" fill="${c.pink}"/>${crease(p, 'M24 18 Q25 17 29 15.5 Q36 13 41 20 Q41 30 34 32 Q28 33 25.5 28 Q24 26.5 24 27 Z')}<ellipse cx="16" cy="22.5" rx="3.6" ry="2.6" fill="${p.ink}"/><ellipse cx="32" cy="22.5" rx="3.6" ry="2.6" fill="${p.ink}"/><path d="M38 16 C41 10 40 5 37 2 C43 6 45 12 40 18Z" fill="${c.teal}"/><path d="M8 36 L18 30" stroke="${c.gold}" stroke-width="2.4" stroke-linecap="round"/>`,
    confetti: (p, c) => confettiBits([[14, 14, 20, 0], [30, 12, -30, 1], [22, 24, 0, 2], [36, 26, 40, 3], [12, 32, -15, 4], [28, 38, 25, 0], [38, 38, 0, 1], [18, 40, 60, 2]], c),
    streamer: (p, c) => `<path d="M10 10 C20 12 14 22 24 24 S28 36 38 38" fill="none" stroke="${c.purple}" stroke-width="4" stroke-linecap="round"/><path d="M12 30 C18 26 22 32 28 28" fill="none" stroke="${c.yellow}" stroke-width="3" stroke-linecap="round"/>`,
    drum: (p, c) => `<ellipse cx="24" cy="18" rx="14" ry="5" fill="${p.paper2}"/><path d="M10 18 V33 C10 36 16 39 24 39 C32 39 38 36 38 33 V18 C38 21 32 23 24 23 C16 23 10 21 10 18Z" fill="${c.red}"/>${crease(p, 'M24 23 C32 23 38 21 38 18 V33 C38 36 32 39 24 39 Z')}<path d="M12 22 L18 36 L24 23 L30 36 L36 22" fill="none" stroke="${c.yellow}" stroke-width="1.6" stroke-linejoin="round"/><path d="M30 6 L22 16 M38 9 L28 16" stroke="${p.kraftDeep}" stroke-width="2.4" stroke-linecap="round"/>`,
  },
  easter: {
    egg: (p, c) => `<g>${egg(24, 25, 11, 14.5, 0, c.egg2, 'zig', c)}</g>${crease(p, 'M24 10.5 a11 14.5 0 0 1 0 29 Z')}`,
    basket: (p, c) => `<g transform="translate(24 30) scale(.62)">${basket(0, 0, 1, c).replace(/^<g transform="translate\(0 0\) scale\(1\)">/, '<g>')}</g>`,
    bunny: (p, c) => `<path d="M17 22 C13 14 13 6 17 3 C21 6 22 14 21 22Z" fill="${c.ear}" stroke="${p.ink}" stroke-opacity=".25"/><path d="M27 22 C26 14 27 6 31 3 C35 6 35 14 31 22Z" fill="${c.ear}" stroke="${p.ink}" stroke-opacity=".25"/><path d="M18 19 C16 13 16 8 17.5 6 C19.5 8 20 13 19.8 19Z M28.2 19 C28 13 28.5 8 30.5 6 C32 8 32 13 30 19Z" fill="${c.earIn}"/><ellipse cx="24" cy="30" rx="12" ry="10" fill="${c.ear}" stroke="${p.ink}" stroke-opacity=".25"/><circle cx="20" cy="28.5" r="1.6" fill="${p.ink}"/><circle cx="28" cy="28.5" r="1.6" fill="${p.ink}"/><path d="M22.5 32 Q24 33.6 25.5 32" fill="none" stroke="${p.ink}" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="17" cy="32" rx="2" ry="1.2" fill="${c.earIn}"/><ellipse cx="31" cy="32" rx="2" ry="1.2" fill="${c.earIn}"/>`,
    tulip: (p, c) => `<path d="M24 26 V42" stroke="${c.green}" stroke-width="2.6" stroke-linecap="round"/><path d="M24 38 C18 36 14 31 14 26 C20 28 23 32 24 38Z" fill="${c.green}"/><path d="M15 12 L19 17 L24 9 L29 17 L33 12 C34 21 31 27 24 27 C17 27 14 21 15 12Z" fill="${c.rose}"/>${crease(p, 'M24 9 L29 17 L33 12 C34 21 31 27 24 27 Z')}`,
  },
  valentine: {
    heart: (p, c) => `${heart(24, 25, 1.5, c.heart)}${crease(p, 'M24 13 C24 10 27 6 33 7 C42 10 42 25 24 37 Z')}`,
    letter: (p, c) => `<rect x="8" y="14" width="32" height="22" rx="2.5" fill="${p.paper2}"/><path d="M8 16 L24 28 L40 16" fill="none" stroke="${p.kraftDeep}" stroke-width="1.8" stroke-linejoin="round"/>${heart(24, 27, 0.55, c.heart)}`,
    rose: (p, c) => `<path d="M24 26 V42" stroke="${c.green}" stroke-width="2.4" stroke-linecap="round"/><path d="M24 36 C30 35 33 31 34 27 C28 28 25 31 24 36Z" fill="${c.green}"/><circle cx="24" cy="18" r="10" fill="${c.heart}"/>${crease(p, 'M24 8 a10 10 0 0 1 0 20 Z')}<path d="M24 12 C20 13 19 18 22 21 C25 23 29 20 28 16 C27 13 24 13 23 15" fill="none" stroke="${c.heartDeep}" stroke-width="1.6" stroke-linecap="round"/>`,
    balloon: (p, c) => `<path d="M22 31 C20 36 26 38 23 44" fill="none" stroke="${p.ink}" stroke-width="1.3" stroke-linecap="round"/>${heart(24, 19, 1.25, c.rose)}<path d="M15 14 C16 11 19 10 21 11" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.8" stroke-linecap="round"/>`,
  },
  junina: {
    flags: (p, c) => flags(4, 12, 44, 12, 5, 4, [c.red, c.yellow, c.blue, c.green], { ...c, string: p.ink }),
    bonfire: (p, c) => bonfire(24, 32, 0.62, c),
    'straw-hat': (p, c) => `<ellipse cx="24" cy="31" rx="18" ry="6" fill="${c.straw}"/><path d="M14 30 C14 18 18 12 24 12 C30 12 34 18 34 30 C30 33 18 33 14 30Z" fill="${c.straw}"/>${crease(p, 'M24 12 C30 12 34 18 34 30 C30 32 27 33 24 33 Z')}<path d="M14.2 26 C20 29 28 29 33.8 26 L34 30 C30 33 18 33 14 30Z" fill="${c.red}"/><rect x="25" y="16" width="5" height="4.5" rx=".6" fill="${c.patch}" transform="rotate(12 27 18)"/>`,
    corn: (p, c) => `<path d="M24 8 C30 10 32 20 31 30 C30 36 27 40 24 40 C21 40 18 36 17 30 C16 20 18 10 24 8Z" fill="${c.yellow}"/><path d="M20 14 V36 M24 9 V40 M28 14 V36 M18 20 H30 M17.5 26 H30.5 M18 32 H30" stroke="${c.strawDeep}" stroke-opacity=".55" stroke-width="1"/><path d="M24 40 C16 38 11 30 12 20 C16 26 20 32 24 40Z" fill="${c.green}"/><path d="M24 40 C32 38 37 30 36 20 C32 26 28 32 24 40Z" fill="${c.greenDeep}"/>`,
  },
  halloween: {
    pumpkin: (p, c) => pumpkin(24, 27, 0.85, c),
    bat: (p, c) => bat(24, 24, 1.25, { ...c, rim: '' }),
    'witch-hat': (p, c) => `<ellipse cx="24" cy="36" rx="17" ry="4.5" fill="${c.hat}"/><path d="M14 35 C17 26 20 18 22 11 C23 7 27 5 31 7 C28 9 27.5 12 28.5 15 C30 22 32 29 34 35 C28 38 20 38 14 35Z" fill="${c.hat}"/>${crease(p, 'M24 9 C26 6 28.5 6 31 7 C28 9 27.5 12 28.5 15 C30 22 32 29 34 35 C30 37 27 37.6 24 37.6 Z')}<path d="M15.5 31 C21 33.5 27 33.5 32.5 31 L34 35 C28 38 20 38 14 35Z" fill="${c.orange}"/>`,
    candy: (p, c) => `<path d="M11 15 L17 19 L11 23 Z M37 25 L31 29 L37 33 Z" fill="${c.purple}"/><rect x="15" y="17" width="18" height="14" rx="7" fill="${c.orange}" transform="rotate(20 24 24)"/>${crease(p, 'M17 26 L31 31 a7 7 0 0 0 2 -6 L19 20 Z')}<path d="M19 20 L22 30 M24 19 L27 31" stroke="${p.tile}" stroke-width="1.6" stroke-opacity=".8" transform="rotate(20 24 24)"/>`,
  },
  christmas: {
    tree: (p, c) => `<rect x="21.5" y="35" width="5" height="6" rx="1" fill="${p.woodDeep}"/><path d="M24 6 L35 20 H30 L38 30 H32 L40 37 H8 L16 30 H10 L18 20 H13 Z" fill="${c.green}"/>${crease(p, 'M24 6 L35 20 H30 L38 30 H32 L40 37 H24 Z')}<circle cx="20" cy="26" r="1.8" fill="${c.red}"/><circle cx="29" cy="31" r="1.8" fill="${c.yellow}"/><circle cx="26" cy="18" r="1.6" fill="${c.yellow}"/>${sparkle(24, 6, 3.6, c.yellow)}`,
    gift: (p, c) => `<rect x="10" y="20" width="28" height="20" rx="2" fill="${c.red}"/>${crease(p, 'M24 20 H38 V38 a2 2 0 0 1 -2 2 H24 Z')}<rect x="8" y="15" width="32" height="7" rx="2" fill="${c.redDeep}"/><path d="M24 15 V40" stroke="${c.yellow}" stroke-width="4"/><path d="M24 15 C18 7 12 10 16 14 C18 16 22 15 24 15 C26 15 30 16 32 14 C36 10 30 7 24 15Z" fill="${c.yellow}"/>`,
    snowflake: (p, c) => flake(24, 24, 14, { ...c, flake: c.dark ? '#cfe3ff' : '#3b86e6' }, 2.6),
    stocking: (p, c) => `<path d="M17 10 H31 V27 L36 32 C39 35 37 41 32 41 C29 41 27 40 25 38 L19 32 C17 30 17 28 17 26 Z" fill="${c.red}"/>${crease(p, 'M24 10 H31 V27 L36 32 C39 35 37 41 32 41 C29 41 27 40 25 38 L24 37 Z')}<rect x="15.5" y="7" width="17" height="7" rx="2.5" fill="${c.snow}" stroke="${c.snowLine}"/>`,
  },
};

export const SEASON_ICONS = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, Object.keys(v)]));

export function seasonIcon(id, name, { dark = false } = {}) {
  const c = colors(dark);
  return tileIcon((p) => ICONS[id][name](p, c), { dark });
}

// ---------- Hero vignettes (320 x 180), standing on the hero hills ----------

const VIGNETTES = {
  newyear: (p, c) => `${burst(70, 60, 42, c.gold, c.yellow)}${burst(190, 40, 30, c.rose, c.pink)}${burst(268, 86, 22, c.sky, c.blue)}<path d="M130 176 C134 140 150 112 176 84" fill="none" stroke="${c.gold}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>${sparkle(30, 130, 6, c.star)}${sparkle(150, 110, 5, c.star)}${sparkle(300, 150, 5, c.star)}`,
  carnival: (p, c) => `<path d="M10 20 C40 40 20 70 60 84 S80 130 120 140" fill="none" stroke="${c.pink}" stroke-width="5" stroke-linecap="round"/><path d="M300 16 C270 40 290 70 252 84 S228 128 196 140" fill="none" stroke="${c.teal}" stroke-width="5" stroke-linecap="round"/><g transform="translate(160 104) scale(1.9)"><path d="M-30 -2 Q-24 -12 -12 -8 Q-4 -5 0 -3 Q4 -5 12 -8 Q24 -12 30 -2 Q30 12 18 16 Q8 18 3 10 Q0 7 -3 10 Q-8 18 -18 16 Q-30 12 -30 -2Z" fill="${c.purple}" stroke="${c.gold}" stroke-width="1.4"/><ellipse cx="-14" cy="2" rx="6" ry="4" fill="${p.ink}"/><ellipse cx="14" cy="2" rx="6" ry="4" fill="${p.ink}"/><path d="M26 -6 C34 -18 34 -30 28 -38 C40 -30 42 -14 30 -2Z" fill="${c.pink}"/><path d="M18 16 L30 40" stroke="${c.gold}" stroke-width="2.4" stroke-linecap="round"/></g>${confettiBits([[30, 60, 20, 0], [80, 30, -30, 1], [250, 40, 0, 2], [290, 110, 40, 3], [60, 150, -15, 4], [230, 160, 25, 0], [120, 40, 60, 1], [210, 70, 0, 3], [100, 166, 30, 4], [280, 168, -20, 2]], c)}`,
  easter: (p, c) => `<path d="M8 172 C40 150 80 150 120 164 S220 150 312 170 V180 H8 Z" fill="${c.green}" fill-opacity=".55"/>${egg(84, 136, 22, 29, -10, c.egg1, 'dots', c)}${egg(140, 132, 25, 33, 6, c.egg2, 'zig', c)}${egg(196, 144, 19, 25, 14, c.egg3, 'band', c)}<g transform="translate(256 120)"><path d="M0 0 V56" stroke="${c.green}" stroke-width="3" stroke-linecap="round"/><path d="M0 40 C-10 36 -16 28 -16 20 C-6 24 -1 30 0 40Z" fill="${c.green}"/><path d="M-11 -18 L-6 -11 L0 -22 L6 -11 L11 -18 C12 -6 8 2 0 2 C-8 2 -12 -6 -11 -18Z" fill="${c.rose}"/></g><g transform="translate(40 128) scale(.8)"><path d="M0 0 V56" stroke="${c.green}" stroke-width="3" stroke-linecap="round"/><path d="M-11 -18 L-6 -11 L0 -22 L6 -11 L11 -18 C12 -6 8 2 0 2 C-8 2 -12 -6 -11 -18Z" fill="${c.yellow}"/></g><path d="M60 168 l4 -12 l4 12 M110 170 l3 -10 l3 10 M226 168 l4 -12 l4 12 M290 170 l3 -9 l3 9" fill="none" stroke="${c.greenDeep}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  valentine: (p, c) => `<path d="M150 176 C140 150 110 120 94 92 M156 176 C156 140 160 100 170 66 M162 176 C176 150 206 128 230 104" fill="none" stroke="${c.string}" stroke-width="1.6" stroke-linecap="round"/>${heart(92, 74, 2.4, c.rose, -12, c.rim)}${heart(170, 46, 2.9, c.heart, 4, c.rim)}${heart(232, 88, 2.2, c.heartDeep, 14, c.rim)}<path d="M160 36 C162 30 168 28 172 30" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/><g transform="translate(46 140) rotate(-8)"><rect x="-24" y="-16" width="48" height="32" rx="3" fill="${p.paper}"/><path d="M-24 -14 L0 4 L24 -14" fill="none" stroke="${p.kraftDeep}" stroke-width="2" stroke-linejoin="round"/>${heart(0, 2, 0.75, c.heart)}</g>${heart(286, 150, 0.8, c.rose, 10)}${heart(30, 40, 0.7, c.heart, -10)}`,
  junina: (p, c) => `${flags(6, 22, 314, 26, 18, 12, [c.red, c.yellow, c.blue, c.green, c.pink], c)}<path d="M6 22 V176 M314 26 V176" stroke="${p.woodDeep}" stroke-width="4" stroke-linecap="round"/>${bonfire(150, 150, 2, c)}<g transform="translate(262 138) rotate(18)"><path d="M0 -24 C6 -22 8 -12 7 -2 C6 4 3 8 0 8 C-3 8 -6 4 -7 -2 C-8 -12 -6 -22 0 -24Z" fill="${c.yellow}"/><path d="M0 8 C-8 6 -13 -2 -12 -12 C-8 -6 -4 0 0 8Z M0 8 C8 6 13 -2 12 -12 C8 -6 4 0 0 8Z" fill="${c.green}"/></g>`,
  halloween: (p, c) => `${pumpkin(80, 146, 1.6, c)}${pumpkin(138, 156, 1.05, c)}${pumpkin(190, 150, 1.3, c)}${bat(86, 50, 2.2, c)}${bat(170, 28, 1.5, c)}${bat(262, 70, 1.8, c)}<path d="M236 150 c6 -8 16 -8 20 0 c-4 6 -14 8 -20 0z" fill="${c.orangeDeep}" transform="rotate(-20 246 150)"/><path d="M30 118 c6 -8 16 -8 20 0 c-4 6 -14 8 -20 0z" fill="${c.gold}" transform="rotate(30 40 118)"/><path d="M270 120 c6 -8 16 -8 20 0 c-4 6 -14 8 -20 0z" fill="${c.orange}" transform="rotate(10 280 120)"/>`,
  christmas: (p, c) => {
    const tree = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="0" width="10" height="12" rx="2" fill="${p.woodDeep}"/><path d="M0 -76 L24 -44 H14 L32 -18 H20 L38 4 H-38 L-20 -18 H-32 L-14 -44 H-24 Z" fill="${c.green}"/>${crease(p, 'M0 -76 L24 -44 H14 L32 -18 H20 L38 4 H0 Z')}<path d="M-10 -58 L0 -64 L10 -58 M-20 -30 L0 -38 L20 -30 M-26 -6 L0 -14 L26 -6" fill="none" stroke="${c.snow}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${sparkle(0, -78, 7, c.yellow)}</g>`;
    return `${tree(90, 160, 1.1)}${tree(160, 166, 0.8)}<g transform="translate(232 150)"><rect x="-22" y="-14" width="44" height="30" rx="3" fill="${c.red}"/><rect x="-25" y="-21" width="50" height="9" rx="3" fill="${c.redDeep}"/><path d="M0 -21 V16" stroke="${c.yellow}" stroke-width="5"/><path d="M0 -21 C-8 -32 -18 -28 -12 -22 C-9 -20 -4 -21 0 -21 C4 -21 9 -20 12 -22 C18 -28 8 -32 0 -21Z" fill="${c.yellow}"/></g>${flake(30, 50, 12, c)}${flake(250, 40, 10, c)}${flake(300, 110, 8, c, 1.6)}${flake(40, 130, 8, c, 1.6)}`;
  },
};

export function seasonAccent(id, { dark = false } = {}) {
  const p = pal(dark);
  const c = colors(dark);
  const f = nid('vs');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" aria-hidden="true"><defs>${shadowFilter(p, f, { dy: 2, blur: 1.6, o: 0.8 })}</defs><g filter="url(#${f})">${VIGNETTES[id](p, c)}</g></svg>\n`;
}
