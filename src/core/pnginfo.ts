// PNG signature and size, without decoding: no Node APIs, so the browser
// checker bundles it too.

export const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

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
