import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildPrecache, pathToUrl, precacheVersion, revisionOf } from '../src/core/precache.js';
import { globToRegExp, matchAny, walk } from '../src/core/files.js';
import { generateServiceWorker, readSwSettings, swSettings } from '../src/core/sw.js';
import { cleanupTemp, tempSite } from './helpers.js';

afterEach(cleanupTemp);

const site = () =>
  tempSite({
    'index.html': '<h1>home</h1>',
    'about/index.html': '<h1>about</h1>',
    'assets/app.js': 'console.log(1)',
    'assets/app.js.map': '{}',
    'assets/style.css': 'body{}',
    'photos/big.jpg': 'x'.repeat(100),
    'my file.html': 'spaces',
    'sw.js': 'old worker',
    '.hidden/secret.html': 'no',
    'node_modules/pkg/index.js': 'no',
    'googleabc123.html': 'verification',
    'installkite.config.json': '{}',
  });

describe('precache manifest', () => {
  it('hashes the built files that match the include globs', () => {
    const dir = site();
    const r = buildPrecache(dir);
    expect(r.entries.map((e) => e.url)).toEqual(['about/index.html', 'assets/app.js', 'assets/style.css', 'index.html', 'my%20file.html']);
    const index = r.entries.find((e) => e.url === 'index.html')!;
    expect(index.revision).toBe(revisionOf('<h1>home</h1>'));
    expect(index.revision).toMatch(/^[0-9a-f]{12}$/);
    expect(r.totalSize).toBe(r.entries.reduce((n, e) => n + e.size, 0));
    expect(r.version).toMatch(/^[0-9a-f]{10}$/);
  });

  it('changes the revision and version only when content changes', () => {
    const dir = site();
    const a = buildPrecache(dir);
    expect(buildPrecache(dir).version).toBe(a.version);
    writeFileSync(join(dir, 'assets/style.css'), 'body{color:red}');
    const b = buildPrecache(dir);
    expect(b.version).not.toBe(a.version);
    const changed = b.entries.filter((e, i) => e.revision !== a.entries[i]!.revision).map((e) => e.url);
    expect(changed).toEqual(['assets/style.css']);
  });

  it('honors include, exclude and the size limit', () => {
    const dir = site();
    const r = buildPrecache(dir, { include: ['**/*.html', '**/*.jpg'], exclude: ['about/**'], maxFileSize: 50 });
    expect(r.entries.map((e) => e.url)).toEqual(['index.html', 'my%20file.html']);
    expect(r.skipped).toEqual([{ path: 'photos/big.jpg', reason: 'larger than 0 kB' }]);
  });

  it('computes an order independent version', () => {
    const e = [
      { url: 'a', revision: '1' },
      { url: 'b', revision: '2' },
    ];
    expect(precacheVersion(e)).toBe(precacheVersion([...e].reverse()));
    expect(pathToUrl(`dir with space/caf${String.fromCharCode(233)}.html`)).toBe('dir%20with%20space/caf%C3%A9.html');
  });
});

describe('globs and walking', () => {
  it('matches globs like a shell', () => {
    expect(globToRegExp('**/*.html').test('a/b/c.html')).toBe(true);
    expect(globToRegExp('**/*.html').test('c.html')).toBe(true);
    expect(globToRegExp('*.html').test('a/c.html')).toBe(false);
    expect(globToRegExp('assets/*.{js,css}').test('assets/x.css')).toBe(true);
    expect(globToRegExp('file?.txt').test('file1.txt')).toBe(true);
    expect(globToRegExp('[ab].txt').test('b.txt')).toBe(true);
    expect(globToRegExp('[!ab].txt').test('b.txt')).toBe(false);
    expect(globToRegExp('dist/**').test('dist/a/b')).toBe(true);
    expect(matchAny('deep/sw.js', ['sw.js'])).toBe(true);
    expect(matchAny('deep/sw.js', ['/sw.js'])).toBe(false);
  });

  it('skips dot folders and dependency folders', () => {
    const files = walk(site()).map((f) => f.path);
    expect(files).not.toContain('.hidden/secret.html');
    expect(files.some((f) => f.startsWith('node_modules'))).toBe(false);
    expect(files).toContain('about/index.html');
  });
});

describe('sw.js generation', () => {
  const entries = [
    { url: 'index.html', revision: 'aaa' },
    { url: 'app.js', revision: 'bbb' },
  ];

  it('embeds the precache list and only non default settings', () => {
    const s = swSettings(entries, { navigationTimeout: 3000, imageMaxEntries: 10, exclude: ['/api/'] });
    expect(s.precache).toEqual([
      ['index.html', 'aaa'],
      ['app.js', 'bbb'],
    ]);
    expect(s.navigationTimeout).toBeUndefined();
    expect(s.imageMaxEntries).toBe(10);
    expect(s.exclude).toEqual(['/api/']);
  });

  it('writes a worker that reads back', () => {
    const src = generateServiceWorker(entries, { skipWaiting: true, importScripts: ['push.js'] }, { version: '9.9.9', runtime: '/* runtime */' });
    expect(src).toContain('installkite 9.9.9');
    expect(src).toContain('importScripts("push.js");');
    expect(src.trimEnd().endsWith('/* runtime */')).toBe(true);
    const back = readSwSettings(src)!;
    expect(back.version).toBe(precacheVersion(entries));
    expect(back.skipWaiting).toBe(true);
    expect(readSwSettings('self.foo = 1;')).toBeNull();
    expect(readSwSettings('self.__INSTALLKITE__ = {broken;')).toBeNull();
  });
});
