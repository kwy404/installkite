// Writes every SVG in assets/ from scripts/art.mjs: the mascot, the favicon,
// the README banner, the folded paper icon set and the workshop scenes, each
// in a light (dawn) and a dark (dusk) variant, and the seasonal art from
// scripts/season-art.mjs in assets/seasons/<id>/.
// Usage: node scripts/build-art.mjs
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_NAMES, SCENE_NAMES, banner, favicon, icon, mascot, mascotHead, scene } from './art.mjs';
import { SEASON_ICONS, SEASON_IDS, seasonAccent, seasonHead, seasonIcon, seasonMascot } from './season-art.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = (path, content) => {
  const abs = join(root, path);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
};

rmSync(join(root, 'assets', 'icons'), { recursive: true, force: true });
rmSync(join(root, 'assets', 'art'), { recursive: true, force: true });
rmSync(join(root, 'assets', 'seasons'), { recursive: true, force: true });
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
for (const name of SCENE_NAMES) {
  out(`assets/art/light/${name}.svg`, scene(name));
  out(`assets/art/dark/${name}.svg`, scene(name, { dark: true }));
}
let seasonal = 0;
for (const id of SEASON_IDS) {
  const dir = `assets/seasons/${id}`;
  out(`${dir}/skye.svg`, seasonMascot(id));
  out(`${dir}/skye-dark.svg`, seasonMascot(id, { dark: true }));
  out(`${dir}/head.svg`, seasonHead(id));
  out(`${dir}/accent.svg`, seasonAccent(id));
  out(`${dir}/accent-dark.svg`, seasonAccent(id, { dark: true }));
  seasonal += 5;
  for (const name of SEASON_ICONS[id]) {
    out(`${dir}/icon-${name}.svg`, seasonIcon(id, name));
    out(`${dir}/icon-${name}-dark.svg`, seasonIcon(id, name, { dark: true }));
    seasonal += 2;
  }
}
console.log(`wrote ${6 + ICON_NAMES.length * 2 + SCENE_NAMES.length * 2} SVG files to assets/ and ${seasonal} to assets/seasons/`);
