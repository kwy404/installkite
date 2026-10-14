// House rules for every tracked text file: no emoji or pictographs, no en
// or em dashes, and no names of other CSS frameworks. Code that needs such
// characters spells them as escapes (for example "\u" + "2014").
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const banned = [
  [0x1f000, 0x1faff, 'emoji'],
  [0x2600, 0x27bf, 'symbol or dingbat'],
  [0x2b00, 0x2bff, 'symbol'],
  [0xfe0f, 0xfe0f, 'emoji variation selector'],
  [0x2013, 0x2014, 'en or em dash'],
];
const words = [/tailwind/i, /bootstrap\s*css/i, /\bbulma\b/i];

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/\.(png|ico|jpe?g|gif|webp|woff2?)$/i.test(f) && f !== 'package-lock.json');

let problems = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  text.split('\n').forEach((line, index) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      const hit = banned.find(([from, to]) => cp >= from && cp <= to);
      if (hit) {
        problems++;
        console.error(`${file}:${index + 1}: U+${cp.toString(16).toUpperCase().padStart(4, '0')} (${hit[2]})`);
      }
    }
    for (const w of words) {
      if (w.test(line) && file !== 'scripts/check-chars.mjs') {
        problems++;
        console.error(`${file}:${index + 1}: names another CSS framework (${w.source})`);
      }
    }
  });
}
if (problems > 0) {
  console.error(`${problems} problem(s) found.`);
  process.exit(1);
}
console.log(`Checked ${files.length} files: no emoji, dashes or other framework names.`);
