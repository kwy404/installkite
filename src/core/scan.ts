// Site scanning: finds the HTML pages, reads the name, description,
// language and colors from the home page, finds a source image for the
// icons, and detects the framework, host and base path.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { decodeEntities } from './xml.js';
import { walk } from './files.js';

export type Framework = 'plain' | 'vite' | 'next' | 'astro' | 'wordpress' | 'laravel';
export type Host = 'github-pages' | 'netlify' | null;

export interface PageMeta {
  title?: string;
  description?: string;
  lang?: string;
  themeColor?: string;
  manifest?: string;
  icons: Array<{ rel: string; href: string; sizes?: string; type?: string }>;
  links: Array<{ href: string; text: string; inNav: boolean }>;
  hasViewport: boolean;
}

const attrRe = (name: string): RegExp => new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');

/** Reads one attribute from a start tag. */
export function getAttr(tag: string, name: string): string | undefined {
  const m = attrRe(name).exec(tag);
  if (!m) return undefined;
  return decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
}

const text = (s: string): string =>
  decodeEntities(s.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

/** Extracts what installkite needs from an HTML document. */
export function readPageMeta(html: string): PageMeta {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const head = /<head\b[\s\S]*?(?:<\/head>|<body\b)/i.exec(noComments)?.[0] ?? noComments;
  const meta: PageMeta = { icons: [], links: [], hasViewport: false };
  const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  if (t) meta.title = text(t[1]!) || undefined;
  const lang = /<html\b[^>]*>/i.exec(noComments);
  if (lang) meta.lang = getAttr(lang[0], 'lang') || undefined;
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const name = (getAttr(m[0], 'name') || getAttr(m[0], 'property') || '').toLowerCase();
    const content = getAttr(m[0], 'content');
    if (content === undefined) continue;
    if (name === 'description' && !meta.description) meta.description = content.trim();
    else if (name === 'og:description' && !meta.description) meta.description = content.trim();
    else if (name === 'og:site_name' && content.trim()) meta.title = meta.title && meta.title.length <= content.length ? meta.title : content.trim();
    else if (name === 'theme-color' && !meta.themeColor) {
      const media = getAttr(m[0], 'media') || '';
      if (!/dark/.test(media)) meta.themeColor = content.trim();
    } else if (name === 'viewport') meta.hasViewport = true;
  }
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (getAttr(m[0], 'rel') || '').toLowerCase().trim();
    const href = getAttr(m[0], 'href');
    if (!href) continue;
    if (rel === 'manifest') meta.manifest = href;
    else if (/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)(\s|$)/.test(rel)) {
      const icon: PageMeta['icons'][number] = { rel, href };
      const sizes = getAttr(m[0], 'sizes');
      const type = getAttr(m[0], 'type');
      if (sizes) icon.sizes = sizes;
      if (type) icon.type = type;
      meta.icons.push(icon);
    }
  }
  // Links, noting which sit inside <nav> or <header> (shortcut candidates).
  const navRanges: Array<[number, number]> = [];
  for (const m of noComments.matchAll(/<(nav|header)\b[\s\S]*?<\/\1>/gi)) navRanges.push([m.index!, m.index! + m[0].length]);
  for (const m of noComments.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = getAttr(`<a ${m[1]}>`, 'href');
    if (!href) continue;
    const at = m.index!;
    meta.links.push({ href, text: text(m[2]!), inNav: navRanges.some(([s, e]) => at >= s && at < e) });
  }
  return meta;
}

export interface ScanResult {
  /** The project folder (where installkite.config.json lives). */
  cwd: string;
  /** The deployed folder that gets precached, relative to cwd. */
  root: string;
  /** Where installkite writes static files (manifest, icons, sw.js), relative to cwd. */
  publicDir: string;
  /** HTML files installkite can inject tags into, relative to cwd. */
  htmlFiles: string[];
  framework: Framework;
  host: Host;
  /** The URL path the site is served under, like "/" or "/my-repo/". */
  base: string;
  /** Where the base came from, for messages. */
  baseSource?: string;
  name?: string;
  description?: string;
  lang?: string;
  themeColor?: string;
  /** Candidate source images for the icons, best first, relative to cwd. */
  iconCandidates: string[];
  /** Up to four internal pages linked from the home page navigation. */
  shortcuts: Array<{ name: string; url: string }>;
  /** True when a page already links a manifest that installkite did not write. */
  existingManifest?: string;
  hasViewport: boolean;
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function firstExisting(cwd: string, names: string[]): string | undefined {
  return names.find((n) => existsSync(join(cwd, n)));
}

function readConfigFile(cwd: string, names: string[]): string {
  const f = firstExisting(cwd, names);
  return f ? readFileSync(join(cwd, f), 'utf8') : '';
}

/** Detects the framework from project files. */
export function detectFramework(cwd: string): Framework {
  const pkg = readJson(join(cwd, 'package.json'));
  const deps = { ...((pkg?.dependencies as object) || {}), ...((pkg?.devDependencies as object) || {}) } as Record<string, string>;
  if (deps.next) return 'next';
  if (deps.astro) return 'astro';
  if (existsSync(join(cwd, 'artisan')) || existsSync(join(cwd, 'vendor', 'laravel'))) return 'laravel';
  const composer = readJson(join(cwd, 'composer.json'));
  if (composer && JSON.stringify(composer.require || {}).includes('laravel/framework')) return 'laravel';
  if (existsSync(join(cwd, 'wp-config.php')) || existsSync(join(cwd, 'wp-content'))) return 'wordpress';
  if (existsSync(join(cwd, 'style.css')) && /Theme Name:/i.test(readFileSync(join(cwd, 'style.css'), 'utf8').slice(0, 2000))) return 'wordpress';
  if (deps.vite || Object.keys(deps).some((d) => d.startsWith('@vitejs/')) || firstExisting(cwd, ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'])) return 'vite';
  return 'plain';
}

/** Folders per framework: [deployed root, public folder for static files]. */
export function frameworkDirs(fw: Framework, cwd: string): { root: string; publicDir: string } {
  switch (fw) {
    case 'vite':
    case 'astro':
      return { root: 'dist', publicDir: 'public' };
    case 'next':
      return { root: 'out', publicDir: 'public' };
    case 'laravel':
      return { root: 'public', publicDir: 'public' };
    case 'wordpress':
      return { root: '.', publicDir: '.' };
    default: {
      // A plain site: the folder with index.html.
      for (const d of ['.', 'public', 'dist', 'build', '_site', 'site', 'docs', 'www']) {
        if (existsSync(join(cwd, d, 'index.html'))) return { root: d, publicDir: d };
      }
      return { root: '.', publicDir: '.' };
    }
  }
}

/** Reads the remote "owner/repo" from .git/config, if it points at GitHub. */
export function githubRepo(cwd: string): { owner: string; repo: string } | null {
  let dir = resolve(cwd);
  for (let i = 0; i < 6; i++) {
    const cfg = join(dir, '.git', 'config');
    if (existsSync(cfg)) {
      const m = /url\s*=\s*(?:https?:\/\/|git@|ssh:\/\/git@)github\.com[/:]([^/\s]+)\/([^\s]+?)(?:\.git)?\s*$/m.exec(readFileSync(cfg, 'utf8'));
      return m ? { owner: m[1]!, repo: m[2]! } : null;
    }
    const up = resolve(dir, '..');
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/** Normalizes a base path to "/x/y/" form ("" and "." become "/"). */
export function normalizeBase(base: string): string {
  let b = base.trim();
  if (!b || b === '.' || b === './') return '/';
  if (/^https?:\/\//i.test(b)) b = new URL(b).pathname;
  if (!b.startsWith('/')) b = `/${b}`;
  if (!b.endsWith('/')) b += '/';
  return b.replace(/\/{2,}/g, '/');
}

/** Detects the host and the base path. */
export function detectBase(cwd: string, fw: Framework, root: string, publicDir: string): { host: Host; base: string; source?: string } {
  const pkg = readJson(join(cwd, 'package.json'));
  let host: Host = null;
  if (existsSync(join(cwd, 'netlify.toml')) || existsSync(join(cwd, root, '_redirects')) || existsSync(join(cwd, publicDir, '_redirects'))) host = 'netlify';
  // Explicit framework base settings win.
  const configs: Array<[Framework[], string[], RegExp]> = [
    [['vite'], ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.mts'], /\bbase\s*:\s*['"`]([^'"`]+)['"`]/],
    [['astro'], ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'], /\bbase\s*:\s*['"`]([^'"`]+)['"`]/],
    [['next'], ['next.config.js', 'next.config.mjs', 'next.config.ts'], /\bbasePath\s*:\s*['"`]([^'"`]+)['"`]/],
  ];
  for (const [fws, files, re] of configs) {
    if (!fws.includes(fw)) continue;
    const src = readConfigFile(cwd, files);
    const m = re.exec(src);
    if (m) return { host: host ?? (/github\.io/.test(src) ? 'github-pages' : null), base: normalizeBase(m[1]!), source: files.find((f) => existsSync(join(cwd, f))) };
  }
  // GitHub Pages evidence: a github.io homepage, a Pages workflow, gh-pages, or a docs/ site.
  const homepage = typeof pkg?.homepage === 'string' ? pkg.homepage : '';
  if (/^https?:\/\/[^/]+\.github\.io\//i.test(homepage)) {
    return { host: 'github-pages', base: normalizeBase(homepage), source: 'package.json homepage' };
  }
  const gh = githubRepo(cwd);
  if (gh) {
    let pages = root === 'docs' || JSON.stringify(pkg || {}).includes('gh-pages');
    const wf = join(cwd, '.github', 'workflows');
    if (!pages && existsSync(wf)) {
      for (const f of readdirSync(wf)) {
        if (/deploy-pages|gh-pages|github-pages/i.test(readFileSync(join(wf, f), 'utf8'))) pages = true;
      }
    }
    if (pages && host !== 'netlify') {
      const userSite = gh.repo.toLowerCase() === `${gh.owner.toLowerCase()}.github.io`;
      const custom = existsSync(join(cwd, root, 'CNAME')) || existsSync(join(cwd, publicDir, 'CNAME')) || existsSync(join(cwd, 'CNAME'));
      if (userSite || custom) return { host: 'github-pages', base: '/', source: custom ? 'CNAME (custom domain)' : 'user site repository' };
      return { host: 'github-pages', base: `/${gh.repo}/`, source: `GitHub repository ${gh.owner}/${gh.repo}` };
    }
  }
  return { host, base: '/' };
}

const ICON_NAMES = [
  'icon.svg',
  'logo.svg',
  'favicon.svg',
  'app-icon.png',
  'icon.png',
  'logo.png',
  'android-chrome-512x512.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
];

function pngSide(path: string): number {
  try {
    const b = readFileSync(path);
    if (b.length < 24 || b[0] !== 0x89) return 0;
    return Math.min(b.readUInt32BE(16), b.readUInt32BE(20));
  } catch {
    return 0;
  }
}

/** The site name from a home page title: "Acme Bakery | Fresh bread daily" gives "Acme Bakery". */
export function siteNameFromTitle(title: string): string {
  const parts = title
    .split(/\s*[|:\u00b7\u2022]\s+|\s+[-\u2013\u2014]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[0] || title.trim();
}

/** Scans a project folder. Pure read: never writes. */
export function scanSite(cwd: string, opts: { root?: string; publicDir?: string; base?: string } = {}): ScanResult {
  cwd = resolve(cwd);
  const framework = detectFramework(cwd);
  const dirs = frameworkDirs(framework, cwd);
  const root = opts.root ?? (opts.publicDir && framework === 'plain' ? opts.publicDir : dirs.root);
  const publicDir = opts.publicDir ?? (opts.root && framework === 'plain' ? opts.root : dirs.publicDir);
  const detected = detectBase(cwd, framework, root, publicDir);
  const base = opts.base !== undefined ? normalizeBase(opts.base) : detected.base;

  // HTML files to inject into: the deployed pages for plain sites, the
  // source index.html for Vite. Other frameworks render the head in code.
  let htmlFiles: string[] = [];
  if (framework === 'plain') {
    const rootAbs = join(cwd, root);
    if (existsSync(rootAbs) && statSync(rootAbs).isDirectory()) {
      htmlFiles = walk(rootAbs)
        .filter((f) => /\.html?$/i.test(f.path) && !/(^|\/)(offline\.html|googl[\w-]*\.html)$/i.test(f.path))
        .map((f) => relative(cwd, f.abs).split('\\').join('/'));
    }
  } else if (framework === 'vite') {
    htmlFiles = walk(cwd, { skipDirs: [root, publicDir] })
      .filter((f) => /\.html$/i.test(f.path) && !f.path.startsWith(`${root}/`) && !/(^|\/)offline\.html$/i.test(f.path))
      .map((f) => f.path);
  }

  // Read metadata from the home page (or the first page).
  const homeCandidates = [join(root, 'index.html'), 'index.html', ...htmlFiles];
  const home = homeCandidates.map((h) => join(cwd, h)).find((h) => existsSync(h));
  const meta = home ? readPageMeta(readFileSync(home, 'utf8')) : { icons: [], links: [], hasViewport: true } as PageMeta;
  const pkg = readJson(join(cwd, 'package.json'));

  let name = meta.title ? siteNameFromTitle(meta.title) : undefined;
  if (!name && typeof pkg?.name === 'string') name = pkg.name.replace(/^@[^/]+\//, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (!name) name = basename(cwd).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  let description = meta.description;
  if (!description && typeof pkg?.description === 'string') description = pkg.description;

  // Icon candidates: the page's own icons (largest first), then common file names.
  const candidates: Array<{ path: string; score: number }> = [];
  const homeDir = home ? relative(cwd, join(home, '..')) : root;
  for (const icon of meta.icons) {
    if (/^(https?:)?\/\//i.test(icon.href) || icon.href.startsWith('data:')) continue;
    const clean = icon.href.split(/[?#]/)[0]!;
    const local = clean.startsWith('/') ? [join(root, clean.slice(base.length - 1)), join(publicDir, clean.slice(base.length - 1)), join(root, clean), join(publicDir, clean)] : [join(homeDir, clean)];
    const found = local.find((p) => existsSync(join(cwd, p)) && /\.(png|svg)$/i.test(p));
    if (!found) continue;
    const isSvg = /\.svg$/i.test(found);
    candidates.push({ path: found.split('\\').join('/'), score: isSvg ? 10000 : pngSide(join(cwd, found)) });
  }
  for (const dir of [...new Set([publicDir, root, '.', 'src', 'assets', 'src/assets', 'static', 'images', 'img'])]) {
    for (const n of ICON_NAMES) {
      const p = join(dir, n);
      if (existsSync(join(cwd, p))) {
        candidates.push({ path: p.split('\\').join('/'), score: /\.svg$/i.test(n) ? 9000 : pngSide(join(cwd, p)) });
      }
    }
  }
  const iconCandidates = [...new Map(candidates.sort((a, b) => b.score - a.score).map((c) => [c.path.replace(/^\.\//, ''), c])).keys()];

  // Shortcuts: internal links from the home page navigation.
  const shortcuts: Array<{ name: string; url: string }> = [];
  const seen = new Set<string>();
  for (const l of meta.links.filter((x) => x.inNav)) {
    const href = l.href.trim();
    if (!href || /^(#|[a-z]+:|\/\/)/i.test(href)) continue;
    const path = href.split('#')[0]!;
    const norm = path.replace(/^\.\//, '').replace(/^\//, '').replace(/index\.html?$/, '');
    if (!norm || norm === base.replace(/^\/|\/$/g, '') || seen.has(norm) || !l.text || l.text.length > 40) continue;
    seen.add(norm);
    shortcuts.push({ name: l.text, url: `./${norm}` });
    if (shortcuts.length >= 4) break;
  }

  const result: ScanResult = {
    cwd,
    root,
    publicDir,
    htmlFiles,
    framework,
    host: detected.host,
    base,
    name,
    iconCandidates,
    shortcuts,
    hasViewport: meta.hasViewport,
  };
  if (detected.source && opts.base === undefined) result.baseSource = detected.source;
  if (description) result.description = description;
  if (meta.lang) result.lang = meta.lang;
  if (meta.themeColor) result.themeColor = meta.themeColor;
  if (meta.manifest) result.existingManifest = meta.manifest;
  return result;
}
