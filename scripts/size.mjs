// Sizes of the files installkite puts on a website, as visitors download
// them: raw, gzip and brotli.
import { readFileSync } from 'node:fs';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const kb = (n) => `${(n / 1024).toFixed(2)} kB`;
const rows = [
  ['installkite.min.js (runtime)', 'dist/installkite.min.js'],
  ['sw-runtime.js (service worker)', 'dist/sw-runtime.js'],
];
for (const [label, file] of rows) {
  const code = readFileSync(new URL(`../${file}`, import.meta.url));
  console.log(`${label.padEnd(32)} raw ${kb(code.length).padStart(9)}   gzip ${kb(gzipSync(code, { level: 9 }).length).padStart(8)}   brotli ${kb(brotliCompressSync(code).length).padStart(8)}`);
}
