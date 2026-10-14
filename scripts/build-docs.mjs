// Builds the docs site in docs/ from the sources in site/.
//   site/*.mjs          layout, home, generator, docs, guide templates, UI icons
//   site/guides/*.html  guide sources: a meta comment, then prose sections
//   site/static/*       site.css, site.js and generator.js, copied as is
// Terminal output on the pages is real: the build runs the installkite CLI
// (dist/cli.js) on scripts/fixture/acme-bakery. Code samples are highlighted
// at build time with Shiki (light-plus and dark-plus). The site installs
// itself: its manifest, icons, offline page, head tags and service worker
// come from the installkite API.
// Usage: npm run build && npm run docs      (npm run docs:check to verify)
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DOC_SECTIONS, RECIPES, docsBody, docsJsonLd } from '../site/docs.mjs';
import { generatorBody, generatorJsonLd } from '../site/generator.mjs';
import { FAQ, homeBody, homeJsonLd } from '../site/home.mjs';
import { GUIDES, SITE, esc, page } from '../site/layout.mjs';
import { UPDATED, guideBody, guideJsonLd, indexBody, indexJsonLd, notFoundBody } from '../site/pages.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const docs = join(root, 'docs');
const check = process.argv.includes('--check');
const CLI = join(root, 'dist', 'cli.js');
if (!existsSync(CLI)) throw new Error('dist/ is missing: run npm run build first');
const ik = await import(pathToFileURL(join(root, 'dist', 'index.js')).href);

// Shiki: the local dev dependency, or a sibling checkout that has it installed.
async function loadShiki() {
  const require = createRequire(import.meta.url);
  for (const c of ['shiki', join(root, '..', 'graphemely', 'node_modules', 'shiki')]) {
    try {
      const resolved = c === 'shiki' ? require.resolve('shiki') : join(c, 'dist', 'index.mjs');
      if (c !== 'shiki' && !existsSync(resolved)) continue;
      return await import(c === 'shiki' ? 'shiki' : pathToFileURL(resolved).href);
    } catch {
      // try the next one
    }
  }
  throw new Error('shiki is not installed: npm install shiki, or keep a sibling graphemely checkout');
}
const shiki = await loadShiki();
const LANGS = ['ts', 'js', 'tsx', 'json', 'html', 'css', 'bash', 'yaml', 'toml', 'php', 'blade', 'astro', 'text'];
const highlighter = await shiki.createHighlighter({ themes: ['light-plus', 'dark-plus'], langs: LANGS.filter((l) => l !== 'text') });

// ---------- Code frames ----------

const FILE_ICONS = {
  ts: ['#3178c6', 'TS'],
  tsx: ['#3178c6', 'TSX'],
  js: ['#c9a400', 'JS'],
  json: ['#8a6d00', 'J'],
  html: ['#e44d26', '<>'],
  css: ['#264de4', '#'],
  yaml: ['#cb171e', 'YML'],
  toml: ['#9c4221', 'TML'],
  php: ['#777bb4', 'PHP'],
  blade: ['#f05340', 'BL'],
  astro: ['#ff5d01', 'A'],
  bash: ['#3f8f4f', '$_'],
  text: ['#6b7280', '>_'],
};
export function fileIcon(lang) {
  const [color, label] = FILE_ICONS[lang] || FILE_ICONS.text;
  // JSON gets drawn braces: a brace in text would be read by Voodoo.
  if (lang === 'json') {
    return `<svg class="file-ic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect width="16" height="16" rx="3" fill="${color}"/><path d="M6.3 3.8c-1.4 0-1.9.7-1.9 1.9v1.2c0 .7-.4 1.1-1 1.1.6 0 1 .4 1 1.1v1.2c0 1.2.5 1.9 1.9 1.9M9.7 3.8c1.4 0 1.9.7 1.9 1.9v1.2c0 .7.4 1.1 1 1.1-.6 0-1 .4-1 1.1v1.2c0 1.2-.5 1.9-1.9 1.9" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/></svg>`;
  }
  const size = label.length > 2 ? 5 : 6.4;
  return `<svg class="file-ic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect width="16" height="16" rx="3" fill="${color}"/><text x="8" y="11" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#fff">${esc(label)}</text></svg>`;
}

let codeId = 0;
const copyIcon = '<svg class="ic" aria-hidden="true"><use href="#i-copy"/></svg>';
function frameShell(kind, lang, title, id, pre) {
  return `<figure class="frame frame-${kind}" data-lang="${lang}"><div class="frame-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="frame-tab">${fileIcon(kind === 'terminal' ? 'bash' : lang)}<span>${esc(title)}</span></span><button type="button" class="frame-copy" v-copy-from="#${id}" aria-label="Copy ${esc(title)}">${copyIcon}<span>Copy</span></button></div>${pre}</figure>`;
}

/** A VS Code style frame around Shiki output. kind: editor, terminal (lines get a $) or output. */
function frame(code, opts = {}) {
  const lang = opts.lang || 'text';
  const kind = opts.kind || 'editor';
  const title = opts.title || (kind === 'terminal' ? 'Terminal' : 'snippet');
  const html = highlighter.codeToHtml(code, {
    lang: lang === 'text' ? 'text' : lang,
    themes: { light: 'light-plus', dark: 'dark-plus' },
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          // Comment only and empty lines in terminals get no prompt.
          const text = code.split('\n')[line - 1] || '';
          if (kind === 'terminal' && (/^\s*#/.test(text) || !text.trim())) this.addClassToHast(node, 'cmt');
        },
      },
    ],
  });
  const inner = /<code>([\s\S]*)<\/code>/.exec(html)[1];
  const id = `code-${++codeId}`;
  const pre = ['shiki', opts.numbered ? 'numbered' : ''].filter(Boolean).join(' ');
  return frameShell(kind, lang, title, id, `<pre class="${pre}" tabindex="0"><code id="${id}">${inner}</code></pre>`);
}

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Replaces source code blocks in guide bodies with highlighted frames. */
function renderBlocks(body) {
  return body.replace(/<pre data-kind="(\w+)"([^>]*)>\n([\s\S]*?)\n<\/pre>/g, (_, kind, attrs, code) => {
    const attr = (name) => (new RegExp(`data-${name}="([^"]*)"`).exec(attrs) || [])[1];
    return frame(unescape(code), { kind, lang: attr('lang') || 'text', title: attr('title'), numbered: /data-numbered/.test(attrs) });
  });
}

// ---------- ANSI terminal output ----------

const FG = { 30: 'k', 31: 'r', 32: 'g', 33: 'y', 34: 'b', 35: 'm', 36: 'c', 37: 'w', 90: 'k2' };
const EXT = { 39: 'sky', 209: 'sunset' };

function ansiToHtml(text) {
  const st = { b: false, d: false, fg: '' };
  const lines = [];
  for (const raw of text.replace(/\r/g, '').replace(/\n+$/, '').split('\n')) {
    let out = '';
    const re = /\u001b\[([0-9;]*)m/g;
    let last = 0;
    let m;
    const flush = (chunk) => {
      if (!chunk) return;
      const cls = [st.b && 'a-b', st.d && 'a-d', st.fg && `f-${st.fg}`].filter(Boolean).join(' ');
      out += cls ? `<span class="${cls}">${esc(chunk)}</span>` : esc(chunk);
    };
    while ((m = re.exec(raw))) {
      flush(raw.slice(last, m.index));
      last = re.lastIndex;
      const parts = (m[1] || '0').split(';').map(Number);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === 0) Object.assign(st, { b: false, d: false, fg: '' });
        else if (p === 1) st.b = true;
        else if (p === 2) st.d = true;
        else if (p === 22) st.b = st.d = false;
        else if (p === 38 && parts[i + 1] === 5) {
          st.fg = EXT[parts[i + 2]] || '';
          i += 2;
        } else if (FG[p]) st.fg = FG[p];
        else if (p === 39) st.fg = '';
      }
    }
    flush(raw.slice(last));
    lines.push(out);
  }
  return lines.join('\n');
}

function termFrame(ansi, title) {
  const id = `code-${++codeId}`;
  return frameShell('output', 'text', title, id, `<pre class="term-out" tabindex="0"><code id="${id}">${ansiToHtml(ansi)}</code></pre>`);
}

// ---------- Real CLI runs on the fixture ----------

const fixture = join(root, 'scripts', 'fixture', 'acme-bakery');
function freshFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'installkite-docs-'));
  cpSync(fixture, dir, { recursive: true });
  return dir;
}
function cli(cwd, args, color = true) {
  const r = spawnSync(process.execPath, [CLI, ...args, ...(color ? ['--color'] : ['--no-color'])], { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: color ? '' : '1' } });
  return (r.stdout || '') + (r.stderr || '');
}
const tmpDirs = [];
const site = freshFixture();
tmpDirs.push(site);
const doctorBefore = cli(site, ['doctor']);
const initOut = cli(site, ['init', '--yes']);
const doctorAfter = cli(site, ['doctor']);
const doctorJson = JSON.parse(cli(site, ['doctor', '--json'], false));
const dryDir = freshFixture();
tmpDirs.push(dryDir);
const dryOut = cli(dryDir, ['init', '--yes', '--dry-run', '--no-screenshots'], false);
const iconDir = freshFixture();
tmpDirs.push(iconDir);
const iconsOut = cli(iconDir, ['icons', 'logo.svg', '--out', 'public']);
const initPlain = ansiStrip(initOut);
function ansiStrip(s) {
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}
const initFiles = [...initPlain.matchAll(/^\s+(create|update|same)\s+(\S+)\s+([\d.]+ (?:B|kB|MB))\s+(.*)$/gm)].map((m) => ({ path: m[2], size: m[3], note: m[4].trim() }));
if (initFiles.length < 20) throw new Error(`could not read the init file list:\n${initPlain}`);
const configSample = readFileSync(join(site, 'installkite.config.json'), 'utf8').trim();
const swLines = readFileSync(join(site, 'sw.js'), 'utf8').split('\n');
const settings = JSON.parse(/self\.__INSTALLKITE__ = (\{.*\});/.exec(swLines[2])[1]);
const swSample = [
  swLines[0],
  swLines[1],
  'self.__INSTALLKITE__ = {',
  `  "version": "${settings.version}",`,
  '  "precache": [',
  ...settings.precache.slice(0, 4).map((e) => `    ${JSON.stringify(e)},`),
  `    /* ${settings.precache.length - 4} more files, each with its content hash */`,
  '  ]',
  '};',
  '/* the bundled strategies follow, about 7 kB */',
].join('\n');
// The dry run: the file list and the first diff (index.html), trimmed.
const dryLines = dryOut.split('\n');
const diffStart = dryLines.findIndex((l) => l.startsWith('--- a/about.html'));
const diffEnd = dryLines.findIndex((l, i) => i > diffStart && l.startsWith('--- a/') && !l.includes('about.html'));
const dryRun = ['$ npx installkite init --dry-run', ...dryLines.filter((l) => /^\s+(create|update)\s/.test(l)).slice(0, 6), '  ...', '', ...dryLines.slice(diffStart, diffEnd > 0 ? diffEnd : diffStart + 24)].join('\n').trimEnd();
const doctorExcerpt = JSON.stringify({ ...doctorJson, checks: doctorJson.checks.slice(0, 3) }, null, 2).replace(/\n {4}\}\n {2}\]/, '\n    },\n    "...": "one entry per rule"\n  ]');
for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });

const sizeOf = (file) => {
  const z = require2('node:zlib');
  return `${(z.gzipSync(readFileSync(join(root, 'dist', file)), { level: 9 }).length / 1024).toFixed(1)} kB`;
};
function require2(m) {
  return createRequire(import.meta.url)(m);
}
const sizes = { runtime: sizeOf('installkite.min.js'), sw: sizeOf('sw-runtime.js') };
const testCount = (() => {
  let n = 0;
  for (const f of readdirSync(join(root, 'test')).filter((x) => x.endsWith('.test.ts'))) n += (readFileSync(join(root, 'test', f), 'utf8').match(/^\s*it\(/gm) || []).length;
  return n;
})();

// ---------- Guides ----------

const guides = readdirSync(join(root, 'site', 'guides'))
  .filter((f) => f.endsWith('.html'))
  .map((f) => {
    const src = readFileSync(join(root, 'site', 'guides', f), 'utf8');
    const m = /^<!--meta\n([\s\S]*?)\n-->\n([\s\S]*)$/.exec(src);
    if (!m) throw new Error(`site/guides/${f}: missing meta comment`);
    const meta = JSON.parse(m[1]);
    const words = m[2].replace(/<pre[\s\S]*?<\/pre>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    if (words < 600) throw new Error(`site/guides/${f}: ${words} words, a guide needs 600 or more`);
    return { meta, body: m[2], words };
  });
for (const g of GUIDES) if (!guides.find((x) => x.meta.slug === g.slug)) throw new Error(`missing guide source ${g.slug}`);

// ---------- Pages ----------

const out = {};
const runtimeApi = `// installkite.js from the script tag defines window.installkite.
// With a bundler: import installkite from 'installkite/runtime'; installkite.init();

installkite.on('installable', () => {
  document.querySelector('#install').hidden = false;
});

document.querySelector('#install').addEventListener('click', async () => {
  const outcome = await installkite.install(); // accepted, dismissed, instructions (iOS)
  console.log('install:', outcome);
});

installkite.on('installed', () => console.log('Welcome to the home screen'));
installkite.on('update', ({ apply }) => showMyBanner('New version', apply));
installkite.on('offline', () => document.body.classList.add('is-offline'));
installkite.on('online', () => document.body.classList.remove('is-offline'));

// Save pages for offline reading.
await installkite.cache(['/articles/one/', '/articles/two/']);`;
const nodeApi = `import { applyPlan, doctorLocal, generateIcons, loadIconSource, planBuild, planInit } from 'installkite';
import { readFileSync } from 'node:fs';

// The same as npx installkite init --yes, from a script.
const plan = planInit(process.cwd(), { name: 'Acme Bakery', themeColor: '#e8590c', postbuild: false });
for (const file of plan.files) if (file.diff) console.log(file.diff);
applyPlan(process.cwd(), plan.files);

// After a site build:
applyPlan(process.cwd(), planBuild(process.cwd()).files);

// Only the icons, in memory:
const source = loadIconSource(readFileSync('logo.svg'), 'logo.svg');
const { files } = generateIcons(source, { background: '#ffffff' });

const report = await doctorLocal(process.cwd());
if (!report.installable) process.exitCode = 1;`;

const frames = {
  init: termFrame(`$ npx installkite init --yes\n${initOut}`, 'npx installkite init --yes'),
  doctorBefore: termFrame(`$ npx installkite doctor\n${doctorBefore}`, 'before: npx installkite doctor'),
  doctorAfter: termFrame(`$ npx installkite doctor\n${doctorAfter}`, 'after: npx installkite doctor'),
  sw: frame(swSample, { lang: 'js', title: 'sw.js' }),
  runtime: frame('<script src="/installkite.js" data-sw="/sw.js" data-install="auto" data-offline="badge" defer></script>\n\n<button data-installkite-install hidden>Install the app</button>', { lang: 'html', title: 'index.html' }),
  icons: termFrame(`$ npx installkite icons logo.svg --out public\n${iconsOut}`, 'npx installkite icons'),
};

codeId = 0;
out['index.html'] = page(
  {
    kind: 'home',
    path: '',
    nav: '',
    title: 'installkite: make any website installable and offline (PWA in one line)',
    description: 'Make any website installable and offline capable with one command: web app manifest, every PWA icon size, service worker, offline page and an install button.',
    jsonld: homeJsonLd(),
  },
  homeBody({ guides, frames, initFiles, sizes, tests: testCount }),
);

codeId = 100;
out['generator.html'] = page(
  {
    kind: 'generator',
    path: 'generator.html',
    nav: 'generator',
    title: 'Free PWA manifest and icon generator (maskable, favicon, iOS)',
    description: 'Generate a web app manifest and every PWA icon size in your browser: maskable icons with safe zone preview, apple-touch-icon, favicon.ico, zip download.',
    jsonld: generatorJsonLd(),
    scripts: ['generator.js'],
  },
  generatorBody({ frames, fileIcon }),
);

codeId = 200;
out['docs.html'] = page(
  {
    kind: 'docs',
    path: 'docs.html',
    nav: 'docs',
    title: 'installkite docs: CLI, runtime, service worker and recipes',
    description: 'Every installkite command and flag, the config file, the install runtime API, service worker strategies, doctor rules and recipes for Vite, Next.js, Astro and more.',
    jsonld: docsJsonLd(),
  },
  docsBody({ frame, dryRun, doctorJson: doctorExcerpt, configSample, swSample, runtimeApi, nodeApi }),
);

for (const g of guides) {
  codeId = 0;
  out[`${g.meta.slug}.html`] = page(
    { kind: 'guide', path: `${g.meta.slug}.html`, nav: 'guides', ogType: 'article', title: g.meta.title, description: g.meta.description, jsonld: guideJsonLd(g.meta) },
    guideBody({ ...g, body: renderBlocks(g.body) }, guides),
  );
}

out['guides.html'] = page(
  {
    kind: 'index',
    path: 'guides.html',
    nav: 'guides',
    title: 'PWA guides: installable websites, offline pages and icons',
    description: 'Guides to make a website installable: manifest fields, PWA icon sizes, service worker offline pages, iOS Add to Home Screen and GitHub Pages.',
    jsonld: indexJsonLd(guides),
  },
  indexBody(guides),
);

// The 404 page is served at any missing path, so its links are rooted.
// Only plain attributes: Voodoo bindings such as :href hold expressions, not URLs.
const rootLinks = (html) => html.replace(/(\s)(href|src)="(?![a-z]+:|#|\/)([^"]*)"/g, (_, s, a, v) => `${s}${a}="/installkite/${v.replace(/^\.\//, '')}"`);
out['404.html'] = rootLinks(
  page(
    { kind: 'notfound', path: '404.html', noindex: true, title: 'Page not found | installkite', description: 'This page could not be found. Skye drifted off course. Head back to installkite.' },
    notFoundBody(),
  ),
);

// ---------- The site installs itself (dogfooding the installkite API) ----------

const files = {};
const source = ik.loadIconSource(readFileSync(join(root, 'assets', 'mascot-head.svg')), 'mascot-head.svg');
const iconSet = ik.generateIcons(source, { background: '#e6f5ff', themeColor: '#2b8ff0' });
for (const f of iconSet.files) files[f.path] = f.bytes;
const shots = ['screenshot-wide.png', 'screenshot-narrow.png'].filter((f) => existsSync(join(docs, 'assets', f)));
const manifest = ik.generateManifest({
  name: 'installkite',
  shortName: 'installkite',
  description: 'Make any website installable and offline capable with one line.',
  lang: 'en',
  themeColor: '#2b8ff0',
  backgroundColor: '#ffffff',
  icons: iconSet.files,
  categories: ['developer', 'productivity'],
  shortcuts: [
    { name: 'Icon generator', url: './generator.html' },
    { name: 'Docs', url: './docs.html' },
    { name: 'Guides', url: './guides.html' },
  ],
  screenshots: shots.map((f) => ({ src: `assets/${f}`, sizes: f.includes('wide') ? '1280x720' : '720x1280', type: 'image/png', form_factor: f.includes('wide') ? 'wide' : 'narrow', label: 'installkite home page' })),
});
files['manifest.webmanifest'] = ik.stringifyManifest(manifest);
const icon96 = iconSet.files.find((f) => f.path === 'icons/icon-96.png');
files['offline.html'] = ik.generateOfflinePage({ name: 'installkite', themeColor: '#2b8ff0', backgroundColor: '#ffffff', icon: `data:image/png;base64,${Buffer.from(icon96.bytes).toString('base64')}` });
files['installkite.js'] = readFileSync(join(root, 'dist', 'installkite.min.js'), 'utf8');
const headOpts = (base) => ({ base, appName: 'installkite', themeColor: '#2b8ff0', themeColorDark: '#0b1426', svgIcon: 'icons/icon.svg', runtime: 'installkite.js', sw: 'sw.js', runtimeAttrs: { offline: 'badge' } });
for (const [name, html] of Object.entries(out)) files[name] = ik.injectHead(html, headOpts(name === '404.html' ? '/installkite/' : './')).html;

// ---------- Search index, sitemap, schema ----------

const search = [];
search.push({ kind: 'Page', title: 'Live demo', sub: 'Install a site and go offline', url: './#demo' });
search.push({ kind: 'Page', title: 'Manifest and icon generator', sub: 'Drop a logo, download a zip', url: 'generator.html' });
search.push({ kind: 'Page', title: 'Docs', sub: 'CLI, config, runtime, service worker', url: 'docs.html' });
search.push({ kind: 'Page', title: 'Guides', sub: 'Every guide', url: 'guides.html' });
for (const [id, t] of DOC_SECTIONS) search.push({ kind: id.includes('init') || id.includes('build') || id.includes('doctor') ? 'Command' : 'Docs', title: t, sub: 'Docs', url: `docs.html#${id}` });
for (const r of RECIPES) search.push({ kind: 'Recipe', title: r.name, sub: 'Framework recipe', url: `docs.html#recipe-${r.id}` });
for (const g of GUIDES) {
  const src = guides.find((x) => x.meta.slug === g.slug);
  search.push({ kind: 'Guide', title: src.meta.h1, sub: src.meta.description, url: `${g.slug}.html` });
  for (const m of src.body.matchAll(/<section id="([^"]+)"><h2>([\s\S]*?)<\/h2>/g)) search.push({ kind: 'Section', title: m[2].replace(/<[^>]+>/g, ''), sub: g.short, url: `${g.slug}.html#${m[1]}` });
  for (const f of src.meta.faq) search.push({ kind: 'Question', title: f.q.replace(/<[^>]+>/g, ''), sub: g.short, url: `${g.slug}.html#faq` });
}
for (const [q] of FAQ) search.push({ kind: 'Question', title: q, sub: 'Home FAQ', url: './#faq' });

const urls = ['', 'generator.html', 'docs.html', 'guides.html', ...GUIDES.map((g) => `${g.slug}.html`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${UPDATED}</lastmod><changefreq>${u ? 'monthly' : 'weekly'}</changefreq><priority>${u === '' ? '1.0' : u.endsWith('generator.html') || u === 'docs.html' ? '0.9' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `${SITE}config.schema.json`,
  title: 'installkite.config.json',
  type: 'object',
  required: ['root', 'publicDir', 'base', 'icon', 'app'],
  properties: {
    $schema: { type: 'string' },
    root: { type: 'string', description: 'The deployed folder, precached by installkite build.' },
    publicDir: { type: 'string', description: 'Where generated files are written.' },
    base: { type: 'string', description: 'URL path the site is served under, like / or /repo/.' },
    relative: { type: 'boolean', description: 'Write relative URLs in head tags.' },
    url: { type: 'string', format: 'uri', description: 'Production URL, checked by doctor.' },
    icon: { type: 'string', description: 'Icon source image, or "monogram".' },
    iconsDir: { type: 'string', default: 'icons' },
    html: { type: 'array', items: { type: 'string' }, description: 'HTML files or globs that get head tags.' },
    app: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        shortName: { type: 'string', maxLength: 30 },
        description: { type: 'string' },
        lang: { type: 'string' },
        display: { enum: ['standalone', 'fullscreen', 'minimal-ui', 'browser'] },
        themeColor: { type: 'string' },
        themeColorDark: { type: 'string' },
        backgroundColor: { type: 'string' },
        startUrl: { type: 'string' },
        scope: { type: 'string' },
        orientation: { type: 'string' },
        categories: { type: 'array', items: { type: 'string' } },
        shortcuts: { type: 'array', items: { type: 'object', required: ['name', 'url'], properties: { name: { type: 'string' }, url: { type: 'string' }, description: { type: 'string' } } } },
        screenshots: { type: 'boolean' },
      },
    },
    runtime: {
      type: 'object',
      properties: {
        mode: { enum: ['local', 'cdn', 'none'] },
        installButton: { enum: ['auto', 'none'] },
        updateToast: { type: 'boolean' },
        offlineIndicator: { type: 'boolean' },
      },
    },
    sw: {
      type: 'object',
      properties: {
        offline: { type: ['string', 'null'] },
        navigationTimeout: { type: 'number' },
        imageMaxEntries: { type: 'number' },
        imageMaxAge: { type: 'number' },
        assetMaxEntries: { type: 'number' },
        pageMaxEntries: { type: 'number' },
        exclude: { type: 'array', items: { type: 'string' } },
        crossOrigin: { type: 'array', items: { type: 'string' } },
        skipWaiting: { type: 'boolean' },
        importScripts: { type: 'array', items: { type: 'string' } },
        include: { type: 'array', items: { type: 'string' } },
        maxFileSize: { type: 'number' },
      },
    },
    placeholders: { type: 'object', additionalProperties: { type: 'string' } },
  },
};

Object.assign(files, {
  'search.json': `${JSON.stringify(search)}\n`,
  'sitemap.xml': sitemap,
  'robots.txt': `User-agent: *\nAllow: /\nDisallow: /404.html\nDisallow: /offline.html\n\nSitemap: ${SITE}sitemap.xml\n`,
  'config.schema.json': `${JSON.stringify(schema, null, 2)}\n`,
  '.nojekyll': '',
  'site.css': readFileSync(join(root, 'site', 'static', 'site.css'), 'utf8'),
  'site.js': readFileSync(join(root, 'site', 'static', 'site.js'), 'utf8'),
  'generator.js': readFileSync(join(root, 'site', 'static', 'generator.js'), 'utf8'),
  'assets/mascot.svg': readFileSync(join(root, 'assets', 'mascot.svg'), 'utf8'),
  'assets/mascot-dark.svg': readFileSync(join(root, 'assets', 'mascot-dark.svg'), 'utf8'),
  'assets/mascot-head.svg': readFileSync(join(root, 'assets', 'mascot-head.svg'), 'utf8'),
});

// The service worker, over the final files.
const PRECACHE = /\.(html|css|js|webmanifest|svg)$|^icons\/icon-(192|512)\.png$|^favicon|^apple-touch-icon|^search\.json$/;
const entries = Object.entries(files)
  .filter(([name]) => PRECACHE.test(name) && name !== 'sw.js' && name !== '404.html')
  .map(([name, content]) => ({ url: name, revision: ik.revisionOf(content) }))
  .sort((a, b) => (a.url < b.url ? -1 : 1));
files['sw.js'] = ik.generateServiceWorker(entries, { navigationTimeout: 2500 }, { version: ik.VERSION });

// ---------- House rules ----------

const problems = [];
for (const [name, content] of Object.entries(files)) {
  if (typeof content !== 'string') continue;
  if (/[\u2013\u2014]/.test(content)) problems.push(`${name}: contains an en or em dash`);
  if (/\p{Extended_Pictographic}/u.test(content.replace(/[\u00a9\u00ae\u2122]/g, ''))) problems.push(`${name}: contains an emoji`);
  if (new RegExp(['tail', 'wind'].join(''), 'i').test(content)) problems.push(`${name}: names another CSS framework`);
  if (name.endsWith('.html') && name !== 'offline.html') {
    // Voodoo reads { expressions } in text, so braces must stay inside code.
    const text = content
      .replace(/<(script|style|pre|code|kbd|samp|textarea|template|noscript)\b[\s\S]*?<\/\1>/g, '')
      .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, '');
    const brace = /.{0,40}[{}].{0,40}/.exec(text);
    if (brace) problems.push(`${name}: braces outside code would be read by Voodoo: ${brace[0]}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

// ---------- Write, or check that docs/ is current ----------

const same = (name, content) => {
  const abs = join(docs, name);
  if (!existsSync(abs)) return false;
  const cur = readFileSync(abs);
  return cur.equals(Buffer.from(content));
};
if (check) {
  const stale = Object.entries(files).filter(([name, content]) => !same(name, content));
  if (stale.length) {
    console.error(`docs/ is out of date, run npm run docs:\n${stale.map(([n]) => `  ${n}`).join('\n')}`);
    process.exit(1);
  }
  console.log('docs/ is up to date');
} else {
  rmSync(join(docs, 'icons'), { recursive: true, force: true });
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(docs, name, '..'), { recursive: true });
    writeFileSync(join(docs, name), content);
  }
  const pages = Object.keys(out).length;
  console.log(`built ${pages} pages and ${Object.keys(files).length - pages} other files in docs/ (${guides.map((g) => `${g.meta.slug} ${g.words}w`).join(', ')})`);
}
