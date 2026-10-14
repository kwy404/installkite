// A fallback icon when a site has no logo: a rounded tile in the theme
// color with the app's initials, drawn with a built in stroke alphabet so
// no font is needed.
import { contrast, mix, parseColor, toHex } from './color.js';

// Glyphs on a 10 x 14 grid, drawn as round capped strokes.
const O = 'M5 0C2.2 0 0 3.1 0 7s2.2 7 5 7 5-3.1 5-7-2.2-7-5-7Z';
const P = 'M1 14V0h4.5c2.7 0 4.3 1.6 4.3 3.8S8.2 7.6 5.5 7.6H1';
export const GLYPHS: Record<string, string> = {
  A: 'M0 14 5 0l5 14M2 8.5h6',
  B: 'M1 0v14h5c3 0 4-2 4-3.5C10 8.5 8.5 7 6 7H1m0 0h4.5C8 7 9 5.5 9 3.5S8 0 5.5 0H1',
  C: 'M10 2.5C8.8.8 7.2 0 5.5 0 2.5 0 0 3 0 7s2.5 7 5.5 7c1.7 0 3.3-.8 4.5-2.5',
  D: 'M1 0v14h3.5C8 14 10 11 10 7s-2-7-5.5-7Z',
  E: 'M10 0H1v14h9M1 7h7',
  F: 'M10 0H1v14M1 7h7',
  G: 'M10 2.5C8.8.8 7.2 0 5.5 0 2.5 0 0 3 0 7s2.5 7 5.5 7c2.5 0 4.5-2 4.5-5V7.5H6',
  H: 'M1 0v14M9 0v14M1 7h8',
  I: 'M5 0v14M2 0h6M2 14h6',
  J: 'M8 0v10c0 2.5-1.5 4-3.5 4S1 12.5 1 10.5',
  K: 'M1 0v14M9.5 0 1 8.5M4 5.5 10 14',
  L: 'M1 0v14h8.5',
  M: 'M.5 14V0L5 9l4.5-9v14',
  N: 'M1 14V0l8 14V0',
  O,
  P,
  Q: `${O}M6.5 10.5l3.5 4`,
  R: `${P}M5.5 7.6 9.8 14`,
  S: 'M9.5 2C8.6.7 7.2 0 5.3 0 2.8 0 1 1.5 1 3.6c0 4.4 8.5 2.4 8.5 6.8 0 2.2-1.9 3.6-4.5 3.6-2 0-3.7-.9-4.5-2.4',
  T: 'M0 0h10M5 0v14',
  U: 'M1 0v9.5C1 12.3 2.7 14 5 14s4-1.7 4-4.5V0',
  V: 'M0 0l5 14 5-14',
  W: 'M0 0l2.5 14L5 4l2.5 10L10 0',
  X: 'M.5 0l9 14M9.5 0l-9 14',
  Y: 'M0 0l5 7 5-7M5 7v7',
  Z: 'M.5 0h9l-9 14h9',
  '0': 'M5 0C2.6 0 1 3.1 1 7s1.6 7 4 7 4-3.1 4-7-1.6-7-4-7Z',
  '1': 'M2.5 3 6 0v14M2.5 14h7',
  '2': 'M.8 3.2C1.3 1.2 3 0 5.1 0c2.5 0 4.2 1.6 4.2 3.9C9.3 7.5 1 9.5.7 14h8.8',
  '3': 'M1 1.2C2 .4 3.4 0 4.9 0 7.5 0 9 1.5 9 3.6S7.3 7 4.8 7c2.8 0 4.7 1.4 4.7 3.6S7.6 14 5 14c-1.7 0-3.2-.5-4.4-1.6',
  '4': 'M7.5 14V0L.5 9.8H10',
  '5': 'M9 0H1.8L1 6.6c1-.6 2.4-.9 3.8-.9 2.8 0 4.7 1.7 4.7 4.2S7.5 14 4.9 14c-1.7 0-3.2-.6-4.3-1.7',
  '6': 'M8.6 1C7.7.3 6.6 0 5.4 0 2.4 0 .5 3 .5 7.6c0 4 1.8 6.4 4.6 6.4 2.5 0 4.4-1.8 4.4-4.4S7.7 5.4 5.3 5.4c-2.1 0-3.9 1.2-4.7 3.1',
  '7': 'M.5 0h9l-6 14',
  '8': 'M5 7C2.6 7 1 5.6 1 3.5S2.7 0 5 0s4 1.4 4 3.5S7.4 7 5 7Zm0 0c2.7 0 4.5 1.5 4.5 3.5S7.6 14 5 14 .5 12.6.5 10.5 2.3 7 5 7Z',
  '9': 'M1.4 13c.9.7 2 1 3.2 1 3 0 4.9-3 4.9-7.6 0-4-1.8-6.4-4.6-6.4C2.4 0 .5 1.8.5 4.4s1.8 4.2 4.2 4.2c2.1 0 3.9-1.2 4.7-3.1',
};

/** One or two initials from an app name ("Acme Bakery" gives "AB"). */
export function initials(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0]!.slice(0, 1);
  return words[0]!.slice(0, 1) + words[1]!.slice(0, 1);
}

/** An SVG app icon: a gradient tile with the initials in a contrasting color. */
export function monogramSvg(name: string, color: string): string {
  const c = parseColor(color) ?? [59, 130, 246, 1];
  const top = toHex(mix(c, [255, 255, 255], 0.12));
  const bottom = toHex(mix(c, [0, 0, 0], 0.14));
  const ink = contrast(c, [255, 255, 255]) >= 2.6 ? '#ffffff' : '#111827';
  const letters = [...initials(name)].filter((ch) => GLYPHS[ch]);
  const scale = letters.length > 1 ? 15 : 18; // pixels per glyph unit
  const gap = 3.4;
  const width = letters.length ? letters.length * 10 + (letters.length - 1) * gap : 0;
  const x0 = 256 - (width * scale) / 2;
  const y0 = 256 - (14 * scale) / 2;
  const glyphs = letters
    .map((ch, i) => `<path transform="translate(${(x0 + i * (10 + gap) * scale).toFixed(2)} ${y0.toFixed(2)}) scale(${scale})" d="${GLYPHS[ch]}"/>`)
    .join('');
  // Without letters: a simple window glyph.
  const fallback = '<rect x="156" y="166" width="200" height="180" rx="28" fill="none"/><path d="M156 222h200"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><g fill="none" stroke="${ink}" stroke-width="${letters.length ? (2.05).toFixed(2) : 28}" stroke-linecap="round" stroke-linejoin="round">${letters.length ? glyphs : fallback}</g></svg>\n`;
}
