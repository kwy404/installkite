// A compact SVG rasterizer in pure TypeScript, made for logos and icons.
//
// Supported: <svg> with viewBox and preserveAspectRatio, <g>, <path> (every
// command including arcs), <rect> (rounded), <circle>, <ellipse>, <line>,
// <polyline>, <polygon>, <use> and <symbol>, <defs>, linear and radial
// gradients (units, transforms, spread, href inheritance), fills with
// nonzero and evenodd rules, strokes (width, caps, joins, miter limit,
// dashes), opacity on shapes and groups, <clipPath>, embedded PNG <image>,
// transforms, currentColor, presentation attributes, style attributes and
// simple <style> rules (tag, class and id selectors).
//
// Not supported, reported as warnings: <text> (convert text to paths),
// <mask>, filters, patterns and external references.
import { parseColor } from './color.js';
import { decodePng, type RGBAImage } from './png.js';
import { parseXml, type XmlElement } from './xml.js';

type Mat = [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

function mul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function invert(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return [0, 0, 0, 0, 0, 0];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

function apply(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const NUM_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

function numbers(s: string): number[] {
  return (s.match(NUM_RE) || []).map(Number);
}

/** Parses an SVG transform list. */
export function parseTransform(s: string | undefined): Mat {
  let m: Mat = IDENTITY;
  if (!s) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let t: RegExpExecArray | null;
  while ((t = re.exec(s))) {
    const a = numbers(t[2]!);
    let n: Mat = IDENTITY;
    switch (t[1]) {
      case 'matrix':
        if (a.length >= 6) n = [a[0]!, a[1]!, a[2]!, a[3]!, a[4]!, a[5]!];
        break;
      case 'translate':
        n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case 'scale':
        n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case 'rotate': {
        const r = ((a[0] ?? 0) * Math.PI) / 180;
        const c = Math.cos(r);
        const sn = Math.sin(r);
        n = [c, sn, -sn, c, 0, 0];
        if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1]!, a[2]!], n), [1, 0, 0, 1, -a[1]!, -a[2]!]);
        break;
      }
      case 'skewX':
        n = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case 'skewY':
        n = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    m = mul(m, n);
  }
  return m;
}

// ---------- Paths ----------

/** Absolute path segments: M x y, L x y, C x1 y1 x2 y2 x y, Z. */
type Seg = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];

function arcToCubics(x1: number, y1: number, rx: number, ry: number, phiDeg: number, large: number, sweep: number, x2: number, y2: number): Seg[] {
  if (rx === 0 || ry === 0) return [['L', x2, y2]];
  if (x1 === x2 && y1 === y2) return [];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * y1p) / ry;
  const cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const parts = Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9);
  const out: Seg[] = [];
  const step = dt / parts;
  const k = (4 / 3) * Math.tan(step / 4);
  let a = t1;
  const point = (t: number): [number, number] => {
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy];
  };
  const deriv = (t: number): [number, number] => {
    const ex = -rx * Math.sin(t);
    const ey = ry * Math.cos(t);
    return [cos * ex - sin * ey, sin * ex + cos * ey];
  };
  for (let i = 0; i < parts; i++) {
    const b = a + step;
    const p0 = point(a);
    const p3 = i === parts - 1 ? [x2, y2] : point(b);
    const d0 = deriv(a);
    const d3 = deriv(b);
    out.push(['C', p0[0] + k * d0[0], p0[1] + k * d0[1], p3[0]! - k * d3[0], p3[1]! - k * d3[1], p3[0]!, p3[1]!]);
    a = b;
  }
  return out;
}

/** Parses path data into absolute M, L, C and Z segments. */
export function parsePath(d: string): Seg[] {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
  const out: Seg[] = [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let lastC: [number, number] | null = null;
  let lastQ: [number, number] | null = null;
  const isCmd = (t: string | undefined): boolean => t !== undefined && /^[A-Za-z]$/.test(t);
  const next = (): number => {
    const t = tokens[i++];
    if (t === undefined || isCmd(t)) throw new Error('bad path data');
    return Number(t);
  };
  // Arc flags may be packed without separators ("a1 1 0 01 2 2").
  const flag = (): number => {
    const t = tokens[i];
    if (t === undefined) throw new Error('bad path data');
    if (t === '0' || t === '1') {
      i++;
      return Number(t);
    }
    if (/^[01]/.test(t)) {
      tokens[i] = t.slice(1);
      return Number(t[0]);
    }
    throw new Error('bad arc flag');
  };
  try {
    while (i < tokens.length) {
      if (isCmd(tokens[i])) cmd = tokens[i++]!;
      else if (!cmd) break;
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const ox = rel ? x : 0;
      const oy = rel ? y : 0;
      switch (C) {
        case 'M': {
          x = ox + next();
          y = oy + next();
          sx = x;
          sy = y;
          out.push(['M', x, y]);
          cmd = rel ? 'l' : 'L';
          lastC = lastQ = null;
          continue;
        }
        case 'L':
          x = ox + next();
          y = oy + next();
          out.push(['L', x, y]);
          lastC = lastQ = null;
          break;
        case 'H':
          x = ox + next();
          out.push(['L', x, y]);
          lastC = lastQ = null;
          break;
        case 'V':
          y = oy + next();
          out.push(['L', x, y]);
          lastC = lastQ = null;
          break;
        case 'C': {
          const x1 = ox + next();
          const y1 = oy + next();
          const x2 = ox + next();
          const y2 = oy + next();
          x = ox + next();
          y = oy + next();
          out.push(['C', x1, y1, x2, y2, x, y]);
          lastC = [x2, y2];
          lastQ = null;
          break;
        }
        case 'S': {
          const x1 = lastC ? 2 * x - lastC[0] : x;
          const y1 = lastC ? 2 * y - lastC[1] : y;
          const x2 = ox + next();
          const y2 = oy + next();
          x = ox + next();
          y = oy + next();
          out.push(['C', x1, y1, x2, y2, x, y]);
          lastC = [x2, y2];
          lastQ = null;
          break;
        }
        case 'Q':
        case 'T': {
          let qx: number;
          let qy: number;
          if (C === 'Q') {
            qx = ox + next();
            qy = oy + next();
          } else {
            qx = lastQ ? 2 * x - lastQ[0] : x;
            qy = lastQ ? 2 * y - lastQ[1] : y;
          }
          const ex = ox + next();
          const ey = oy + next();
          out.push(['C', x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey]);
          x = ex;
          y = ey;
          lastQ = [qx, qy];
          lastC = null;
          break;
        }
        case 'A': {
          const rx = next();
          const ry = next();
          const rot = next();
          const large = flag();
          const sweep = flag();
          const ex = ox + next();
          const ey = oy + next();
          out.push(...arcToCubics(x, y, rx, ry, rot, large, sweep, ex, ey));
          x = ex;
          y = ey;
          lastC = lastQ = null;
          break;
        }
        case 'Z':
          out.push(['Z']);
          x = sx;
          y = sy;
          lastC = lastQ = null;
          cmd = '';
          continue;
        default:
          i++;
      }
    }
  } catch {
    // The spec renders a path up to the first error.
  }
  return out;
}

interface Sub {
  pts: number[];
  closed: boolean;
}

/** Flattens segments into device space polylines. */
function flatten(segs: Seg[], m: Mat): Sub[] {
  const subs: Sub[] = [];
  let cur: Sub | null = null;
  let px = 0;
  let py = 0;
  let sx = 0;
  let sy = 0;
  for (const s of segs) {
    if (s[0] === 'M') {
      const [dx, dy] = apply(m, s[1], s[2]);
      cur = { pts: [dx, dy], closed: false };
      subs.push(cur);
      px = sx = s[1];
      py = sy = s[2];
    } else if (s[0] === 'Z') {
      if (cur) cur.closed = true;
      px = sx;
      py = sy;
      cur = null;
    } else {
      if (!cur) {
        const [dx, dy] = apply(m, px, py);
        cur = { pts: [dx, dy], closed: false };
        subs.push(cur);
        sx = px;
        sy = py;
      }
      if (s[0] === 'L') {
        const [dx, dy] = apply(m, s[1], s[2]);
        cur.pts.push(dx, dy);
        px = s[1];
        py = s[2];
      } else {
        const p0 = apply(m, px, py);
        const p1 = apply(m, s[1], s[2]);
        const p2 = apply(m, s[3], s[4]);
        const p3 = apply(m, s[5], s[6]);
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
        const steps = Math.max(2, Math.min(256, Math.ceil(Math.sqrt(len) * 2)));
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const u = 1 - t;
          const a = u * u * u;
          const b = 3 * u * u * t;
          const c = 3 * u * t * t;
          const d = t * t * t;
          cur.pts.push(a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]);
        }
        px = s[5];
        py = s[6];
      }
    }
  }
  return subs;
}

// ---------- Coverage rasterizer ----------

const SUB = 16;

/** Anti aliased coverage (0 to 1 per pixel) of polygons with a fill rule. */
function coverage(polys: Sub[], w: number, h: number, evenOdd: boolean): Float32Array {
  const cov = new Float32Array(w * h);
  const edges: number[] = []; // x0, y0, x1, y1, dir
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of polys) {
    const n = p.pts.length / 2;
    if (n < 2) continue;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x0 = p.pts[i * 2]!;
      const y0 = p.pts[i * 2 + 1]!;
      const x1 = p.pts[j * 2]!;
      const y1 = p.pts[j * 2 + 1]!;
      if (y0 === y1 || !Number.isFinite(x0 + y0 + x1 + y1)) continue;
      if (y0 < y1) edges.push(x0, y0, x1, y1, 1);
      else edges.push(x1, y1, x0, y0, -1);
      minY = Math.min(minY, y0, y1);
      maxY = Math.max(maxY, y0, y1);
    }
  }
  if (!edges.length) return cov;
  const count = edges.length / 5;
  // Sort edge indices by top y for an active edge walk.
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => edges[a * 5 + 1]! - edges[b * 5 + 1]!);
  const rowStart = Math.max(0, Math.floor(minY));
  const rowEnd = Math.min(h, Math.ceil(maxY));
  const row = new Float32Array(w + 2);
  const xs: number[] = [];
  const dirs: number[] = [];
  let active: number[] = [];
  let next = 0;
  const weight = 1 / SUB;
  for (let y = rowStart; y < rowEnd; y++) {
    row.fill(0);
    const diff = new Float32Array(w + 2);
    let touched = false;
    for (let s = 0; s < SUB; s++) {
      const sy = y + (s + 0.5) / SUB;
      while (next < count && edges[order[next]! * 5 + 1]! <= sy) active.push(order[next++]!);
      active = active.filter((e) => edges[e * 5 + 3]! > sy);
      xs.length = 0;
      dirs.length = 0;
      for (const e of active) {
        const o = e * 5;
        const y0 = edges[o + 1]!;
        const y1 = edges[o + 3]!;
        if (sy < y0 || sy >= y1) continue;
        const x0 = edges[o]!;
        const x1 = edges[o + 2]!;
        xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
        dirs.push(edges[o + 4]!);
      }
      if (xs.length < 2) continue;
      const idx = xs.map((_, i) => i).sort((a, b) => xs[a]! - xs[b]!);
      let wind = 0;
      for (let k = 0; k < idx.length - 1; k++) {
        wind += dirs[idx[k]!]!;
        const inside = evenOdd ? (wind & 1) !== 0 : wind !== 0;
        if (!inside) continue;
        let xa = xs[idx[k]!]!;
        let xb = xs[idx[k + 1]!]!;
        if (xb <= 0 || xa >= w) continue;
        xa = Math.max(0, xa);
        xb = Math.min(w, xb);
        if (xb <= xa) continue;
        touched = true;
        const ia = Math.floor(xa);
        const ib = Math.floor(xb);
        if (ia === ib) {
          row[ia]! += (xb - xa) * weight;
        } else {
          row[ia]! += (ia + 1 - xa) * weight;
          diff[ia + 1]! += weight;
          diff[ib]! -= weight;
          if (ib < w) row[ib]! += (xb - ib) * weight;
        }
      }
    }
    if (!touched) continue;
    let run = 0;
    const base = y * w;
    for (let x = 0; x < w; x++) {
      run += diff[x]!;
      const v = row[x]! + run;
      cov[base + x] = v > 1 ? 1 : v < 0 ? 0 : v;
    }
  }
  return cov;
}

// ---------- Strokes ----------

function orient(pts: number[]): number[] {
  let area = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i * 2]! * pts[j * 2 + 1]! - pts[j * 2]! * pts[i * 2 + 1]!;
  }
  if (area >= 0) return pts;
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(pts[i * 2]!, pts[i * 2 + 1]!);
  return out;
}

function circle(cx: number, cy: number, r: number): number[] {
  const n = Math.max(8, Math.min(64, Math.ceil(r * 2)));
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

interface StrokeStyle {
  width: number;
  cap: string;
  join: string;
  miter: number;
  dash: number[];
  dashOffset: number;
}

function dashSub(sub: Sub, dash: number[], offset: number): Sub[] {
  const total = dash.reduce((a, b) => a + b, 0);
  if (!dash.length || total <= 0) return [sub];
  const pts = sub.closed ? [...sub.pts, sub.pts[0]!, sub.pts[1]!] : sub.pts;
  const out: Sub[] = [];
  let di = 0;
  let left = dash[0]!;
  // Apply the offset.
  let off = ((offset % total) + total) % total;
  while (off > 0) {
    if (off >= left) {
      off -= left;
      di = (di + 1) % dash.length;
      left = dash[di]!;
    } else {
      left -= off;
      off = 0;
    }
  }
  let on = di % 2 === 0;
  let cur: number[] | null = on ? [pts[0]!, pts[1]!] : null;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    let x0 = pts[i]!;
    let y0 = pts[i + 1]!;
    const x1 = pts[i + 2]!;
    const y1 = pts[i + 3]!;
    let seg = Math.hypot(x1 - x0, y1 - y0);
    while (seg > 0) {
      if (seg < left) {
        left -= seg;
        if (cur) cur.push(x1, y1);
        seg = 0;
      } else {
        const t = left / seg;
        const mx = x0 + (x1 - x0) * t;
        const my = y0 + (y1 - y0) * t;
        if (cur) {
          cur.push(mx, my);
          out.push({ pts: cur, closed: false });
          cur = null;
        } else cur = [mx, my];
        seg -= left;
        x0 = mx;
        y0 = my;
        di = (di + 1) % dash.length;
        left = dash[di]!;
        on = !on;
        if (!on) cur = null;
      }
    }
  }
  if (cur && cur.length >= 4) out.push({ pts: cur, closed: false });
  return out;
}

/** Converts polylines into polygons covering the stroke outline. */
function strokePolys(subs: Sub[], st: StrokeStyle): Sub[] {
  const hw = st.width / 2;
  const polys: Sub[] = [];
  const add = (pts: number[]): void => {
    polys.push({ pts: orient(pts), closed: true });
  };
  let pieces: Sub[] = subs;
  if (st.dash.length) pieces = subs.flatMap((s) => dashSub(s, st.dash, st.dashOffset));
  for (const sub of pieces) {
    // Remove repeated points.
    const p: number[] = [];
    for (let i = 0; i < sub.pts.length; i += 2) {
      const x = sub.pts[i]!;
      const y = sub.pts[i + 1]!;
      if (p.length && Math.abs(p[p.length - 2]! - x) < 1e-6 && Math.abs(p[p.length - 1]! - y) < 1e-6) continue;
      p.push(x, y);
    }
    const closed = sub.closed && p.length >= 6;
    if (closed && Math.abs(p[0]! - p[p.length - 2]!) < 1e-6 && Math.abs(p[1]! - p[p.length - 1]!) < 1e-6) p.length -= 2;
    const n = p.length / 2;
    if (n === 1) {
      if (st.cap === 'round') add(circle(p[0]!, p[1]!, hw));
      else if (st.cap === 'square') add([p[0]! - hw, p[1]! - hw, p[0]! + hw, p[1]! - hw, p[0]! + hw, p[1]! + hw, p[0]! - hw, p[1]! + hw]);
      continue;
    }
    const segCount = closed ? n : n - 1;
    const dirs: Array<[number, number]> = [];
    for (let i = 0; i < segCount; i++) {
      const j = (i + 1) % n;
      const dx = p[j * 2]! - p[i * 2]!;
      const dy = p[j * 2 + 1]! - p[i * 2 + 1]!;
      const len = Math.hypot(dx, dy) || 1;
      dirs.push([dx / len, dy / len]);
    }
    for (let i = 0; i < segCount; i++) {
      const j = (i + 1) % n;
      let x0 = p[i * 2]!;
      let y0 = p[i * 2 + 1]!;
      let x1 = p[j * 2]!;
      let y1 = p[j * 2 + 1]!;
      const [dx, dy] = dirs[i]!;
      if (!closed && st.cap === 'square') {
        if (i === 0) {
          x0 -= dx * hw;
          y0 -= dy * hw;
        }
        if (i === segCount - 1) {
          x1 += dx * hw;
          y1 += dy * hw;
        }
      }
      const nx = -dy * hw;
      const ny = dx * hw;
      add([x0 + nx, y0 + ny, x1 + nx, y1 + ny, x1 - nx, y1 - ny, x0 - nx, y0 - ny]);
    }
    // Joins at interior vertices (every vertex on closed paths).
    const first = closed ? 0 : 1;
    const last = closed ? n - 1 : n - 2;
    for (let v = first; v <= last; v++) {
      const d0 = dirs[(v - 1 + segCount) % segCount]!;
      const d1 = dirs[v % segCount]!;
      const x = p[v * 2]!;
      const y = p[v * 2 + 1]!;
      const cross = d0[0] * d1[1] - d0[1] * d1[0];
      if (Math.abs(cross) < 1e-9 && d0[0] * d1[0] + d0[1] * d1[1] > 0) continue;
      if (st.join === 'round') {
        add(circle(x, y, hw));
        continue;
      }
      const s = cross > 0 ? -1 : 1;
      const n0: [number, number] = [-d0[1] * s, d0[0] * s];
      const n1: [number, number] = [-d1[1] * s, d1[0] * s];
      const ax = x + n0[0] * hw;
      const ay = y + n0[1] * hw;
      const bx = x + n1[0] * hw;
      const by = y + n1[1] * hw;
      const mx = n0[0] + n1[0];
      const my = n0[1] + n1[1];
      const ml = Math.hypot(mx, my);
      const cosHalf = ml / 2;
      if (st.join !== 'bevel' && cosHalf > 1e-6 && 1 / cosHalf <= st.miter) {
        const len = hw / cosHalf;
        add([x, y, ax, ay, x + (mx / ml) * len, y + (my / ml) * len, bx, by]);
      } else {
        add([x, y, ax, ay, bx, by]);
      }
    }
    if (!closed && st.cap === 'round') {
      add(circle(p[0]!, p[1]!, hw));
      add(circle(p[(n - 1) * 2]!, p[(n - 1) * 2 + 1]!, hw));
    }
  }
  return polys;
}

// ---------- Paint ----------

interface Stop {
  offset: number;
  color: [number, number, number, number];
}

type Paint =
  | { kind: 'solid'; color: [number, number, number, number] }
  | { kind: 'gradient'; lut: Float32Array; inv: Mat; spread: string; radial: false; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'gradient'; lut: Float32Array; inv: Mat; spread: string; radial: true; cx: number; cy: number; r: number; fx: number; fy: number };

function buildLut(stops: Stop[]): Float32Array {
  const lut = new Float32Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let c: [number, number, number, number];
    if (t <= stops[0]!.offset) c = stops[0]!.color;
    else if (t >= stops[stops.length - 1]!.offset) c = stops[stops.length - 1]!.color;
    else {
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1]!.offset) k++;
      const a = stops[k]!;
      const b = stops[k + 1]!;
      const f = b.offset === a.offset ? 1 : (t - a.offset) / (b.offset - a.offset);
      c = [0, 1, 2, 3].map((j) => a.color[j]! + (b.color[j]! - a.color[j]!) * f) as [number, number, number, number];
    }
    // Store premultiplied, channels 0 to 1.
    lut[i * 4 + 3] = c[3];
    lut[i * 4] = (c[0] / 255) * c[3];
    lut[i * 4 + 1] = (c[1] / 255) * c[3];
    lut[i * 4 + 2] = (c[2] / 255) * c[3];
  }
  return lut;
}

function spreadT(t: number, spread: string): number {
  if (spread === 'repeat') return t - Math.floor(t);
  if (spread === 'reflect') {
    const m = ((t % 2) + 2) % 2;
    return m > 1 ? 2 - m : m;
  }
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Premultiplied color of a paint at a device pixel center. */
function sample(paint: Paint, x: number, y: number, out: Float32Array): void {
  if (paint.kind === 'solid') {
    const a = paint.color[3];
    out[0] = (paint.color[0] / 255) * a;
    out[1] = (paint.color[1] / 255) * a;
    out[2] = (paint.color[2] / 255) * a;
    out[3] = a;
    return;
  }
  const [gx, gy] = apply(paint.inv, x, y);
  let t: number;
  if (!paint.radial) {
    const dx = paint.x2 - paint.x1;
    const dy = paint.y2 - paint.y1;
    const len2 = dx * dx + dy * dy;
    t = len2 === 0 ? 1 : ((gx - paint.x1) * dx + (gy - paint.y1) * dy) / len2;
  } else {
    // Point on circle centered at f + t (c - f) with radius t r.
    const cdx = paint.cx - paint.fx;
    const cdy = paint.cy - paint.fy;
    const pdx = gx - paint.fx;
    const pdy = gy - paint.fy;
    const a = cdx * cdx + cdy * cdy - paint.r * paint.r;
    const b = pdx * cdx + pdy * cdy;
    const c = pdx * pdx + pdy * pdy;
    if (Math.abs(a) < 1e-9) t = b === 0 ? 0 : c / (2 * b);
    else {
      const disc = b * b - a * c;
      t = disc < 0 ? 0 : (b - Math.sqrt(disc)) / a;
      if (t < 0) t = (b + Math.sqrt(Math.max(0, disc))) / a;
    }
    if (paint.r === 0) t = 1;
  }
  const i = Math.round(spreadT(t, paint.spread) * 255) * 4;
  out[0] = paint.lut[i]!;
  out[1] = paint.lut[i + 1]!;
  out[2] = paint.lut[i + 2]!;
  out[3] = paint.lut[i + 3]!;
}

// ---------- Layers ----------

class Layer {
  data: Float32Array;
  constructor(
    public w: number,
    public h: number,
  ) {
    this.data = new Float32Array(w * h * 4);
  }

  fill(cov: Float32Array, paint: Paint, opacity: number): void {
    const px = new Float32Array(4);
    for (let i = 0; i < cov.length; i++) {
      const c = cov[i]!;
      if (c === 0) continue;
      sample(paint, (i % this.w) + 0.5, Math.floor(i / this.w) + 0.5, px);
      const k = c * opacity;
      const sa = px[3]! * k;
      if (sa === 0) continue;
      const o = i * 4;
      const inv = 1 - sa;
      this.data[o] = px[0]! * k + this.data[o]! * inv;
      this.data[o + 1] = px[1]! * k + this.data[o + 1]! * inv;
      this.data[o + 2] = px[2]! * k + this.data[o + 2]! * inv;
      this.data[o + 3] = sa + this.data[o + 3]! * inv;
    }
  }

  /** Draws another layer over this one, with an opacity and an optional coverage mask. */
  draw(top: Layer, opacity: number, mask?: Float32Array): void {
    for (let i = 0; i < this.w * this.h; i++) {
      const k = opacity * (mask ? mask[i]! : 1);
      const o = i * 4;
      const sa = top.data[o + 3]! * k;
      if (sa === 0) continue;
      const inv = 1 - sa;
      this.data[o] = top.data[o]! * k + this.data[o]! * inv;
      this.data[o + 1] = top.data[o + 1]! * k + this.data[o + 1]! * inv;
      this.data[o + 2] = top.data[o + 2]! * k + this.data[o + 2]! * inv;
      this.data[o + 3] = sa + this.data[o + 3]! * inv;
    }
  }

  toImage(): RGBAImage {
    const out = new Uint8Array(this.w * this.h * 4);
    for (let i = 0; i < out.length; i += 4) {
      const a = this.data[i + 3]!;
      if (a <= 0) continue;
      const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
      out[i] = c((this.data[i]! / a) * 255);
      out[i + 1] = c((this.data[i + 1]! / a) * 255);
      out[i + 2] = c((this.data[i + 2]! / a) * 255);
      out[i + 3] = c(a * 255);
    }
    return { width: this.w, height: this.h, data: out };
  }
}

// ---------- Styles ----------

const INHERITED = new Set([
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'color',
  'visibility',
  'clip-rule',
]);
const PROPS = new Set([...INHERITED, 'opacity', 'display', 'clip-path', 'stop-color', 'stop-opacity', 'mask', 'filter']);

type Style = Record<string, string>;

interface Rule {
  tag?: string;
  ids: string[];
  classes: string[];
  spec: number;
  order: number;
  decls: Style;
}

function parseDecls(s: string): Style {
  const out: Style = {};
  for (const part of s.split(';')) {
    const c = part.indexOf(':');
    if (c < 0) continue;
    const k = part.slice(0, c).trim().toLowerCase();
    const v = part
      .slice(c + 1)
      .replace(/!important/i, '')
      .trim();
    if (k && v) out[k] = v;
  }
  return out;
}

function parseCss(css: string, order: { n: number }): Rule[] {
  const rules: Rule[] = [];
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const decls = parseDecls(m[2]!);
    for (const raw of m[1]!.split(',')) {
      const sel = raw.trim();
      if (!/^[\w-]*(?:[.#][\w-]+)*$/.test(sel) || !sel) continue;
      const tag = /^[\w-]+/.exec(sel)?.[0];
      const ids = [...sel.matchAll(/#([\w-]+)/g)].map((x) => x[1]!);
      const classes = [...sel.matchAll(/\.([\w-]+)/g)].map((x) => x[1]!);
      rules.push({ tag, ids, classes, spec: ids.length * 100 + classes.length * 10 + (tag ? 1 : 0), order: order.n++, decls });
    }
  }
  return rules.sort((a, b) => a.spec - b.spec || a.order - b.order);
}

// ---------- Renderer ----------

export interface RasterizeOptions {
  /** Output width in pixels. */
  width: number;
  /** Output height in pixels (defaults to width). */
  height?: number;
}

export interface RasterizeResult {
  image: RGBAImage;
  warnings: string[];
}

/** Reads the intrinsic size of an SVG: viewBox size, else width and height. */
export function svgSize(src: string): { width: number; height: number } {
  const root = parseXml(src);
  const vb = numbers(root.attrs.viewBox || '');
  const w = lengthPx(root.attrs.width);
  const h = lengthPx(root.attrs.height);
  if (w && h) return { width: w, height: h };
  if (vb.length === 4 && vb[2]! > 0 && vb[3]! > 0) return { width: vb[2]!, height: vb[3]! };
  return { width: w || 300, height: h || 150 };
}

function lengthPx(v: string | undefined): number | null {
  if (!v) return null;
  const m = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(px|pt|pc|mm|cm|in|em|ex)?\s*$/i.exec(v);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] || 'px').toLowerCase();
  const k: Record<string, number> = { px: 1, pt: 4 / 3, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, em: 16, ex: 8 };
  return n * (k[unit] ?? 1);
}

/** Rasterizes SVG source to an RGBA image of the given size. */
export function rasterizeSvg(src: string, opts: RasterizeOptions): RasterizeResult {
  const W = Math.round(opts.width);
  const H = Math.round(opts.height ?? opts.width);
  const root = parseXml(src);
  if (root.name.replace(/^.*:/, '') !== 'svg') throw new Error('the file is not an SVG image');
  const warnings = new Set<string>();
  const ids = new Map<string, XmlElement>();
  const order = { n: 0 };
  let rules: Rule[] = [];
  const index = (el: XmlElement): void => {
    if (el.attrs.id) ids.set(el.attrs.id, el);
    if (local(el) === 'style') rules = rules.concat(parseCss(el.text, order));
    el.children.forEach(index);
  };
  index(root);
  rules.sort((a, b) => a.spec - b.spec || a.order - b.order);

  const ownStyle = (el: XmlElement): Style => {
    const s: Style = {};
    for (const [k, v] of Object.entries(el.attrs)) if (PROPS.has(k)) s[k] = v.trim();
    const classes = (el.attrs.class || '').split(/\s+/).filter(Boolean);
    for (const r of rules) {
      if (r.tag && r.tag !== local(el)) continue;
      if (r.ids.some((id) => id !== el.attrs.id)) continue;
      if (r.classes.some((c) => !classes.includes(c))) continue;
      Object.assign(s, r.decls);
    }
    if (el.attrs.style) Object.assign(s, parseDecls(el.attrs.style));
    return s;
  };

  const computed = (el: XmlElement, parent: Style): Style => {
    const own = ownStyle(el);
    const s: Style = {};
    for (const k of INHERITED) if (parent[k] !== undefined) s[k] = parent[k]!;
    for (const [k, v] of Object.entries(own)) {
      if (v === 'inherit') {
        if (parent[k] !== undefined) s[k] = parent[k]!;
      } else s[k] = v;
    }
    return s;
  };

  // Viewport stack for percentage lengths.
  const vpStack: Array<[number, number]> = [];
  const len = (v: string | undefined, axis: 'x' | 'y' | 'd', fallback = 0): number => {
    if (v === undefined || v === '') return fallback;
    const vp = vpStack[vpStack.length - 1] || [W, H];
    const t = v.trim();
    if (t.endsWith('%')) {
      const p = Number(t.slice(0, -1)) / 100;
      if (!Number.isFinite(p)) return fallback;
      const ref = axis === 'x' ? vp[0] : axis === 'y' ? vp[1] : Math.sqrt((vp[0] * vp[0] + vp[1] * vp[1]) / 2);
      return p * ref;
    }
    const n = lengthPx(t);
    return n === null ? fallback : n;
  };

  const viewBoxMatrix = (vb: number[], w: number, h: number, par: string | undefined): Mat => {
    const [vx, vy, vw, vh] = vb as [number, number, number, number];
    if (!(vw > 0 && vh > 0)) return IDENTITY;
    const parts = (par || 'xMidYMid meet').trim().split(/\s+/);
    const align = parts[0] || 'xMidYMid';
    let sx = w / vw;
    let sy = h / vh;
    if (align !== 'none') {
      const s = parts[1] === 'slice' ? Math.max(sx, sy) : Math.min(sx, sy);
      sx = sy = s;
    }
    let tx = -vx * sx;
    let ty = -vy * sy;
    if (align !== 'none') {
      if (align.includes('xMid')) tx += (w - vw * sx) / 2;
      else if (align.includes('xMax')) tx += w - vw * sx;
      if (align.includes('YMid')) ty += (h - vh * sy) / 2;
      else if (align.includes('YMax')) ty += h - vh * sy;
    }
    return [sx, 0, 0, sy, tx, ty];
  };

  const opacityOf = (v: string | undefined): number => {
    if (v === undefined) return 1;
    const n = v.trim().endsWith('%') ? Number(v.trim().slice(0, -1)) / 100 : Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
  };

  /** The id in url(#id) paint and clip references. */
  const refId = (v: string | undefined): string | null => {
    if (!v) return null;
    const m = /url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/.exec(v);
    return m ? m[1]! : null;
  };
  /** The id in href="#id" references. */
  const hrefId = (v: string | undefined): string | null => {
    const m = v ? /^\s*#(.+?)\s*$/.exec(v) : null;
    return m ? m[1]! : null;
  };

  const gradAttr = (g: XmlElement, name: string, seen = new Set<XmlElement>()): string | undefined => {
    if (g.attrs[name] !== undefined) return g.attrs[name];
    const href = hrefId(g.attrs.href || g.attrs['xlink:href']);
    const parent = href ? ids.get(href) : undefined;
    if (parent && !seen.has(parent)) {
      seen.add(parent);
      return gradAttr(parent, name, seen);
    }
    return undefined;
  };
  const gradStops = (g: XmlElement, seen = new Set<XmlElement>()): Stop[] => {
    const own = g.children.filter((c) => local(c) === 'stop');
    if (own.length) {
      let last = 0;
      return own.map((st) => {
        const s = { ...ownStyle(st) };
        const off = st.attrs.offset ?? '0';
        let o = off.trim().endsWith('%') ? Number(off.trim().slice(0, -1)) / 100 : Number(off);
        if (!Number.isFinite(o)) o = 0;
        o = Math.max(last, Math.min(1, Math.max(0, o)));
        last = o;
        const col = parseColor(s['stop-color'] || 'black') || [0, 0, 0, 1];
        return { offset: o, color: [col[0], col[1], col[2], col[3] * opacityOf(s['stop-opacity'])] as [number, number, number, number] };
      });
    }
    const href = hrefId(g.attrs.href || g.attrs['xlink:href']);
    const parent = href ? ids.get(href) : undefined;
    if (parent && !seen.has(parent)) {
      seen.add(parent);
      return gradStops(parent, seen);
    }
    return [];
  };

  const resolvePaint = (value: string | undefined, style: Style, ctm: Mat, bbox: [number, number, number, number], opacity: number): Paint | null => {
    if (!value || value === 'none') return null;
    const id = refId(value);
    if (id) {
      const g = ids.get(id);
      const kind = g ? local(g) : '';
      if (g && (kind === 'linearGradient' || kind === 'radialGradient')) {
        const stops = gradStops(g);
        if (!stops.length) return null;
        if (stops.length === 1) {
          const c = stops[0]!.color;
          return { kind: 'solid', color: [c[0], c[1], c[2], c[3] * opacity] };
        }
        const adj = stops.map((s) => ({ offset: s.offset, color: [s.color[0], s.color[1], s.color[2], s.color[3] * opacity] as [number, number, number, number] }));
        const lut = buildLut(adj);
        const userSpace = gradAttr(g, 'gradientUnits') === 'userSpaceOnUse';
        let m = ctm;
        if (!userSpace) {
          const [bx, by, bw, bh] = bbox;
          if (bw === 0 || bh === 0) return null;
          m = mul(m, [bw, 0, 0, bh, bx, by]);
        }
        m = mul(m, parseTransform(gradAttr(g, 'gradientTransform')));
        const inv = invert(m);
        const spread = gradAttr(g, 'spreadMethod') || 'pad';
        const gl = (name: string, axis: 'x' | 'y' | 'd', def: string): number => {
          const v = gradAttr(g, name) ?? def;
          if (!userSpace) {
            const t = v.trim();
            return t.endsWith('%') ? Number(t.slice(0, -1)) / 100 : Number(t) || 0;
          }
          return len(v, axis);
        };
        if (kind === 'linearGradient') {
          return { kind: 'gradient', lut, inv, spread, radial: false, x1: gl('x1', 'x', '0%'), y1: gl('y1', 'y', '0%'), x2: gl('x2', 'x', '100%'), y2: gl('y2', 'y', '0%') };
        }
        const cx = gl('cx', 'x', '50%');
        const cy = gl('cy', 'y', '50%');
        const r = gl('r', 'd', '50%');
        const fx = gradAttr(g, 'fx') !== undefined ? gl('fx', 'x', '50%') : cx;
        const fy = gradAttr(g, 'fy') !== undefined ? gl('fy', 'y', '50%') : cy;
        return { kind: 'gradient', lut, inv, spread, radial: true, cx, cy, r, fx, fy };
      }
      if (g) warnings.add(`paint server <${kind}> is not supported`);
      // Fallback color after the url().
      const fb = value.replace(/url\([^)]*\)/, '').trim();
      return fb && !refId(fb) ? resolvePaint(fb, style, ctm, bbox, opacity) : null;
    }
    const raw = value === 'currentColor' || value === 'currentcolor' ? style.color || 'black' : value;
    const c = parseColor(raw);
    if (!c) return null;
    return { kind: 'solid', color: [c[0], c[1], c[2], c[3] * opacity] };
  };

  const shapeSegs = (el: XmlElement): Seg[] | null => {
    const a = el.attrs;
    switch (local(el)) {
      case 'path':
        return parsePath(a.d || '');
      case 'rect': {
        const x = len(a.x, 'x');
        const y = len(a.y, 'y');
        const w = len(a.width, 'x');
        const h = len(a.height, 'y');
        if (w <= 0 || h <= 0) return null;
        let rx = a.rx !== undefined && a.rx !== 'auto' ? len(a.rx, 'x') : NaN;
        let ry = a.ry !== undefined && a.ry !== 'auto' ? len(a.ry, 'y') : NaN;
        if (Number.isNaN(rx)) rx = Number.isNaN(ry) ? 0 : ry;
        if (Number.isNaN(ry)) ry = rx;
        rx = Math.min(Math.max(0, rx), w / 2);
        ry = Math.min(Math.max(0, ry), h / 2);
        if (rx === 0 || ry === 0) {
          return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
        }
        const k = 0.5522847498;
        return [
          ['M', x + rx, y],
          ['L', x + w - rx, y],
          ['C', x + w - rx + rx * k, y, x + w, y + ry - ry * k, x + w, y + ry],
          ['L', x + w, y + h - ry],
          ['C', x + w, y + h - ry + ry * k, x + w - rx + rx * k, y + h, x + w - rx, y + h],
          ['L', x + rx, y + h],
          ['C', x + rx - rx * k, y + h, x, y + h - ry + ry * k, x, y + h - ry],
          ['L', x, y + ry],
          ['C', x, y + ry - ry * k, x + rx - rx * k, y, x + rx, y],
          ['Z'],
        ];
      }
      case 'circle':
      case 'ellipse': {
        const cx = len(a.cx, 'x');
        const cy = len(a.cy, 'y');
        const rx = local(el) === 'circle' ? len(a.r, 'd') : len(a.rx, 'x');
        const ry = local(el) === 'circle' ? rx : len(a.ry, 'y');
        if (rx <= 0 || ry <= 0) return null;
        const k = 0.5522847498;
        return [
          ['M', cx + rx, cy],
          ['C', cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry],
          ['C', cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy],
          ['C', cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry],
          ['C', cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy],
          ['Z'],
        ];
      }
      case 'line':
        return [
          ['M', len(a.x1, 'x'), len(a.y1, 'y')],
          ['L', len(a.x2, 'x'), len(a.y2, 'y')],
        ];
      case 'polyline':
      case 'polygon': {
        const n = numbers(a.points || '');
        if (n.length < 4) return null;
        const segs: Seg[] = [['M', n[0]!, n[1]!]];
        for (let i = 2; i + 1 < n.length; i += 2) segs.push(['L', n[i]!, n[i + 1]!]);
        if (local(el) === 'polygon') segs.push(['Z']);
        return segs;
      }
    }
    return null;
  };

  const bboxOf = (segs: Seg[]): [number, number, number, number] => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const pts = flatten(segs, IDENTITY);
    for (const s of pts) {
      for (let i = 0; i < s.pts.length; i += 2) {
        x0 = Math.min(x0, s.pts[i]!);
        x1 = Math.max(x1, s.pts[i]!);
        y0 = Math.min(y0, s.pts[i + 1]!);
        y1 = Math.max(y1, s.pts[i + 1]!);
      }
    }
    return Number.isFinite(x0) ? [x0, y0, x1 - x0, y1 - y0] : [0, 0, 0, 0];
  };

  const scaleOf = (m: Mat): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

  /** Coverage of a clipPath element in device space, or undefined. */
  const clipMask = (value: string | undefined, ctm: Mat, bbox: () => [number, number, number, number], depth: number): Float32Array | undefined => {
    const id = refId(value);
    if (!id) return undefined;
    const cp = ids.get(id);
    if (!cp || local(cp) !== 'clipPath') {
      warnings.add('clip-path that is not a <clipPath> element is ignored');
      return undefined;
    }
    let m = mul(ctm, parseTransform(cp.attrs.transform));
    if (cp.attrs.clipPathUnits === 'objectBoundingBox') {
      const [bx, by, bw, bh] = bbox();
      m = mul(m, [bw, 0, 0, bh, bx, by]);
    }
    const mask = new Float32Array(W * H);
    const addShape = (el: XmlElement, mm: Mat, parentStyle: Style): void => {
      const s = computed(el, parentStyle);
      if (s.display === 'none') return;
      const tm = mul(mm, parseTransform(el.attrs.transform));
      let target = el;
      let um = tm;
      if (local(el) === 'use') {
        const ref = ids.get(hrefId(el.attrs.href || el.attrs['xlink:href']) || '');
        if (!ref) return;
        target = ref;
        um = mul(tm, [1, 0, 0, 1, len(el.attrs.x, 'x'), len(el.attrs.y, 'y')]);
        um = mul(um, parseTransform(ref.attrs.transform));
      }
      const segs = shapeSegs(target);
      if (!segs) return;
      const rule = (computed(target, s)['clip-rule'] || 'nonzero') === 'evenodd';
      const c = coverage(flatten(segs, um), W, H, rule);
      for (let i = 0; i < mask.length; i++) mask[i] = Math.min(1, mask[i]! + c[i]! * (1 - mask[i]!));
    };
    for (const child of cp.children) addShape(child, m, {});
    // A clipPath can itself be clipped.
    if (depth < 4 && cp.attrs['clip-path']) {
      const outer = clipMask(cp.attrs['clip-path'], ctm, bbox, depth + 1);
      if (outer) for (let i = 0; i < mask.length; i++) mask[i]! *= outer[i]!;
    }
    return mask;
  };

  const drawImage = (layer: Layer, el: XmlElement, ctm: Mat, opacity: number): void => {
    const href = el.attrs.href || el.attrs['xlink:href'] || '';
    const m = /^data:image\/png;base64,(.*)$/s.exec(href.trim());
    if (!m) {
      warnings.add('<image> is only supported with an embedded PNG data URL');
      return;
    }
    let img: RGBAImage;
    try {
      img = decodePng(new Uint8Array(Buffer.from(m[1]!.replace(/\s+/g, ''), 'base64')));
    } catch {
      warnings.add('an embedded PNG could not be decoded');
      return;
    }
    const x = len(el.attrs.x, 'x');
    const y = len(el.attrs.y, 'y');
    const w = el.attrs.width ? len(el.attrs.width, 'x') : img.width;
    const h = el.attrs.height ? len(el.attrs.height, 'y') : img.height;
    const fit = viewBoxMatrix([0, 0, img.width, img.height], w, h, el.attrs.preserveAspectRatio);
    const m2 = mul(mul(ctm, [1, 0, 0, 1, x, y]), fit);
    const inv = invert(m2);
    const cov = coverage(flatten([['M', 0, 0], ['L', img.width, 0], ['L', img.width, img.height], ['L', 0, img.height], ['Z']], m2), W, H, false);
    for (let i = 0; i < cov.length; i++) {
      const c = cov[i]!;
      if (!c) continue;
      const [ix, iy] = apply(inv, (i % W) + 0.5, Math.floor(i / W) + 0.5);
      // Bilinear sample, premultiplied.
      const fx = Math.min(img.width - 1, Math.max(0, ix - 0.5));
      const fy = Math.min(img.height - 1, Math.max(0, iy - 0.5));
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(img.width - 1, x0 + 1);
      const y1 = Math.min(img.height - 1, y0 + 1);
      const tx = fx - x0;
      const ty = fy - y0;
      const acc = [0, 0, 0, 0];
      const corners: Array<[number, number, number]> = [
        [x0, y0, (1 - tx) * (1 - ty)],
        [x1, y0, tx * (1 - ty)],
        [x0, y1, (1 - tx) * ty],
        [x1, y1, tx * ty],
      ];
      for (const [cx, cy, wt] of corners) {
        const o = (cy * img.width + cx) * 4;
        const a = (img.data[o + 3]! / 255) * wt;
        acc[0]! += (img.data[o]! / 255) * a;
        acc[1]! += (img.data[o + 1]! / 255) * a;
        acc[2]! += (img.data[o + 2]! / 255) * a;
        acc[3]! += a;
      }
      const k = c * opacity;
      const sa = acc[3]! * k;
      if (!sa) continue;
      const o = i * 4;
      const inv2 = 1 - sa;
      layer.data[o] = acc[0]! * k + layer.data[o]! * inv2;
      layer.data[o + 1] = acc[1]! * k + layer.data[o + 1]! * inv2;
      layer.data[o + 2] = acc[2]! * k + layer.data[o + 2]! * inv2;
      layer.data[o + 3] = sa + layer.data[o + 3]! * inv2;
    }
  };

  const render = (el: XmlElement, layer: Layer, ctm: Mat, parent: Style, depth: number): void => {
    if (depth > 64) return;
    const name = local(el);
    if (['defs', 'style', 'title', 'desc', 'metadata', 'linearGradient', 'radialGradient', 'clipPath', 'symbol', 'stop', 'script'].includes(name)) return;
    if (name === 'text' || name === 'tspan' || name === 'textPath') {
      warnings.add('<text> is not rendered: convert text to paths (outline it) in your editor');
      return;
    }
    if (['mask', 'pattern', 'filter', 'foreignObject', 'marker', 'switch'].includes(name)) {
      warnings.add(`<${name}> is not supported and was skipped`);
      return;
    }
    const style = computed(el, parent);
    if (style.display === 'none') return;
    if (style.mask && style.mask !== 'none') warnings.add('masks are not supported and were ignored');
    if (style.filter && style.filter !== 'none') warnings.add('filters are not supported and were ignored');
    let m = mul(ctm, parseTransform(el.attrs.transform));
    const opacity = opacityOf(style.opacity);
    const clip = style['clip-path'] && style['clip-path'] !== 'none' ? style['clip-path'] : undefined;
    const isolate = opacity < 1 || clip !== undefined;
    const target = isolate ? new Layer(W, H) : layer;
    let bboxFn: () => [number, number, number, number] = () => [0, 0, W, H];

    if (name === 'svg' || name === 'g' || name === 'a') {
      let pushed = false;
      if (name === 'svg' && depth > 0) {
        const x = len(el.attrs.x, 'x');
        const y = len(el.attrs.y, 'y');
        const w = len(el.attrs.width, 'x', vpStack[vpStack.length - 1]?.[0] ?? W);
        const h = len(el.attrs.height, 'y', vpStack[vpStack.length - 1]?.[1] ?? H);
        m = mul(m, [1, 0, 0, 1, x, y]);
        const vb = numbers(el.attrs.viewBox || '');
        if (vb.length === 4) {
          m = mul(m, viewBoxMatrix(vb, w, h, el.attrs.preserveAspectRatio));
          vpStack.push([vb[2]!, vb[3]!]);
        } else vpStack.push([w, h]);
        pushed = true;
      }
      for (const child of el.children) render(child, target, m, style, depth + 1);
      if (pushed) vpStack.pop();
    } else if (name === 'use') {
      const ref = ids.get(hrefId(el.attrs.href || el.attrs['xlink:href']) || '');
      if (!ref) {
        if (el.attrs.href || el.attrs['xlink:href']) warnings.add('<use> pointing outside the file is not supported');
      } else {
        const um = mul(m, [1, 0, 0, 1, len(el.attrs.x, 'x'), len(el.attrs.y, 'y')]);
        if (local(ref) === 'symbol' || local(ref) === 'svg') {
          const vb = numbers(ref.attrs.viewBox || '');
          const w = len(el.attrs.width || ref.attrs.width || '100%', 'x');
          const h = len(el.attrs.height || ref.attrs.height || '100%', 'y');
          const sm = vb.length === 4 ? mul(um, viewBoxMatrix(vb, w, h, ref.attrs.preserveAspectRatio)) : um;
          if (vb.length === 4) vpStack.push([vb[2]!, vb[3]!]);
          const symStyle = computed(ref, style);
          for (const child of ref.children) render(child, target, sm, symStyle, depth + 1);
          if (vb.length === 4) vpStack.pop();
        } else {
          render(ref, target, um, style, depth + 1);
        }
      }
    } else if (name === 'image') {
      drawImage(target, el, m, 1);
    } else {
      const segs = shapeSegs(el);
      if (segs && segs.length && style.visibility !== 'hidden' && style.visibility !== 'collapse') {
        const bbox = bboxOf(segs);
        bboxFn = () => {
          const [bx, by, bw, bh] = bbox;
          return [bx, by, bw, bh];
        };
        const subs = flatten(segs, m);
        const fill = resolvePaint(style.fill ?? 'black', style, m, bbox, opacityOf(style['fill-opacity']));
        if (fill) {
          const cov = coverage(subs, W, H, (style['fill-rule'] || 'nonzero') === 'evenodd');
          target.fill(cov, fill, 1);
        }
        const strokePaint = resolvePaint(style.stroke, style, m, bbox, opacityOf(style['stroke-opacity']));
        const sw = len(style['stroke-width'] ?? '1', 'd', 1);
        if (strokePaint && sw > 0) {
          const scale = scaleOf(m);
          const dash = (style['stroke-dasharray'] && style['stroke-dasharray'] !== 'none' ? numbers(style['stroke-dasharray']) : []).map((d) => Math.max(0, d) * scale);
          const fullDash = dash.length % 2 ? [...dash, ...dash] : dash;
          const polys = strokePolys(subs, {
            width: sw * scale,
            cap: style['stroke-linecap'] || 'butt',
            join: style['stroke-linejoin'] || 'miter',
            miter: Number(style['stroke-miterlimit']) || 4,
            dash: fullDash.some((d) => d > 0) ? fullDash : [],
            dashOffset: (Number(style['stroke-dashoffset']) || 0) * scale,
          });
          const cov = coverage(polys, W, H, false);
          target.fill(cov, strokePaint, 1);
        }
      }
    }

    if (isolate) {
      const mask = clip ? clipMask(clip, m, bboxFn, 0) : undefined;
      layer.draw(target, opacity, mask);
    }
  };

  // Root viewport.
  const vb = numbers(root.attrs.viewBox || '');
  const size = svgSize(src);
  const box = vb.length === 4 && vb[2]! > 0 && vb[3]! > 0 ? vb : [0, 0, size.width, size.height];
  const rootM = viewBoxMatrix(box, W, H, root.attrs.preserveAspectRatio);
  vpStack.push([box[2]!, box[3]!]);
  const layer = new Layer(W, H);
  const rootStyle = computed(root, {});
  for (const child of root.children) render(child, layer, rootM, rootStyle, 1);
  const rootOpacity = opacityOf(rootStyle.opacity);
  let out = layer;
  if (rootOpacity < 1) {
    out = new Layer(W, H);
    out.draw(layer, rootOpacity);
  }
  return { image: out.toImage(), warnings: [...warnings] };
}

function local(el: XmlElement): string {
  return el.name.replace(/^.*:/, '');
}
