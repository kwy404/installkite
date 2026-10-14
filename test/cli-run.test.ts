// The CLI in process, through run(), with captured streams. The spawned
// CLI tests in cli.test.ts cover the built binary end to end.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from '../src/cli/main.js';
import { colors, createAsker, formatBytes } from '../src/cli/ui.js';
import { LOGO_SVG, PAGE, cleanupTemp, tempSite } from './helpers.js';

afterEach(cleanupTemp);

async function cli(cwd: string, argv: string[], opts: { input?: string; tty?: boolean; env?: Record<string, string> } = {}) {
  let out = '';
  let err = '';
  const stdout = new PassThrough() as PassThrough & { isTTY?: boolean };
  const stderr = new PassThrough();
  stdout.on('data', (d) => (out += d));
  stderr.on('data', (d) => (err += d));
  stdout.isTTY = opts.tty;
  const stdin = Readable.from(opts.input ? [opts.input] : []) as Readable & { isTTY?: boolean };
  stdin.isTTY = opts.tty;
  const code = await run(argv, { stdout, stderr, stdin, cwd, env: opts.env ?? {} });
  return { code, out, err };
}

const site = () => tempSite({ 'index.html': PAGE('Acme Bakery | Fresh bread'), 'menu.html': PAGE('Menu'), 'logo.svg': LOGO_SVG });

describe('run()', () => {
  it('prints help, version and usage errors', async () => {
    const dir = tempSite();
    expect((await cli(dir, ['--help'])).out).toMatch(/Usage/);
    expect((await cli(dir, ['help'])).code).toBe(0);
    expect((await cli(dir, [])).code).toBe(1);
    expect((await cli(dir, ['-v'])).out.trim()).toMatch(/\d/);
    expect((await cli(dir, ['fly'])).code).toBe(2);
    expect((await cli(dir, ['init', '--nope'])).err).toMatch(/unknown option/);
    expect((await cli(dir, ['doctor', '--cwd', 'missing'])).code).toBe(2);
  });

  it('runs init, build, doctor, icons and remove', async () => {
    const dir = site();
    const dry = await cli(dir, ['init', '--yes', '--dry-run', '--color']);
    expect(dry.out).toContain('\u001b[');
    expect(dry.out).toMatch(/dry run/);
    expect(existsSync(join(dir, 'sw.js'))).toBe(false);
    const init = await cli(dir, ['init', '--yes', '--theme-color', '#336699', '--offline-indicator=false']);
    expect(init.code, init.err).toBe(0);
    expect(init.out).toMatch(/done\./);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).not.toContain('data-offline');
    expect((await cli(dir, ['init', '--yes', '--quiet'])).out).toBe('');
    expect((await cli(dir, ['build', '--check'])).out).toMatch(/up to date/);
    expect((await cli(dir, ['build', '--root', '.'])).code).toBe(0);
    const doc = await cli(dir, ['doctor']);
    expect(doc.out).toMatch(/installable and offline ready/);
    expect(JSON.parse((await cli(dir, ['doctor', '--json'])).out).installable).toBe(true);
    expect((await cli(dir, ['doctor', '--quiet'])).out).not.toMatch(/pass/);
    expect((await cli(dir, ['icons', 'logo.svg', '--out', 'out', '--screenshots'])).code).toBe(0);
    expect(existsSync(join(dir, 'out', 'icons', 'screenshot-wide.png'))).toBe(true);
    expect((await cli(dir, ['remove', '--dry-run'])).out).toMatch(/removed the installkite tags from 2 files/);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain('installkite:start');
    expect((await cli(dir, ['remove'])).code).toBe(0);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).not.toContain('installkite:start');
  });

  it('reports errors with exit code 1', async () => {
    const dir = site();
    expect((await cli(dir, ['build'])).err).toMatch(/init" first/);
    expect((await cli(dir, ['init', '--yes', '--theme-color', 'nope'])).err).toMatch(/not a valid CSS color/);
    expect((await cli(dir, ['doctor', '--url', 'example.com'])).code).toBe(1);
    expect((await cli(dir, ['icons'])).code).toBe(1);
  });

  it('asks questions in a terminal and honors the answers', async () => {
    const dir = site();
    const answers = ['Acme', '', 'logo.svg', '', '#fafafa', 'full', '/shop/', 'yes', ''].join('\n');
    const r = await cli(dir, ['init', '--no-color'], { input: answers, tty: true });
    expect(r.code, r.err).toBe(0);
    const m = JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8'));
    expect(m).toMatchObject({ name: 'Acme', short_name: 'Acme', display: 'fullscreen', background_color: '#fafafa' });
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain('href="/shop/manifest.webmanifest"');
  });
});

describe('terminal helpers', () => {
  it('formats sizes and colors', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 kB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
    expect(colors(false).red('x')).toBe('x');
    expect(colors(true).sky('x')).toContain('38;5;39');
  });

  it('asks, confirms and chooses from piped answers', async () => {
    const input = Readable.from(['maybe\n', 'n\n', 'nope\n', 'mini\n']);
    const output = new PassThrough();
    let printed = '';
    output.on('data', (d) => (printed += d));
    const asker = createAsker(input, output, colors(false));
    expect(await asker.ask('Name', 'Default')).toBe('maybe');
    expect(await asker.confirm('Sure', true)).toBe(false);
    expect(await asker.choose('Mode', ['standalone', 'minimal-ui'] as const, 'standalone')).toBe('minimal-ui');
    expect(printed).toMatch(/choose one of/);
    expect(await asker.ask('After the end', 'fallback')).toBe('fallback');
    expect(await asker.confirm('Again', true)).toBe(true);
    asker.close();
  });
});
