// favicon.ico writer: an ICO container holding PNG images, which every
// browser in use today reads.

/** Builds an .ico file from PNG encoded images of the given square sizes. */
export function encodeIco(images: Array<{ size: number; png: Uint8Array }>): Uint8Array {
  if (!images.length) throw new Error('an icon needs at least one image');
  const headerSize = 6 + 16 * images.length;
  const total = headerSize + images.reduce((n, i) => n + i.png.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach((img, i) => {
    if (img.size < 1 || img.size > 256) throw new RangeError(`ico images must be 1 to 256 pixels, got ${img.size}`);
    const e = 6 + i * 16;
    out[e] = img.size === 256 ? 0 : img.size; // width (0 means 256)
    out[e + 1] = img.size === 256 ? 0 : img.size; // height
    out[e + 2] = 0; // palette size
    out[e + 3] = 0; // reserved
    view.setUint16(e + 4, 1, true); // color planes
    view.setUint16(e + 6, 32, true); // bits per pixel
    view.setUint32(e + 8, img.png.length, true);
    view.setUint32(e + 12, offset, true);
    out.set(img.png, offset);
    offset += img.png.length;
  });
  return out;
}

/** Reads the image sizes listed in an .ico file. */
export function readIcoSizes(bytes: Uint8Array): number[] {
  if (bytes.length < 6) throw new Error('not an ICO file');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) throw new Error('not an ICO file');
  const count = view.getUint16(4, true);
  const sizes: number[] = [];
  for (let i = 0; i < count; i++) {
    const w = bytes[6 + i * 16];
    if (w === undefined) break;
    sizes.push(w === 0 ? 256 : w);
  }
  return sizes;
}
