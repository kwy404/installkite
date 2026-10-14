// The init and build pipelines. Both plan every file first (path, new
// content, what changes) so --dry-run can print diffs, then apply the plan.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { parseColor, toHex } from './color.js';
import { CONFIG_FILE, readConfig, stringifyConfig, type InstallkiteConfig } from './config.js';
import { unifiedDiff } from './diff.js';
import { matchAny, walk } from './files.js';
import { dominantColor } from './image.js';
import { generateIcons, loadIconSource, renderSource, type IconFile, type IconSource } from './icons.js';
import { injectHead, relativePrefix, type HeadOptions } from './inject.js';
import { generateManifest, manifestScreenshots, stringifyManifest, type Display, type ShortcutInput } from './manifest.js';
import { monogramSvg } from './monogram.js';
import { generateOfflinePage } from './offline.js';
import { DEFAULT_INCLUDE, DEFAULT_EXCLUDE, DEFAULT_MAX_FILE_SIZE, pathToUrl, precacheVersion, revisionOf, type PrecacheEntry } from './precache.js';
import { readAsset } from './assets.js';
import { scanSite, type ScanResult } from './scan.js';
import { generateServiceWorker } from './sw.js';
import { VERSION } from '../version.js';

export const CDN_RUNTIME = `https://cdn.jsdelivr.net/npm/installkite@${VERSION}/dist/installkite.min.js`;

export interface PlannedFile {
  /** Path relative to the project folder, forward slashes. */
  path: string;
  content: Uint8Array | string;
  action: 'create' | 'update' | 'unchanged';
  /** Unified diff for text files that change. */
  diff?: string;
  /** Why the file is written, for the summary. */
  note?: string;
}

export interface InitAnswers {
  root?: string;
  publicDir?: string;
  base?: string;
  relative?: boolean;
  url?: string;
  /** Icon source path relative to the project, or "monogram" to draw initials. */
  icon?: string;
  name?: string;
  shortName?: string;
  description?: string;
  lang?: string;
  themeColor?: string;
  themeColorDark?: string;
  backgroundColor?: string;
  display?: Display;
  startUrl?: string;
  scope?: string;
  orientation?: string;
  shortcuts?: ShortcutInput[] | false;
  screenshots?: boolean;
  /** Head tag injection into HTML files. */
  inject?: boolean;
  runtime?: InstallkiteConfig['runtime']['mode'];
  installButton?: 'auto' | 'none';
  updateToast?: boolean;
  offlineIndicator?: boolean;
  /** Offline page. Default true. */
  offline?: boolean;
  navigationTimeout?: number;
  /** Add "installkite build" to the package.json build script (frameworks with a build step). */
  postbuild?: boolean;
}

export interface InitPlan {
  config: InstallkiteConfig;
  files: PlannedFile[];
  scan: ScanResult;
  notes: string[];
  warnings: string[];
  /** Head tag snippet for frameworks where the head is rendered in code. */
  snippet?: string;
  precache: { count: number; size: number };
}

const toPosix = (p: string): string => p.split('\\').join('/').replace(/^\.\//, '');
const inDir = (dir: string, file: string): string => toPosix(posix.join(toPosix(dir) || '.', file));

function planFile(cwd: string, path: string, content: Uint8Array | string, note?: string): PlannedFile {
  const abs = join(cwd, path);
  const exists = existsSync(abs);
  const next = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content);
  if (!exists) {
    const f: PlannedFile = { path, content, action: 'create' };
    if (note) f.note = note;
    if (typeof content === 'string') f.diff = unifiedDiff('', content, path);
    return f;
  }
  const current = readFileSync(abs);
  if (current.equals(next)) return { path, content, action: 'unchanged' };
  const f: PlannedFile = { path, content, action: 'update' };
  if (note) f.note = note;
  if (typeof content === 'string') f.diff = unifiedDiff(current.toString('utf8'), content, path);
  return f;
}

/** Writes planned files that change. Returns the paths written. */
export function applyPlan(cwd: string, files: PlannedFile[]): string[] {
  const written: string[] = [];
  for (const f of files) {
    if (f.action === 'unchanged') continue;
    const abs = join(cwd, f.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, f.content);
    written.push(f.path);
  }
  return written;
}

function hexColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const c = parseColor(value);
  if (!c) throw new Error(`not a valid CSS color: ${value}`);
  return value.startsWith('#') && value.length === 7 ? value.toLowerCase() : toHex(c);
}

/** Which HTML files get head tags: every page of a plain site (a glob, so new pages are covered), the source pages of a Vite app. */
function defaultHtml(scan: ScanResult): string[] {
  if (scan.framework === 'plain') {
    if (!scan.htmlFiles.length) return [];
    return [scan.root === '.' ? '**/*.html' : `${toPosix(scan.root)}/**/*.html`];
  }
  return scan.htmlFiles;
}

/** Resolves answers plus scan results into a config. */
export function resolveConfig(scan: ScanResult, a: InitAnswers, source: IconSource | null, previous?: InstallkiteConfig | null): InstallkiteConfig {
  const prevApp = previous?.app;
  const name = (a.name ?? prevApp?.name ?? scan.name ?? 'My App').trim();
  let theme = a.themeColor ?? prevApp?.themeColor ?? scan.themeColor;
  if (!theme && source) {
    const dom = dominantColor(renderSource(source, 128));
    if (dom) theme = toHex(dom);
  }
  const themeColor = hexColor(theme, '#3b82f6');
  const backgroundColor = hexColor(a.backgroundColor ?? prevApp?.backgroundColor, '#ffffff');
  const shortcuts = a.shortcuts === false ? [] : (a.shortcuts ?? prevApp?.shortcuts ?? scan.shortcuts);
  const cfg: InstallkiteConfig = {
    root: toPosix(a.root ?? previous?.root ?? scan.root) || '.',
    publicDir: toPosix(a.publicDir ?? previous?.publicDir ?? scan.publicDir) || '.',
    base: a.base ?? previous?.base ?? scan.base,
    icon: toPosix(a.icon ?? previous?.icon ?? scan.iconCandidates[0] ?? 'monogram'),
    iconsDir: previous?.iconsDir ?? 'icons',
    html: previous?.html ?? defaultHtml(scan),
    app: {
      name,
      shortName: (a.shortName ?? prevApp?.shortName ?? '').trim() || '',
      display: a.display ?? prevApp?.display ?? 'standalone',
      themeColor,
      backgroundColor,
      startUrl: a.startUrl ?? prevApp?.startUrl ?? './',
      scope: a.scope ?? prevApp?.scope ?? './',
      screenshots: a.screenshots ?? prevApp?.screenshots ?? true,
    },
    runtime: {
      mode: a.runtime ?? previous?.runtime.mode ?? 'local',
      installButton: a.installButton ?? previous?.runtime.installButton ?? 'auto',
      updateToast: a.updateToast ?? previous?.runtime.updateToast ?? true,
      offlineIndicator: a.offlineIndicator ?? previous?.runtime.offlineIndicator ?? true,
    },
    sw: { ...(previous?.sw ?? {}) },
  };
  const relativeUrls = a.relative ?? previous?.relative;
  if (relativeUrls) cfg.relative = true;
  const url = a.url ?? previous?.url;
  if (url) cfg.url = url;
  const description = a.description ?? prevApp?.description ?? scan.description;
  if (description) cfg.app.description = description;
  const lang = a.lang ?? prevApp?.lang ?? scan.lang;
  if (lang) cfg.app.lang = lang;
  const dark = a.themeColorDark ?? prevApp?.themeColorDark;
  if (dark) cfg.app.themeColorDark = hexColor(dark, themeColor);
  const orientation = a.orientation ?? prevApp?.orientation;
  if (orientation) cfg.app.orientation = orientation;
  if (prevApp?.categories) cfg.app.categories = prevApp.categories;
  if (shortcuts.length) cfg.app.shortcuts = shortcuts;
  if (a.offline === false) cfg.sw.offline = null;
  if (a.navigationTimeout) cfg.sw.navigationTimeout = a.navigationTimeout;
  if (!cfg.app.shortName) delete (cfg.app as { shortName?: string }).shortName;
  return cfg;
}

/** The head tag options for one HTML file. */
export function headOptionsFor(cfg: InstallkiteConfig, htmlPath: string | null, svgIcon: boolean, shortName: string): HeadOptions {
  let base = cfg.base;
  if (cfg.relative && htmlPath) {
    const rel = toPosix(relative(cfg.root, htmlPath));
    base = rel.startsWith('..') ? './' : relativePrefix(rel);
  }
  const runtimeAttrs: Record<string, string | true> = {};
  if (cfg.runtime.installButton === 'auto') runtimeAttrs.install = 'auto';
  if (!cfg.runtime.updateToast) runtimeAttrs.update = 'none';
  if (cfg.runtime.offlineIndicator) runtimeAttrs.offline = 'badge';
  const o: HeadOptions = {
    base,
    appName: shortName,
    themeColor: cfg.app.themeColor,
    svgIcon: svgIcon ? `${cfg.iconsDir}/icon.svg` : false,
    runtime: cfg.runtime.mode === 'none' ? false : cfg.runtime.mode === 'cdn' ? CDN_RUNTIME : 'installkite.js',
    runtimeAttrs,
    sw: 'sw.js',
  };
  if (cfg.app.themeColorDark) o.themeColorDark = cfg.app.themeColorDark;
  return o;
}

/** Loads the icon source named in a config (or draws a monogram). */
export function loadSource(cwd: string, cfg: Pick<InstallkiteConfig, 'icon' | 'app'>): IconSource {
  if (cfg.icon === 'monogram') return loadIconSource(Buffer.from(monogramSvg(cfg.app.name, cfg.app.themeColor)), 'monogram.svg');
  const abs = join(cwd, cfg.icon);
  if (!existsSync(abs)) throw new Error(`icon source not found: ${cfg.icon}`);
  return loadIconSource(new Uint8Array(readFileSync(abs)), cfg.icon);
}

/**
 * The files of the deployed site as they will be after the plan is applied:
 * what is on disk in root, with planned files laid over it. Files written
 * to publicDir are copied into root by the framework build.
 */
function virtualRoot(cwd: string, cfg: InstallkiteConfig, planned: PlannedFile[]): Map<string, Uint8Array | string> {
  const files = new Map<string, Uint8Array | string>();
  const rootAbs = join(cwd, cfg.root);
  if (existsSync(rootAbs)) for (const f of walk(rootAbs)) files.set(f.path, readFileSync(f.abs));
  const rootPrefix = cfg.root === '.' ? '' : `${toPosix(cfg.root)}/`;
  const pubPrefix = cfg.publicDir === '.' ? '' : `${toPosix(cfg.publicDir)}/`;
  for (const p of planned) {
    if (rootPrefix === '' || p.path.startsWith(rootPrefix)) files.set(p.path.slice(rootPrefix.length), p.content);
    else if (pubPrefix === '' || p.path.startsWith(pubPrefix)) files.set(p.path.slice(pubPrefix.length), p.content);
  }
  return files;
}

/** Precache entries for a set of files, honoring the config's include and exclude globs. */
export function precacheFrom(files: Map<string, Uint8Array | string>, cfg: InstallkiteConfig): PrecacheEntry[] {
  const iconsDir = cfg.iconsDir || 'icons';
  const include = cfg.sw.include ?? DEFAULT_INCLUDE.map((g) => g.replace(/^icons\//, `${iconsDir}/`));
  const exclude = [...DEFAULT_EXCLUDE, ...(cfg.sw.exclude ?? [])];
  const max = cfg.sw.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const out: PrecacheEntry[] = [];
  for (const [path, content] of files) {
    if (path === CONFIG_FILE || !matchAny(path, include) || matchAny(path, exclude)) continue;
    const size = typeof content === 'string' ? Buffer.byteLength(content) : content.length;
    if (size > max) continue;
    out.push({ url: pathToUrl(path), revision: revisionOf(content), size });
  }
  return out.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
}

function swOptions(cfg: InstallkiteConfig): Parameters<typeof generateServiceWorker>[1] {
  const { include: _i, exclude: _e, maxFileSize: _m, ...rest } = cfg.sw;
  return rest;
}

/** Plans everything init writes. Pure apart from reading files. */
export function planInit(cwd: string, answers: InitAnswers = {}, opts: { scan?: ScanResult } = {}): InitPlan {
  const previous = readConfig(cwd);
  const scan = opts.scan ?? scanSite(cwd, { root: answers.root ?? previous?.root, publicDir: answers.publicDir ?? previous?.publicDir, base: answers.base ?? previous?.base });
  const notes: string[] = [];
  const warnings: string[] = [];

  // The icon source decides the default theme color, so load it first.
  const iconPath = answers.icon ?? previous?.icon ?? scan.iconCandidates[0] ?? 'monogram';
  const draft = { icon: toPosix(iconPath), app: { name: answers.name ?? previous?.app.name ?? scan.name ?? 'My App', themeColor: hexColor(answers.themeColor ?? previous?.app.themeColor ?? scan.themeColor, '#3b82f6') } };
  let source: IconSource | null = draft.icon === 'monogram' ? null : loadSource(cwd, draft as InstallkiteConfig);
  const cfg = resolveConfig(scan, { ...answers, icon: draft.icon }, source, previous);
  if (!source) {
    source = loadSource(cwd, cfg);
    notes.push(`no logo found, so the icons show the initials of "${cfg.app.name}" (pass --icon to use your own)`);
  }
  for (const w of source.warnings) warnings.push(`icon: ${w}`);

  const pub = cfg.publicDir;
  const files: PlannedFile[] = [];

  // Icons.
  const icons = generateIcons(source, {
    dir: cfg.iconsDir,
    themeColor: cfg.app.themeColor,
    screenshots: cfg.app.screenshots,
  });
  for (const f of icons.files) files.push(planFile(cwd, inDir(pub, f.path), f.bytes, f.role));
  if (cfg.app.screenshots) {
    cfg.placeholders = Object.fromEntries(icons.files.filter((f) => f.role === 'screenshot').map((f) => [f.path, revisionOf(f.bytes)]));
    notes.push(`placeholder screenshots written to ${inDir(pub, cfg.iconsDir)}/: replace them with real ones for the richer install dialog`);
  }

  // Manifest.
  const manifest = generateManifest({
    name: cfg.app.name,
    shortName: cfg.app.shortName,
    description: cfg.app.description,
    lang: cfg.app.lang,
    startUrl: cfg.app.startUrl,
    scope: cfg.app.scope,
    display: cfg.app.display,
    orientation: cfg.app.orientation,
    themeColor: cfg.app.themeColor,
    backgroundColor: cfg.app.backgroundColor,
    categories: cfg.app.categories,
    icons: icons.files,
    shortcuts: cfg.app.shortcuts,
    screenshots: manifestScreenshots(icons.files as IconFile[], cfg.app.name),
  });
  files.push(planFile(cwd, inDir(pub, 'manifest.webmanifest'), stringifyManifest(manifest), 'manifest'));

  // Offline page, with the 96 px icon inlined so it works at any URL.
  if (cfg.sw.offline !== null) {
    const icon96 = icons.files.find((f) => f.path.endsWith('icon-96.png'));
    files.push(
      planFile(
        cwd,
        inDir(pub, 'offline.html'),
        generateOfflinePage({
          name: cfg.app.name,
          themeColor: cfg.app.themeColor,
          backgroundColor: cfg.app.backgroundColor,
          icon: icon96 ? `data:image/png;base64,${Buffer.from(icon96.bytes).toString('base64')}` : undefined,
          lang: cfg.app.lang,
        }),
        'offline page',
      ),
    );
  }

  // Runtime script.
  if (cfg.runtime.mode === 'local') files.push(planFile(cwd, inDir(pub, 'installkite.js'), readAsset('installkite.min.js'), 'runtime'));

  // Head tags.
  const svgIcon = source.kind === 'svg';
  let snippet: string | undefined;
  const shortName = manifest.short_name ?? cfg.app.name;
  if (answers.inject !== false && cfg.html.length) {
    for (const html of expandHtml(cwd, cfg)) {
      const abs = join(cwd, html);
      const before = readFileSync(abs, 'utf8');
      const res = injectHead(before, headOptionsFor(cfg, html, svgIcon, shortName));
      if (res.kept.length) notes.push(`${html}: kept the page's own ${res.kept.join(', ')}`);
      files.push(planFile(cwd, html, res.html, 'head tags'));
    }
  } else if (answers.inject !== false) {
    const block = injectHead('<head>\n</head>', headOptionsFor(cfg, null, svgIcon, shortName)).html;
    snippet = block
      .replace(/^<head>\n|<\/head>$/g, '')
      .replace(/^ {2}/gm, '')
      .trimEnd();
  }

  // package.json: refresh the precache after every framework build.
  if (answers.postbuild !== false && ['vite', 'astro', 'next'].includes(scan.framework)) {
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const text = readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(text);
      const build: unknown = pkg.scripts?.build;
      if (typeof build === 'string' && !/installkite build/.test(build)) {
        pkg.scripts.build = `${build} && npx installkite build`;
        const indent = /^(\s+)"/m.exec(text)?.[1] ?? '  ';
        files.push(planFile(cwd, 'package.json', `${JSON.stringify(pkg, null, indent)}\n`, 'build script'));
      }
    }
  }

  // Service worker over the site as it will look after this plan.
  const entries = precacheFrom(virtualRoot(cwd, cfg, files), cfg);
  files.push(planFile(cwd, inDir(pub, 'sw.js'), generateServiceWorker(entries, swOptions(cfg), { version: VERSION }), 'service worker'));
  if (cfg.root !== cfg.publicDir && existsSync(join(cwd, cfg.root))) {
    notes.push(`run "npx installkite build" after each build so ${cfg.root}/sw.js precaches the new files`);
  }

  files.push(planFile(cwd, CONFIG_FILE, stringifyConfig(cfg), 'config'));
  const plan: InitPlan = { config: cfg, files, scan, notes, warnings, precache: { count: entries.length, size: entries.reduce((n, e) => n + e.size, 0) } };
  if (snippet) plan.snippet = snippet;
  return plan;
}

/** HTML files from the config (paths or globs), relative to the project. */
export function expandHtml(cwd: string, cfg: Pick<InstallkiteConfig, 'html'>): string[] {
  const out = new Set<string>();
  const globs = cfg.html.filter((h) => /[*?{[]/.test(h));
  for (const h of cfg.html) if (!globs.includes(h) && existsSync(join(cwd, h))) out.add(toPosix(h));
  if (globs.length) for (const f of walk(cwd)) if (matchAny(f.path, globs)) out.add(f.path);
  // Never the offline page (it is self contained) or search console verification files.
  return [...out].filter((f) => !/(^|\/)(offline\.html|googl[\w-]*\.html)$/i.test(f)).sort();
}

export interface BuildResult {
  files: PlannedFile[];
  entries: PrecacheEntry[];
  version: string;
  size: number;
}

/**
 * Plans the build step: re-hashes the deployed root and rewrites sw.js
 * there. Also refreshes head tags in HTML files under root (plain sites
 * regenerate pages, the block may be missing from new ones).
 */
export function planBuild(cwd: string, cfg?: InstallkiteConfig | null): BuildResult {
  cfg = cfg ?? readConfig(cwd);
  if (!cfg) throw new Error(`no ${CONFIG_FILE} here: run "npx installkite init" first`);
  const rootAbs = join(cwd, cfg.root);
  if (!existsSync(rootAbs)) throw new Error(`the site folder "${cfg.root}" does not exist: build your site first`);
  const files: PlannedFile[] = [];
  // Pages that a site generator rebuilt without the tags get them again.
  if (cfg.html.length) {
    const source = loadSourceKind(cwd, cfg);
    const shortName = readShortName(cwd, cfg) ?? cfg.app.name;
    for (const html of expandHtml(cwd, cfg)) {
      const before = readFileSync(join(cwd, html), 'utf8');
      const res = injectHead(before, headOptionsFor(cfg, html, source === 'svg', shortName));
      if (res.html !== before) files.push(planFile(cwd, html, res.html, 'head tags'));
    }
  }
  const entries = precacheFrom(virtualRoot(cwd, cfg, files), cfg);
  const sw = inDir(cfg.root, 'sw.js');
  files.push(planFile(cwd, sw, generateServiceWorker(entries, swOptions(cfg), { version: VERSION }), 'service worker'));
  return { files, entries, version: precacheVersion(entries), size: entries.reduce((n, e) => n + e.size, 0) };
}

function loadSourceKind(cwd: string, cfg: InstallkiteConfig): 'svg' | 'png' {
  if (cfg.icon === 'monogram') return 'svg';
  return existsSync(join(cwd, cfg.publicDir, cfg.iconsDir, 'icon.svg')) || /\.svg$/i.test(cfg.icon) ? 'svg' : 'png';
}

function readShortName(cwd: string, cfg: InstallkiteConfig): string | undefined {
  try {
    const m = JSON.parse(readFileSync(join(cwd, cfg.publicDir, 'manifest.webmanifest'), 'utf8'));
    return typeof m.short_name === 'string' ? m.short_name : undefined;
  } catch {
    return undefined;
  }
}

/** Encodes a standalone icon set for `installkite icons`. */
export function planIcons(cwd: string, sourcePath: string, outDir: string, opts: { background?: string; screenshots?: boolean; themeColor?: string } = {}): PlannedFile[] {
  const source = loadIconSource(new Uint8Array(readFileSync(join(cwd, sourcePath))), sourcePath);
  const set = generateIcons(source, { dir: 'icons', background: opts.background, screenshots: opts.screenshots, themeColor: opts.themeColor });
  return set.files.map((f) => planFile(cwd, inDir(outDir, f.path), f.bytes, f.role));
}

