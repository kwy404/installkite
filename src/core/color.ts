// CSS color parsing for manifest colors and SVG paint: hex, rgb(), hsl(),
// hwb() and the CSS named colors.

export type RGBA = [number, number, number, number];

// The CSS named colors, packed as name:hex pairs.
const NAMED_SRC =
  'aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 ' +
  'blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 ' +
  'chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c cyan:00ffff darkblue:00008b ' +
  'darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkgrey:a9a9a9 darkkhaki:bdb76b ' +
  'darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a ' +
  'darkseagreen:8fbc8f darkslateblue:483d8b darkslategray:2f4f4f darkslategrey:2f4f4f darkturquoise:00ced1 ' +
  'darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dimgrey:696969 dodgerblue:1e90ff ' +
  'firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff ' +
  'gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f grey:808080 honeydew:f0fff0 hotpink:ff69b4 ' +
  'indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 ' +
  'lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 ' +
  'lightgreen:90ee90 lightgrey:d3d3d3 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa ' +
  'lightslategray:778899 lightslategrey:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 ' +
  'linen:faf0e6 magenta:ff00ff maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 ' +
  'mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc ' +
  'mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead ' +
  'navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 ' +
  'palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 ' +
  'peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f ' +
  'royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d ' +
  'silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 slategrey:708090 snow:fffafa springgreen:00ff7f ' +
  'steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 ' +
  'white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32';

const NAMED = new Map<string, string>(NAMED_SRC.split(' ').map((p) => p.split(':') as [string, string]));

function num(s: string, max: number): number | null {
  s = s.trim();
  if (s === 'none') return 0;
  const pct = s.endsWith('%');
  const v = Number(pct ? s.slice(0, -1) : s);
  if (!Number.isFinite(v)) return null;
  return pct ? (v / 100) * max : v;
}

function hue(s: string): number | null {
  s = s.trim();
  const m = /^(-?[\d.]+(?:e-?\d+)?)(deg|rad|grad|turn)?$/i.exec(s);
  if (!m) return null;
  const v = Number(m[1]);
  const unit = (m[2] || 'deg').toLowerCase();
  const deg = unit === 'rad' ? (v * 180) / Math.PI : unit === 'grad' ? v * 0.9 : unit === 'turn' ? v * 360 : v;
  return ((deg % 360) + 360) % 360;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function args(body: string): string[] {
  // Accepts both "1, 2, 3, 0.5" and "1 2 3 / 0.5".
  const [main, alpha] = body.split('/');
  const parts = main!.includes(',') ? main!.split(',') : main!.trim().split(/\s+/);
  if (alpha !== undefined) parts.push(alpha);
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

/** Parses a CSS color. Returns RGBA with channels 0 to 255 and alpha 0 to 1, or null. */
export function parseColor(input: string): RGBA | null {
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  if (s === 'transparent') return [0, 0, 0, 0];
  const named = NAMED.get(s);
  if (named) return parseColor(`#${named}`);
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (!/^[0-9a-f]+$/.test(h) || ![3, 4, 6, 8].includes(h.length)) return null;
    const full = h.length <= 4 ? [...h].map((c) => c + c).join('') : h;
    const v = (i: number): number => parseInt(full.slice(i * 2, i * 2 + 2), 16);
    return [v(0), v(1), v(2), full.length === 8 ? v(3) / 255 : 1];
  }
  const m = /^(rgba?|hsla?|hwb)\(([^)]*)\)$/.exec(s);
  if (!m) return null;
  const fn = m[1]!;
  const a = args(m[2]!);
  if (a.length !== 3 && a.length !== 4) return null;
  const alpha = a.length === 4 ? num(a[3]!, 1) : 1;
  if (alpha === null) return null;
  let rgb: [number, number, number];
  if (fn.startsWith('rgb')) {
    const r = num(a[0]!, 255);
    const g = num(a[1]!, 255);
    const b = num(a[2]!, 255);
    if (r === null || g === null || b === null) return null;
    rgb = [r, g, b];
  } else {
    const h = hue(a[0]!);
    const x = num(a[1]!, 1);
    const y = num(a[2]!, 1);
    if (h === null || x === null || y === null) return null;
    if (fn === 'hwb') {
      const w = Math.min(1, x);
      const bl = Math.min(1, y);
      if (w + bl >= 1) {
        const g = (w / (w + bl)) * 255;
        rgb = [g, g, g];
      } else {
        const base = hslToRgb(h, 1, 0.5);
        rgb = base.map((c) => c * (1 - w - bl) + w * 255) as [number, number, number];
      }
    } else {
      rgb = hslToRgb(h, Math.min(1, x), Math.min(1, y));
    }
  }
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return [c(rgb[0]), c(rgb[1]), c(rgb[2]), Math.max(0, Math.min(1, alpha))];
}

/** Formats as #rrggbb (alpha is dropped). */
export function toHex(c: readonly number[]): string {
  return `#${c
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** WCAG relative luminance, 0 to 1. */
export function luminance(c: readonly number[]): number {
  const lin = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!);
}

/** WCAG contrast ratio between two colors, 1 to 21. */
export function contrast(a: readonly number[], b: readonly number[]): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mixes two colors, t = 0 gives a, t = 1 gives b. */
export function mix(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as [number, number, number];
}
