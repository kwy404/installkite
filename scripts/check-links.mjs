// Crawls docs/: every internal href and src must point at a file that
// exists, and every #fragment at an element id on that page.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const pages = readdirSync(docs).filter((f) => f.endsWith('.html'));
const ids = new Map(pages.map((p) => [p, new Set([...readFileSync(join(docs, p), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const problems = [];
let checked = 0;
for (const page of pages) {
  const html = readFileSync(join(docs, page), 'utf8').replace(/<(pre|code|script)\b[\s\S]*?<\/\1>/g, '');
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let url = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|data:)/.test(url)) continue;
    checked++;
    const samePage = url.startsWith('#');
    url = url.replace(/^\/installkite\//, './');
    const [path, frag] = url.split('#');
    const file = samePage ? page : path === '' || path === './' ? 'index.html' : path.replace(/^\.\//, '');
    if (!existsSync(join(docs, file))) {
      problems.push(`${page}: ${m[1]} (missing file)`);
      continue;
    }
    if (frag && ids.has(file) && !ids.get(file).has(frag)) problems.push(`${page}: ${m[1]} (missing #${frag})`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`checked ${checked} internal links on ${pages.length} pages: none broken`);
