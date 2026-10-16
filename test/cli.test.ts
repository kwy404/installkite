// Runs the real CLI (dist/cli.js) in temporary folders.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseArgs, ArgError } from '../src/cli/args.js';
import { LOGO_SVG, PAGE, cleanupTemp, discPng, tempSite } from './helpers.js';

afterEach(cleanupTemp);

const CLI = join(__dirname, '..', 'dist', 'cli.js');

function cliEnv(cwd: string, args: string[], input: string | undefined, env: Record<string, string>): { code: number; out: string; err: string } {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', input, env: { ...process.env, NO_COLOR: '1', ...env } });
  return { code: r.status ?? -1, out: r.stdout, err: r.stderr };
}
const cli = (cwd: string, args: string[], input?: string) => cliEnv(cwd, args, input, {});

const plainSite = () => tempSite({ 'index.html': PAGE('Acme Bakery | Fresh bread'), 'menu.html': PAGE('Menu'), 'blog/index.html': PAGE('Blog'), 'logo.svg': LOGO_SVG, 'style.css': 'body{}' });
const read = (dir: string, f: string) => readFileSync(join(dir, f), 'utf8');

describe('cli basics', () => {
  it('prints help and version', () => {
    const dir = tempSite();
    const help = cli(dir, ['--help']);
    expect(help.code).toBe(0);
    expect(help.out).toMatch(/npx installkite init/);
    expect(help.out).toMatch(/--dry-run/);
    const version = cli(dir, ['-v']);
    expect(version.out.trim()).toMatch(/^\d+\.\d+\.\d+/);
    expect(cli(dir, []).code).toBe(1);
  });

  it('rejects unknown commands and options with exit code 2', () => {
    const dir = tempSite();
    expect(cli(dir, ['launch']).code).toBe(2);
    const bad = cli(dir, ['init', '--colour']);
    expect(bad.code).toBe(2);
    expect(bad.err).toMatch(/unknown option --colour/);
    expect(cli(dir, ['init', '--name']).err).toMatch(/--name needs a value/);
    expect(cli(dir, ['init', '--display', 'window', '--yes']).err).toMatch(/--display must be one of/);
    expect(cli(dir, ['doctor', '--cwd', 'nope']).code).toBe(2);
  });
});

describe('init', () => {
  it('makes a static site installable with --yes', () => {
    const dir = plainSite();
    const r = cli(dir, ['init', '--yes']);
    expect(r.code, r.err).toBe(0);
    expect(r.out).toMatch(/done\. \d+ files written/);
    for (const f of ['manifest.webmanifest', 'sw.js', 'offline.html', 'installkite.js', 'favicon.ico', 'apple-touch-icon.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'installkite.config.json']) {
      expect(existsSync(join(dir, f)), f).toBe(true);
    }
    const manifest = JSON.parse(read(dir, 'manifest.webmanifest'));
    expect(manifest.name).toBe('Acme Bakery');
    expect(manifest.theme_color).toBe('#e8590c');
    expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual(['./menu.html', './blog/']);
    for (const page of ['index.html', 'menu.html', 'blog/index.html']) expect(read(dir, page)).toContain('<!-- installkite:start -->');
    expect(read(dir, 'sw.js')).toMatch(/"precache":\[\["apple-touch-icon\.png"/);
  });

  it('is idempotent: running again changes nothing', () => {
    const dir = plainSite();
    cli(dir, ['init', '--yes']);
    const before = ['index.html', 'sw.js', 'manifest.webmanifest', 'installkite.config.json'].map((f) => read(dir, f));
    const again = cli(dir, ['init', '--yes']);
    expect(again.code).toBe(0);
    expect(again.out).toMatch(/done\. 0 files written/);
    expect(['index.html', 'sw.js', 'manifest.webmanifest', 'installkite.config.json'].map((f) => read(dir, f))).toEqual(before);
  });

  it('--dry-run prints diffs and writes nothing', () => {
    const dir = plainSite();
    const r = cli(dir, ['init', '--yes', '--dry-run', '--name', 'Acme']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('--- a/index.html');
    expect(r.out).toContain('+  <link rel="manifest" href="/manifest.webmanifest">');
    expect(r.out).toMatch(/dry run: nothing was written/);
    expect(existsSync(join(dir, 'manifest.webmanifest'))).toBe(false);
    expect(read(dir, 'index.html')).not.toContain('installkite');
  });

  it('applies flags: base path, colors, display, cdn, no install button', () => {
    const dir = plainSite();
    const r = cli(dir, ['init', '-y', '--base', '/acme/', '--name', 'Acme', '--short-name', 'Acme', '--theme-color', 'teal', '--background-color', '#111111', '--display', 'fullscreen', '--cdn', '--no-install-button', '--no-screenshots', '--no-shortcuts']);
    expect(r.code, r.err).toBe(0);
    const html = read(dir, 'index.html');
    expect(html).toContain('href="/acme/manifest.webmanifest"');
    expect(html).toMatch(/src="https:\/\/cdn\.jsdelivr\.net\/npm\/installkite@[\d.]+\/dist\/installkite\.min\.js" data-sw="\/acme\/sw\.js" data-offline="badge" defer/);
    expect(existsSync(join(dir, 'installkite.js'))).toBe(false);
    const m = JSON.parse(read(dir, 'manifest.webmanifest'));
    expect(m).toMatchObject({ display: 'fullscreen', theme_color: '#008080', background_color: '#111111', short_name: 'Acme' });
    expect(m.screenshots).toBeUndefined();
    expect(m.shortcuts).toBeUndefined();
  });

  it('--relative writes per page relative URLs', () => {
    const dir = plainSite();
    cli(dir, ['init', '-y', '--relative']);
    expect(read(dir, 'index.html')).toContain('href="./manifest.webmanifest"');
    expect(read(dir, 'blog/index.html')).toContain('href="../manifest.webmanifest"');
    expect(read(dir, 'blog/index.html')).toContain('src="../installkite.js" data-sw="../sw.js"');
  });

  it('uses a PNG icon and draws a monogram when there is no logo', () => {
    const png = tempSite({ 'index.html': PAGE(), 'brand/mark.png': discPng(512) });
    expect(cli(png, ['init', '-y', '--icon', 'brand/mark.png']).code).toBe(0);
    expect(existsSync(join(png, 'icons', 'icon.svg'))).toBe(false);
    expect(read(png, 'index.html')).toContain('favicon-32x32.png');
    const none = tempSite({ 'index.html': PAGE('Zebra Cafe') });
    const r = cli(none, ['init', '-y']);
    expect(r.out).toMatch(/initials of "Zebra Cafe"/);
    expect(JSON.parse(read(none, 'installkite.config.json')).icon).toBe('monogram');
    expect(cli(none, ['init', '-y', '--icon', 'missing.png']).err).toMatch(/icon source not found/);
  });

  it('--no-inject prints the tags instead of editing HTML', () => {
    const dir = plainSite();
    const r = cli(dir, ['init', '-y', '--no-inject']);
    expect(read(dir, 'index.html')).not.toContain('installkite');
    expect(r.out).toContain('Paste these tags');
    const next = tempSite({ 'package.json': JSON.stringify({ dependencies: { next: '15' }, scripts: { build: 'next build' } }), 'public/logo.svg': LOGO_SVG });
    const n = cli(next, ['init', '-y']);
    expect(n.code, n.err).toBe(0);
    expect(n.out).toMatch(/Paste these tags into your <head>/);
    expect(n.out).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(existsSync(join(next, 'public', 'sw.js'))).toBe(true);
    expect(JSON.parse(read(next, 'package.json')).scripts.build).toBe('next build && npx installkite build');
  });

  it('sets up a Vite app: public folder, source index.html and the build script', () => {
    const dir = tempSite({
      'package.json': JSON.stringify({ name: 'shop', scripts: { build: 'vite build' }, devDependencies: { vite: '6' } }, null, 2),
      'index.html': PAGE('Shop'),
      'public/favicon.svg': LOGO_SVG,
    });
    const r = cli(dir, ['init', '-y']);
    expect(r.code, r.err).toBe(0);
    expect(existsSync(join(dir, 'public', 'manifest.webmanifest'))).toBe(true);
    expect(read(dir, 'index.html')).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(JSON.parse(read(dir, 'package.json')).scripts.build).toBe('vite build && npx installkite build');
    expect(cli(dir, ['init', '-y', '--no-postbuild']).code).toBe(0);
  });

  it('asks questions and uses the answers', () => {
    const dir = plainSite();
    // name, label, icon, theme color, background, display, base, install button
    const answers = ['Acme Online', 'Acme', '', '#336699', '', 'mini', '', 'n', ''].join(String.fromCharCode(10));
    const r = cliEnv(dir, ['init'], answers, { INSTALLKITE_INTERACTIVE: '1' });
    expect(r.code, r.err).toBe(0);
    expect(r.out).toContain('? App name');
    expect(r.out).toContain('? Display mode');
    const m = JSON.parse(read(dir, 'manifest.webmanifest'));
    expect(m).toMatchObject({ name: 'Acme Online', short_name: 'Acme', theme_color: '#336699', display: 'minimal-ui', background_color: '#ffffff' });
    expect(read(dir, 'index.html')).not.toContain('data-install="auto"');
  });

  it('behaves like --yes without a terminal', () => {
    const dir = plainSite();
    const r = cli(dir, ['init'], 'Ignored');
    expect(r.code).toBe(0);
    expect(JSON.parse(read(dir, 'manifest.webmanifest')).name).toBe('Acme Bakery');
  });
});

describe('build', () => {
  it('re-hashes the precache list after a site build, with --check for CI', () => {
    const dir = plainSite();
    cli(dir, ['init', '-y']);
    expect(cli(dir, ['build', '--check']).code).toBe(0);
    writeFileSync(join(dir, 'style.css'), 'body{color:red}');
    writeFileSync(join(dir, 'new.html'), PAGE('New'));
    const check = cli(dir, ['build', '--check']);
    expect(check.code).toBe(1);
    expect(check.err).toMatch(/out of date/);
    const dry = cli(dir, ['build', '--dry-run']);
    expect(dry.out).toMatch(/update {2}new\.html/);
    expect(cli(dir, ['build', '--check']).code).toBe(1);
    const b = cli(dir, ['build']);
    expect(b.code).toBe(0);
    expect(b.out).toMatch(/files precached/);
    expect(read(dir, 'new.html')).toContain('installkite:start');
    expect(read(dir, 'sw.js')).toContain('"new.html"');
    expect(cli(dir, ['build', '--check']).code).toBe(0);
  });

  it('needs a config and a built site', () => {
    expect(cli(tempSite(), ['build']).err).toMatch(/run "npx installkite init" first/);
    const dir = tempSite({ 'package.json': JSON.stringify({ scripts: { build: 'vite build' }, devDependencies: { vite: '6' } }), 'index.html': PAGE(), 'logo.svg': LOGO_SVG });
    cli(dir, ['init', '-y']);
    expect(cli(dir, ['build']).err).toMatch(/"dist" does not exist/);
  });
});

describe('doctor, icons and remove', () => {
  it('doctor exits 1 on errors, 0 when ready, and prints JSON', () => {
    const dir = plainSite();
    const before = cli(dir, ['doctor']);
    expect(before.code).toBe(1);
    expect(before.out).toMatch(/fail {2}Page links a web app manifest/);
    cli(dir, ['init', '-y']);
    const after = cli(dir, ['doctor']);
    expect(after.code, after.out).toBe(0);
    expect(after.out).toMatch(/installable and offline ready/);
    expect(cli(dir, ['doctor', '--strict']).code).toBe(1); // placeholder screenshots warn
    const json = JSON.parse(cli(dir, ['doctor', '--json']).out);
    expect(json.installable).toBe(true);
    expect(Array.isArray(json.checks)).toBe(true);
    expect(cli(dir, ['doctor', '--url', 'ftp://x']).err).toMatch(/starts with https/);
  });

  it('icons writes only the icon set', () => {
    const dir = tempSite({ 'logo.svg': LOGO_SVG });
    const r = cli(dir, ['icons', 'logo.svg', '--out', 'static', '--background', '#000000']);
    expect(r.code, r.err).toBe(0);
    expect(existsSync(join(dir, 'static', 'icons', 'icon-192.png'))).toBe(true);
    expect(existsSync(join(dir, 'static', 'favicon.ico'))).toBe(true);
    expect(existsSync(join(dir, 'static', 'manifest.webmanifest'))).toBe(false);
    expect(cli(dir, ['icons']).err).toMatch(/usage/);
    expect(cli(dir, ['icons', 'nope.png']).err).toMatch(/not found/);
  });

  it('remove takes the tags out again', () => {
    const dir = plainSite();
    const original = read(dir, 'index.html');
    cli(dir, ['init', '-y']);
    const r = cli(dir, ['remove']);
    expect(r.out).toMatch(/removed the installkite tags from 3 files/);
    expect(read(dir, 'index.html')).toBe(original);
  });
});

describe('argument parser', () => {
  const spec = { values: ['name'], booleans: ['yes', 'inject'], aliases: { y: 'yes', n: 'name' } };
  it('parses long, short, negated and inline values', () => {
    expect(parseArgs(['init', '--name=Acme', '--no-inject', '-y', 'extra'], spec)).toEqual({ command: 'init', positionals: ['extra'], flags: { name: 'Acme', inject: false, yes: true } });
    expect(parseArgs(['-n', 'X', '--inject=false', '--', '--raw'], spec)).toEqual({ command: '--raw', positionals: [], flags: { name: 'X', inject: false } });
    expect(() => parseArgs(['--yes=maybe'], spec)).toThrow(ArgError);
    expect(() => parseArgs(['-z'], spec)).toThrow(/unknown option -z/);
    expect(() => parseArgs(['-n'], spec)).toThrow(/needs a value/);
  });
});
