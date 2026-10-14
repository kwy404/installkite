import { afterEach, describe, expect, it } from 'vitest';
import { detectBase, detectFramework, githubRepo, normalizeBase, readPageMeta, scanSite, siteNameFromTitle } from '../src/core/scan.js';
import { readConfig, stringifyConfig, validateConfig } from '../src/core/config.js';
import { generateOfflinePage } from '../src/core/offline.js';
import { LOGO_SVG, PAGE, cleanupTemp, discPng, tempSite } from './helpers.js';

afterEach(cleanupTemp);

const gitConfig = (url: string): string => `[core]\n\tbare = false\n[remote "origin"]\n\turl = ${url}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`;

describe('page metadata', () => {
  it('reads title, description, language, theme color, icons, manifest and nav links', () => {
    const html = `<!doctype html><html lang="pt-BR"><head>
      <title>Padaria Acme &amp; Cia | P&#227;es</title>
      <meta name="description" content="Pao quente">
      <meta name="theme-color" content="#111" media="(prefers-color-scheme: dark)">
      <meta name="theme-color" content="#e8590c">
      <meta name="viewport" content="width=device-width">
      <link rel="icon" href="/favicon.svg" type="image/svg+xml">
      <link rel="apple-touch-icon" sizes="180x180" href="apple.png">
      <link rel="manifest" href="site.webmanifest">
      <!-- <link rel="manifest" href="commented.json"> -->
    </head><body><nav><a href="menu.html">Menu</a></nav><a href="foot.html">Footer</a></body></html>`;
    const m = readPageMeta(html);
    expect(m.title).toBe(`Padaria Acme & Cia | P${String.fromCharCode(227)}es`);
    expect(m.description).toBe('Pao quente');
    expect(m.lang).toBe('pt-BR');
    expect(m.themeColor).toBe('#e8590c');
    expect(m.hasViewport).toBe(true);
    expect(m.manifest).toBe('site.webmanifest');
    expect(m.icons).toEqual([
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: 'apple.png', sizes: '180x180' },
    ]);
    expect(m.links).toEqual([
      { href: 'menu.html', text: 'Menu', inNav: true },
      { href: 'foot.html', text: 'Footer', inNav: false },
    ]);
  });

  it('takes the site name from a title with a tagline', () => {
    expect(siteNameFromTitle('Acme Bakery | Fresh bread daily')).toBe('Acme Bakery');
    expect(siteNameFromTitle('Acme - Bread')).toBe('Acme');
    expect(siteNameFromTitle('Acme: Bread')).toBe('Acme');
    expect(siteNameFromTitle('Half-Life fans')).toBe('Half-Life fans');
  });
});

describe('framework, host and base detection', () => {
  it('detects frameworks from project files', () => {
    expect(detectFramework(tempSite({ 'index.html': '' }))).toBe('plain');
    expect(detectFramework(tempSite({ 'package.json': '{"devDependencies":{"vite":"^6"}}' }))).toBe('vite');
    expect(detectFramework(tempSite({ 'package.json': '{"dependencies":{"next":"15"}}' }))).toBe('next');
    expect(detectFramework(tempSite({ 'package.json': '{"dependencies":{"astro":"5"}}' }))).toBe('astro');
    expect(detectFramework(tempSite({ artisan: '', 'composer.json': '{}' }))).toBe('laravel');
    expect(detectFramework(tempSite({ 'composer.json': '{"require":{"laravel/framework":"^11"}}' }))).toBe('laravel');
    expect(detectFramework(tempSite({ 'wp-config.php': '' }))).toBe('wordpress');
    expect(detectFramework(tempSite({ 'style.css': '/*\nTheme Name: Acme\n*/' }))).toBe('wordpress');
    expect(detectFramework(tempSite({ 'vite.config.ts': '' }))).toBe('vite');
  });

  it('reads the base path from framework configs', () => {
    const vite = tempSite({ 'package.json': '{"devDependencies":{"vite":"6"}}', 'vite.config.ts': "export default { base: '/shop/' }" });
    expect(detectBase(vite, 'vite', 'dist', 'public')).toEqual({ host: null, base: '/shop/', source: 'vite.config.ts' });
    const next = tempSite({ 'next.config.mjs': "export default { output: 'export', basePath: '/docs' }" });
    expect(detectBase(next, 'next', 'out', 'public').base).toBe('/docs/');
    const astro = tempSite({ 'astro.config.mjs': "export default { site: 'https://me.github.io', base: 'blog' }" });
    expect(detectBase(astro, 'astro', 'dist', 'public')).toMatchObject({ base: '/blog/', host: 'github-pages' });
  });

  it('detects GitHub Pages project sites, user sites and custom domains', () => {
    const project = tempSite({ '.git/config': gitConfig('https://github.com/kwy404/acme.git'), 'docs/index.html': PAGE() });
    expect(githubRepo(project)).toEqual({ owner: 'kwy404', repo: 'acme' });
    expect(detectBase(project, 'plain', 'docs', 'docs')).toMatchObject({ host: 'github-pages', base: '/acme/' });
    const user = tempSite({ '.git/config': gitConfig('git@github.com:kwy404/kwy404.github.io.git'), 'docs/index.html': PAGE() });
    expect(detectBase(user, 'plain', 'docs', 'docs')).toMatchObject({ base: '/' });
    const custom = tempSite({ '.git/config': gitConfig('https://github.com/kwy404/acme'), 'docs/CNAME': 'acme.dev', 'docs/index.html': PAGE() });
    expect(detectBase(custom, 'plain', 'docs', 'docs')).toMatchObject({ base: '/', source: 'CNAME (custom domain)' });
    const workflow = tempSite({ '.git/config': gitConfig('https://github.com/kwy404/site'), '.github/workflows/pages.yml': 'uses: actions/deploy-pages@v4' });
    expect(detectBase(workflow, 'plain', '.', '.').base).toBe('/site/');
    const homepage = tempSite({ 'package.json': '{"homepage":"https://kwy404.github.io/cra-app"}' });
    expect(detectBase(homepage, 'plain', '.', '.')).toMatchObject({ base: '/cra-app/', source: 'package.json homepage' });
    // A GitHub repository without Pages evidence keeps "/".
    expect(detectBase(tempSite({ '.git/config': gitConfig('https://github.com/a/b') }), 'plain', '.', '.').base).toBe('/');
    expect(githubRepo(tempSite({ '.git/config': gitConfig('https://gitlab.com/a/b') }))).toBeNull();
    const netlify = tempSite({ 'netlify.toml': '[build]\npublish = "dist"' });
    expect(detectBase(netlify, 'plain', '.', '.')).toEqual({ host: 'netlify', base: '/' });
  });

  it('normalizes base paths', () => {
    expect(normalizeBase('')).toBe('/');
    expect(normalizeBase('repo')).toBe('/repo/');
    expect(normalizeBase('/a//b')).toBe('/a/b/');
    expect(normalizeBase('https://x.github.io/y')).toBe('/y/');
  });
});

describe('scanSite', () => {
  it('scans a plain site: pages, name, icon candidates and shortcuts', () => {
    const dir = tempSite({
      'index.html': PAGE('Acme Bakery | Fresh bread', '\n  <link rel="icon" href="favicon.png">'),
      'menu.html': PAGE('Menu'),
      'blog/index.html': PAGE('Blog'),
      'favicon.png': discPng(64),
      'images/logo.svg': LOGO_SVG,
      'logo.png': discPng(600),
      'offline.html': 'x',
    });
    const s = scanSite(dir);
    expect(s.framework).toBe('plain');
    expect(s.root).toBe('.');
    expect(s.htmlFiles.sort()).toEqual(['blog/index.html', 'index.html', 'menu.html']);
    expect(s.name).toBe('Acme Bakery');
    expect(s.description).toBe('Bread, cakes and coffee.');
    expect(s.lang).toBe('en');
    // SVG first, then PNGs by size.
    expect(s.iconCandidates).toEqual(['images/logo.svg', 'logo.png', 'favicon.png']);
    expect(s.shortcuts).toEqual([
      { name: 'Menu', url: './menu.html' },
      { name: 'Blog', url: './blog/' },
    ]);
  });

  it('prefers SVG logos and finds sites in a subfolder', () => {
    const dir = tempSite({ 'public/index.html': PAGE(), 'public/logo.svg': LOGO_SVG, 'public/icon.png': discPng(1024) });
    const s = scanSite(dir);
    expect(s.root).toBe('public');
    expect(s.iconCandidates[0]).toBe('public/logo.svg');
  });

  it('scans a Vite app: source index.html, public folder, dist root', () => {
    const dir = tempSite({
      'package.json': JSON.stringify({ name: '@acme/shop-app', scripts: { build: 'vite build' }, devDependencies: { vite: '6' } }),
      'index.html': '<!doctype html><html><head><title></title></head><body></body></html>',
      'public/favicon.svg': LOGO_SVG,
      'dist/index.html': 'built',
    });
    const s = scanSite(dir);
    expect(s).toMatchObject({ framework: 'vite', root: 'dist', publicDir: 'public', htmlFiles: ['index.html'], name: 'Shop App' });
    expect(s.iconCandidates[0]).toBe('public/favicon.svg');
  });

  it('leaves the head of Next.js, Astro, Laravel and WordPress to code', () => {
    expect(scanSite(tempSite({ 'package.json': '{"dependencies":{"next":"15"}}', 'app/page.html': 'x' })).htmlFiles).toEqual([]);
    expect(scanSite(tempSite({ 'wp-config.php': '', 'readme.html': 'x' })).htmlFiles).toEqual([]);
    expect(scanSite(tempSite({ 'index.html': PAGE() }), { root: '.', base: 'sub' }).base).toBe('/sub/');
  });
});

describe('config file', () => {
  it('validates and fills defaults', () => {
    const c = validateConfig({ root: '.', publicDir: '.', base: '/', icon: 'logo.svg', app: { name: 'Acme' } });
    expect(c.runtime).toEqual({ mode: 'local', installButton: 'auto', updateToast: true, offlineIndicator: true });
    expect(c.app.display).toBe('standalone');
    expect(c.iconsDir).toBe('icons');
    expect(stringifyConfig(c)).toMatch(/^\{\n {2}"\$schema": "https:\/\/kwy404\.github\.io\/installkite\/config\.schema\.json"/);
    expect(() => validateConfig(null)).toThrow();
    expect(() => validateConfig({ root: 1 })).toThrow(/root/);
    expect(() => validateConfig({ root: '.', publicDir: '.', base: '/', icon: 'x' })).toThrow(/app\.name/);
    expect(readConfig(tempSite())).toBeNull();
    expect(() => readConfig(tempSite({ 'installkite.config.json': '{oops' }))).toThrow(/not valid JSON/);
  });
});

describe('offline page', () => {
  it('is self contained, readable and lists saved pages', () => {
    const html = generateOfflinePage({ name: 'Acme <Bakery>', themeColor: '#ffee00', backgroundColor: '#101010', icon: 'data:image/png;base64,AAAA', lang: 'pt' });
    expect(html).toContain('<html lang="pt">');
    expect(html).toContain('Acme &lt;Bakery&gt;');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('--on-accent: #111827'); // dark text on yellow
    expect(html).toContain('color-scheme: dark');
    expect(html).not.toMatch(/<link\b|src="http/);
    expect(html).toContain("caches.keys()");
    const noIcon = generateOfflinePage({ name: 'zed', themeColor: '#123456', backgroundColor: '#fff', title: 'Sem internet', retryLabel: 'Tentar' });
    expect(noIcon).toContain('icon-letter');
    expect(noIcon).toContain('>Z</div>');
    expect(noIcon).toContain('Sem internet');
    expect(noIcon).toContain('Tentar');
  });
});
