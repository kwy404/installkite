import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32, createImage, decodePng, encodePng, isPng, readPngSize } from '../src/core/png.js';
import { encodeIco, readIcoSizes } from '../src/core/ico.js';

/** Builds a PNG by hand from raw scanlines (each row prefixed by filter type 0). */
function rawPng(width: number, height: number, depth: number, colorType: number, rows: number[][], extra: Array<[string, number[]]> = [], interlace = 0): Uint8Array {
  const chunk = (type: string, body: Uint8Array): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const td = Buffer.concat([Buffer.from(type, 'latin1'), Buffer.from(body)]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(new Uint8Array(td)));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;
  const raw = Buffer.concat(rows.map((r) => Buffer.from([0, ...r])));
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      ...extra.map(([t, b]) => chunk(t, new Uint8Array(b))),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', new Uint8Array()),
    ]),
  );
}

describe('png codec', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('roundtrips RGBA images exactly', () => {
    const img = createImage(37, 23);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 7919) % 256;
    const png = encodePng(img);
    expect(isPng(png)).toBe(true);
    expect(readPngSize(png)).toEqual({ width: 37, height: 23 });
    const back = decodePng(png);
    expect(back.width).toBe(37);
    expect(Buffer.from(back.data).equals(Buffer.from(img.data))).toBe(true);
  });

  it('writes opaque images as RGB (color type 2) and keeps the pixels', () => {
    const img = createImage(8, 8, [10, 20, 30, 255]);
    const png = encodePng(img);
    expect(png[25]).toBe(2);
    expect(decodePng(png).data.slice(0, 4)).toEqual(new Uint8Array([10, 20, 30, 255]));
  });

  it('decodes grayscale, gray alpha and 16 bit images', () => {
    const gray = decodePng(rawPng(2, 1, 8, 0, [[0, 255]]));
    expect([...gray.data]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
    const ga = decodePng(rawPng(1, 1, 8, 4, [[128, 64]]));
    expect([...ga.data]).toEqual([128, 128, 128, 64]);
    const deep = decodePng(rawPng(1, 1, 16, 2, [[0xff, 0x00, 0x80, 0x00, 0x00, 0xff]]));
    expect([...deep.data]).toEqual([255, 128, 0, 255]);
  });

  it('decodes palette images with tRNS and low bit depths', () => {
    // 4 pixels, 2 bits each: indices 0, 1, 2, 1.
    const png = rawPng(4, 1, 2, 3, [[0b00011001]], [
      ['PLTE', [255, 0, 0, 0, 255, 0, 0, 0, 255]],
      ['tRNS', [255, 0]],
    ]);
    const img = decodePng(png);
    expect([...img.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...img.data.slice(4, 8)]).toEqual([0, 255, 0, 0]);
    expect([...img.data.slice(8, 12)]).toEqual([0, 0, 255, 255]);
  });

  it('decodes 1 bit grayscale and a gray color key', () => {
    const img = decodePng(rawPng(3, 1, 1, 0, [[0b10100000]], [['tRNS', [0, 0]]]));
    expect(img.data[3]).toBe(255);
    expect(img.data[0]).toBe(255);
    expect(img.data[7]).toBe(0); // the black pixel matches the key
  });

  it('decodes Adam7 interlaced images', () => {
    // A 2x2 RGB interlaced image: pass 1 has (0,0), pass 6 (1,0), pass 7 row 1.
    const png = rawPng(2, 2, 8, 2, [], [], 1);
    // Build the IDAT for interlacing by hand.
    const passes = Buffer.concat([
      Buffer.from([0, 1, 2, 3]), // pass 1: pixel (0,0)
      Buffer.from([0, 4, 5, 6]), // pass 6: pixel (1,0)
      Buffer.from([0, 7, 8, 9, 10, 11, 12]), // pass 7: row 1
    ]);
    const idatAt = Buffer.from(png).indexOf('IDAT');
    const before = Buffer.from(png).subarray(0, idatAt - 4);
    const comp = deflateSync(passes);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(comp.length);
    const td = Buffer.concat([Buffer.from('IDAT'), comp]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(new Uint8Array(td)));
    const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
    const img = decodePng(new Uint8Array(Buffer.concat([before, len, td, crc, iend])));
    expect([...img.data]).toEqual([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
  });

  it('rejects files that are not PNG', () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow(/not a PNG/);
    expect(() => readPngSize(new TextEncoder().encode('<svg/>'))).toThrow();
    expect(() => createImage(0, 4)).toThrow(RangeError);
  });

  it('builds favicon.ico files that list their sizes', () => {
    const png = encodePng(createImage(16, 16, [0, 0, 0, 255]));
    const ico = encodeIco([
      { size: 16, png },
      { size: 32, png },
      { size: 256, png },
    ]);
    expect(readIcoSizes(ico)).toEqual([16, 32, 256]);
    expect(ico[6 + 32]).toBe(0); // 256 is written as 0
    expect(() => encodeIco([])).toThrow();
    expect(() => encodeIco([{ size: 300, png }])).toThrow(RangeError);
    expect(() => readIcoSizes(new Uint8Array([1, 0, 0, 0, 0, 0]))).toThrow();
  });
});
