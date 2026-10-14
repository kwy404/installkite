import { describe, expect, it } from 'vitest';
import { MARK_END, MARK_START, hasBlock, headTags, injectHead, relativePrefix, removeHead, type HeadOptions } from '../src/core/inject.js';
import { diffLines, unifiedDiff } from '../src/core/diff.js';
import { PAGE } from './helpers.js';

const opts: HeadOptions = { base: '/', appName: 'Acme', themeColor: '#e8590c', runtime: 'installkite.js', sw: 'sw.js', runtimeAttrs: { install: 'auto' } };

describe('head tags', () => {
  it('builds the tags with the base path', () => {
    const html = headTags({ ...opts, base: '/repo/', svgIcon: 'icons/icon.svg' })
      .map((t) => t.html)
      .join('\n');
    expect(html).toContain('<link rel="manifest" href="/repo/manifest.webmanifest">');
    expect(html).toContain('<link rel="icon" href="/repo/icons/icon.svg" type="image/svg+xml">');
    expect(html).toContain('<script src="/repo/installkite.js" data-sw="/repo/sw.js" data-install="auto" defer></script>');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Acme">');
  });

  it('uses CDN URLs as is, escapes attributes and supports dark theme colors', () => {
    const html = headTags({ ...opts, appName: 'A "quoted" <name>', runtime: 'https://cdn.example.com/ik.js', themeColorDark: '#111111', runtimeAttrs: { manual: true } })
      .map((t) => t.html)
      .join('\n');
    expect(html).toContain('src="https://cdn.example.com/ik.js"');
    expect(html).toContain('data-manual defer');
    expect(html).toContain('content="A &quot;quoted&quot; &lt;name>"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
    expect(headTags({ ...opts, runtime: false }).some((t) => t.key === 'runtime')).toBe(false);
  });

  it('computes relative prefixes from page depth', () => {
    expect(relativePrefix('index.html')).toBe('./');
    expect(relativePrefix('blog/post.html')).toBe('../');
    expect(relativePrefix('a\\b\\c.html')).toBe('../../');
    const html = headTags({ ...opts, base: '../' }).map((t) => t.html).join('\n');
    expect(html).toContain('href="../manifest.webmanifest"');
  });
});

describe('injectHead', () => {
  it('inserts one block before </head> with matching indentation', () => {
    const res = injectHead(PAGE(), opts);
    expect(res.action).toBe('inserted');
    expect(res.html).toContain(`  ${MARK_START}\n  <link rel="manifest"`);
    expect(res.html.indexOf(MARK_END)).toBeLessThan(res.html.indexOf('</head>'));
    expect(res.html).toMatch(/<!-- installkite:end -->\n<\/head>/);
    expect(hasBlock(res.html)).toBe(true);
  });

  it('is idempotent: a second run changes nothing', () => {
    const once = injectHead(PAGE(), opts).html;
    const twice = injectHead(once, opts);
    expect(twice.action).toBe('unchanged');
    expect(twice.html).toBe(once);
    expect(twice.html.split(MARK_START)).toHaveLength(2);
  });

  it('updates the block in place when options change', () => {
    const once = injectHead(PAGE(), opts).html;
    const next = injectHead(once, { ...opts, themeColor: '#000000' });
    expect(next.action).toBe('updated');
    expect(next.html).toContain('content="#000000"');
    expect(next.html).not.toContain('#e8590c');
    expect(next.html.split(MARK_START)).toHaveLength(2);
  });

  it('keeps tags the page already has and does not duplicate them', () => {
    const page = PAGE('Acme', '\n  <link rel="icon" href="/my.ico">\n  <meta name="theme-color" content="#123456">');
    const res = injectHead(page, opts);
    expect(res.kept).toEqual(['theme-color', 'favicon']);
    expect(res.html.match(/name="theme-color"/g)).toHaveLength(1);
    expect(res.html).not.toContain('favicon.ico');
    // Tags in comments do not count.
    const commented = injectHead(PAGE('Acme', '\n  <!-- <link rel="manifest" href="x"> -->'), opts);
    expect(commented.kept).toEqual([]);
    // A page that registers its own service worker keeps it.
    const own = injectHead(PAGE('A', "\n  <script>navigator.serviceWorker.register('/my-sw.js')</script>"), opts);
    expect(own.kept).toContain('runtime');
  });

  it('preserves CRLF line endings', () => {
    const crlf = PAGE().replace(/\n/g, '\r\n');
    const res = injectHead(crlf, opts).html;
    expect(res.includes('\n') && !/[^\r]\n/.test(res)).toBe(true);
    expect(injectHead(res, opts).action).toBe('unchanged');
  });

  it('handles pages without a head, with an unclosed head, or with nothing', () => {
    const noHead = injectHead('<!doctype html><html><body><p>x</p></body></html>', opts).html;
    expect(noHead).toMatch(/<head>\n\s*<!-- installkite:start -->[\s\S]*<!-- installkite:end -->\n<\/head>\n<body>/);
    const unclosed = injectHead('<html><head><title>x</title>\n<body>y</body></html>', opts).html;
    expect(unclosed.match(/<head>/g)).toHaveLength(1);
    expect(unclosed.indexOf(MARK_START)).toBeGreaterThan(unclosed.indexOf('<head>'));
    const htmlOnly = injectHead('<html lang="en">\n<p>hi</p></html>', opts).html;
    expect(htmlOnly.startsWith('<html lang="en">\n')).toBe(true);
    const fragment = injectHead('<p>hi</p>', opts).html;
    expect(fragment.trimStart().startsWith(MARK_START)).toBe(true);
    const sameLine = injectHead('<html><head><title>x</title></head><body></body></html>', opts).html;
    expect(sameLine).toMatch(/<title>x<\/title>\n.*installkite:start/);
  });

  it('removes the block cleanly', () => {
    const page = PAGE();
    const back = removeHead(injectHead(page, opts).html);
    expect(back.removed).toBe(true);
    expect(back.html).toBe(page);
    expect(removeHead(page)).toEqual({ html: page, removed: false });
  });
});

describe('diff', () => {
  it('finds the shortest edit script', () => {
    const ops = diffLines(['a', 'b', 'c', 'd'], ['a', 'x', 'c', 'd', 'e']);
    expect(ops.map((o) => `${o.type[0]}${o.line}`)).toEqual(['ea', 'rb', 'ax', 'ec', 'ed', 'ae']);
    expect(diffLines([], ['a'])).toEqual([{ type: 'add', line: 'a' }]);
    expect(diffLines(['a'], [])).toEqual([{ type: 'remove', line: 'a' }]);
  });

  it('prints unified diffs with hunk headers and context', () => {
    const a = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const b = a.replace('line 10', 'line ten').replace('line 20', 'line 20\nline 21');
    const d = unifiedDiff(a, b, 'index.html');
    expect(d).toContain('--- a/index.html\n+++ b/index.html');
    expect(d).toContain('@@ -7,7 +7,7 @@');
    expect(d).toContain('-line 10\n+line ten');
    expect(d).toContain(['@@ -18,3 +18,4 @@', ' line 18', ' line 19', ' line 20', '+line 21'].join('\n'));
    expect(unifiedDiff('same', 'same', 'x')).toBe('');
    expect(unifiedDiff('', 'new\n', 'f')).toContain('@@ -0,0 +1,1 @@');
    expect(unifiedDiff('a', 'b', 'f', { color: true })).toContain('\u001b[31m-a');
  });
});
