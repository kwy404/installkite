// A small PNG codec in pure TypeScript on top of node:zlib.
// Decodes every standard PNG (all color types, bit depths 1 to 16, palette
// transparency, Adam7 interlacing) to 8 bit RGBA, and encodes RGBA images
// with per row adaptive filtering.
import { deflateSync, inflateSync } from 'node:zlib';

/** An 8 bit RGBA image: `data` holds width * height * 4 bytes, not premultiplied. */
export interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 as used by PNG and ZIP. */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length, seed = 0): number {
  let c = ~seed >>> 0;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  return ~c >>> 0;
}

/** Creates a blank (transparent) image, or one filled with an RGBA color. */
export function createImage(width: number, height: number, fill?: [number, number, number, number]): RGBAImage {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new RangeError(`invalid image size ${width}x${height}`);
  }
  const data = new Uint8Array(width * height * 4);
  if (fill && fill[3] !== 0) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
    }
  }
  return { width, height, data };
}

/** True when the bytes start with the PNG signature. */
export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && SIGNATURE.every((b, i) => bytes[i] === b);
}

/** Reads width and height from the IHDR chunk without decoding the pixels. */
export function readPngSize(bytes: Uint8Array): { width: number; height: number } {
  if (!isPng(bytes) || bytes.length < 24) throw new Error('not a PNG file');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

interface Header {
  width: number;
  height: number;
  depth: number;
  colorType: number;
  interlace: number;
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Reverses the PNG row filters in place. `bpp` is bytes per complete pixel (at least 1). */
function unfilter(raw: Uint8Array, offset: number, rows: number, stride: number, bpp: number): Uint8Array {
  const out = new Uint8Array(rows * stride);
  let prev = new Uint8Array(stride);
  let pos = offset;
  for (let y = 0; y < rows; y++) {
    const type = raw[pos++];
    const line = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const v = raw[pos + x]!;
      const a = x >= bpp ? line[x - bpp]! : 0;
      const b = prev[x]!;
      const c = x >= bpp ? prev[x - bpp]! : 0;
      switch (type) {
        case 0:
          line[x] = v;
          break;
        case 1:
          line[x] = (v + a) & 0xff;
          break;
        case 2:
          line[x] = (v + b) & 0xff;
          break;
        case 3:
          line[x] = (v + ((a + b) >> 1)) & 0xff;
          break;
        case 4:
          line[x] = (v + paeth(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`invalid PNG filter type ${type}`);
      }
    }
    pos += stride;
    prev = line;
  }
  return out;
}

/** Decodes a PNG file to 8 bit RGBA. */
export function decodePng(bytes: Uint8Array): RGBAImage {
  if (!isPng(bytes)) throw new Error('not a PNG file');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;
  let header: Header | undefined;
  let palette: Uint8Array | undefined;
  let trns: Uint8Array | undefined;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(bytes[pos + 4]!, bytes[pos + 5]!, bytes[pos + 6]!, bytes[pos + 7]!);
    const body = bytes.subarray(pos + 8, pos + 8 + len);
    if (body.length !== len) throw new Error('truncated PNG chunk');
    if (type === 'IHDR') {
      header = {
        width: view.getUint32(pos + 8),
        height: view.getUint32(pos + 12),
        depth: body[8]!,
        colorType: body[9]!,
        interlace: body[12]!,
      };
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') trns = body;
    else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!header) throw new Error('PNG has no IHDR chunk');
  const { width, height, depth, colorType, interlace } = header;
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported PNG color type ${colorType}`);
  if (![1, 2, 4, 8, 16].includes(depth)) throw new Error(`unsupported PNG bit depth ${depth}`);
  if (colorType === 3 && !palette) throw new Error('palette PNG without a PLTE chunk');
  const total = idat.reduce((n, c) => n + c.length, 0);
  const joined = new Uint8Array(total);
  let off = 0;
  for (const c of idat) {
    joined.set(c, off);
    off += c.length;
  }
  const raw = new Uint8Array(inflateSync(joined));
  const bitsPerPixel = channels * depth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const out = createImage(width, height);
  const maxVal = (1 << depth) - 1;

  // Transparent color key for gray and RGB images.
  let keyGray = -1;
  let keyRgb: [number, number, number] | undefined;
  if (trns && colorType === 0 && trns.length >= 2) keyGray = (trns[0]! << 8) | trns[1]!;
  if (trns && colorType === 2 && trns.length >= 6) keyRgb = [(trns[0]! << 8) | trns[1]!, (trns[2]! << 8) | trns[3]!, (trns[4]! << 8) | trns[5]!];

  const passes: Array<[number, number, number, number]> = interlace
    ? [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
      ]
    : [[0, 0, 1, 1]];

  let rawPos = 0;
  for (const [x0, y0, dx, dy] of passes) {
    const pw = Math.ceil((width - x0) / dx);
    const ph = Math.ceil((height - y0) / dy);
    if (pw <= 0 || ph <= 0) continue;
    const stride = Math.ceil((pw * bitsPerPixel) / 8);
    const pixels = unfilter(raw, rawPos, ph, stride, bpp);
    rawPos += ph * (stride + 1);
    for (let y = 0; y < ph; y++) {
      const row = pixels.subarray(y * stride, (y + 1) * stride);
      const sample = (index: number): number => {
        if (depth === 8) return row[index]!;
        if (depth === 16) return (row[index * 2]! << 8) | row[index * 2 + 1]!;
        const bit = index * depth;
        return (row[bit >> 3]! >> (8 - depth - (bit & 7))) & maxVal;
      };
      const to8 = (v: number): number => (depth === 16 ? v >> 8 : depth === 8 ? v : Math.round((v * 255) / maxVal));
      for (let x = 0; x < pw; x++) {
        const o = ((y0 + y * dy) * width + (x0 + x * dx)) * 4;
        const s = x * channels;
        let r: number;
        let g: number;
        let b: number;
        let a = 255;
        if (colorType === 0) {
          const v = sample(s);
          r = g = b = to8(v);
          if (v === keyGray) a = 0;
        } else if (colorType === 2) {
          const rv = sample(s);
          const gv = sample(s + 1);
          const bv = sample(s + 2);
          r = to8(rv);
          g = to8(gv);
          b = to8(bv);
          if (keyRgb && rv === keyRgb[0] && gv === keyRgb[1] && bv === keyRgb[2]) a = 0;
        } else if (colorType === 3) {
          const i = sample(s);
          r = palette![i * 3] ?? 0;
          g = palette![i * 3 + 1] ?? 0;
          b = palette![i * 3 + 2] ?? 0;
          a = trns && i < trns.length ? trns[i]! : 255;
        } else if (colorType === 4) {
          r = g = b = to8(sample(s));
          a = to8(sample(s + 1));
        } else {
          r = to8(sample(s));
          g = to8(sample(s + 1));
          b = to8(sample(s + 2));
          a = to8(sample(s + 3));
        }
        out.data[o] = r;
        out.data[o + 1] = g;
        out.data[o + 2] = b;
        out.data[o + 3] = a;
      }
    }
  }
  return out;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out, 4, 8 + body.length));
  return out;
}

/** Encodes an RGBA image as a PNG (color type 6, or 2 when every pixel is opaque). */
export function encodePng(image: RGBAImage): Uint8Array {
  const { width, height, data } = image;
  if (data.length !== width * height * 4) throw new Error('image data does not match its size');
  let opaque = true;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) {
      opaque = false;
      break;
    }
  }
  const bpp = opaque ? 3 : 4;
  const stride = width * bpp;
  const rows = new Uint8Array(height * stride);
  for (let p = 0, q = 0; p < data.length; p += 4) {
    rows[q++] = data[p]!;
    rows[q++] = data[p + 1]!;
    rows[q++] = data[p + 2]!;
    if (!opaque) rows[q++] = data[p + 3]!;
  }
  // Pick the filter with the smallest sum of absolute values per row.
  const filtered = new Uint8Array(height * (stride + 1));
  const candidate = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const line = rows.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? rows.subarray((y - 1) * stride, y * stride) : undefined;
    let best = 0;
    let bestScore = Infinity;
    const target = filtered.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let type = 0; type <= 4; type++) {
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? line[x - bpp]! : 0;
        const b = prev ? prev[x]! : 0;
        const c = prev && x >= bpp ? prev[x - bpp]! : 0;
        const v = line[x]!;
        const f =
          type === 0 ? v : type === 1 ? v - a : type === 2 ? v - b : type === 3 ? v - ((a + b) >> 1) : v - paeth(a, b, c);
        const byte = f & 0xff;
        candidate[x] = byte;
        score += byte < 128 ? byte : 256 - byte;
      }
      if (score < bestScore) {
        bestScore = score;
        best = type;
        target.set(candidate);
      }
    }
    filtered[y * (stride + 1)] = best;
  }
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, width);
  hv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;
  const parts = [
    new Uint8Array(SIGNATURE),
    chunk('IHDR', ihdr),
    chunk('IDAT', new Uint8Array(deflateSync(filtered, { level: 9 }))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const size = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
