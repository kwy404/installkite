// Writes every SVG in assets/ from scripts/art.mjs.
// Usage: node scripts/build-art.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_NAMES, banner, favicon, icon, mascot, mascotHead } from './art.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = (path, content) => {
  const abs = join(root, path);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
};

out('assets/mascot.svg', mascot());
out('assets/mascot-dark.svg', mascot({ rim: true }));
out('assets/mascot-head.svg', mascotHead());
out('assets/favicon.svg', favicon());
out('assets/banner.svg', banner());
out('assets/banner-dark.svg', banner({ dark: true }));
for (const name of ICON_NAMES) {
  out(`assets/icons/light/${name}.svg`, icon(name));
  out(`assets/icons/dark/${name}.svg`, icon(name, { dark: true }));
}
console.log(`wrote ${6 + ICON_NAMES.length * 2} SVG files to assets/`);
