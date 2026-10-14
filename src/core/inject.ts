// Idempotent head tag injection. installkite owns one block between two
// marker comments; running it again replaces that block in place, and tags
// the page already has outside the block (its own favicon, manifest or
// theme color) are kept and not duplicated.

export const MARK_START = '<!-- installkite:start -->';
export const MARK_END = '<!-- installkite:end -->';
const BLOCK_RE = /([ \t]*)<!-- installkite:start -->[\s\S]*?<!-- installkite:end -->[ \t]*(\r?\n)?/;

export interface HeadOptions {
  /**
   * Prefix for every URL: an absolute base like "/" or "/my-repo/", or a
   * relative one like "./" or "../" (see relativePrefix).
   */
  base: string;
  /** App name for the iOS home screen label. */
  appName: string;
  themeColor: string;
  /** Optional dark mode theme color. */
  themeColorDark?: string;
  manifest?: string;
  /** Write an SVG favicon link (when the source was SVG). */
  svgIcon?: string | false;
  /** iOS status bar style. */
  statusBarStyle?: 'default' | 'black' | 'black-translucent';
  /**
   * The runtime script. A path is prefixed with base, a full URL (CDN) is
   * used as is. false leaves registration to you.
   */
  runtime?: string | false;
  /** data- attributes for the runtime script tag (without the data- prefix). */
  runtimeAttrs?: Record<string, string | true>;
  /** Service worker path, passed to the runtime as data-sw. */
  sw?: string;
}

export interface HeadTag {
  /** Which kind of tag, for messages: "manifest", "theme-color", ... */
  key: string;
  html: string;
  /** Matches an equivalent tag the page already has. */
  existing: RegExp;
}

const attr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function join(base: string, path: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.startsWith('//')) return path;
  const b = base === '' ? './' : base.endsWith('/') ? base : `${base}/`;
  return b + path.replace(/^\.?\//, '');
}

/** The tags installkite manages, in the order they are written. */
export function headTags(o: HeadOptions): HeadTag[] {
  const u = (p: string): string => attr(join(o.base, p));
  const tags: HeadTag[] = [];
  tags.push({ key: 'manifest', html: `<link rel="manifest" href="${u(o.manifest ?? 'manifest.webmanifest')}">`, existing: /<link\b[^>]*\brel\s*=\s*["']?manifest\b/i });
  if (o.themeColorDark) {
    tags.push({
      key: 'theme-color',
      html: `<meta name="theme-color" content="${attr(o.themeColor)}" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="${attr(o.themeColorDark)}" media="(prefers-color-scheme: dark)">`,
      existing: /<meta\b[^>]*\bname\s*=\s*["']?theme-color\b/i,
    });
  } else {
    tags.push({ key: 'theme-color', html: `<meta name="theme-color" content="${attr(o.themeColor)}">`, existing: /<meta\b[^>]*\bname\s*=\s*["']?theme-color\b/i });
  }
  const favicon = [`<link rel="icon" href="${u('favicon.ico')}" sizes="48x48">`];
  if (o.svgIcon) favicon.push(`<link rel="icon" href="${u(o.svgIcon)}" type="image/svg+xml">`);
  else favicon.push(`<link rel="icon" href="${u('favicon-32x32.png')}" type="image/png" sizes="32x32">`);
  tags.push({ key: 'favicon', html: favicon.join('\n'), existing: /<link\b[^>]*\brel\s*=\s*["']?(?:shortcut\s+)?icon\b/i });
  tags.push({ key: 'apple-touch-icon', html: `<link rel="apple-touch-icon" href="${u('apple-touch-icon.png')}">`, existing: /<link\b[^>]*\brel\s*=\s*["']?apple-touch-icon\b/i });
  tags.push({ key: 'mobile-web-app-capable', html: '<meta name="mobile-web-app-capable" content="yes">', existing: /<meta\b[^>]*\bname\s*=\s*["']?mobile-web-app-capable\b/i });
  tags.push({
    key: 'apple-mobile-web-app-title',
    html: `<meta name="apple-mobile-web-app-title" content="${attr(o.appName)}">`,
    existing: /<meta\b[^>]*\bname\s*=\s*["']?apple-mobile-web-app-title\b/i,
  });
  tags.push({
    key: 'apple-mobile-web-app-status-bar-style',
    html: `<meta name="apple-mobile-web-app-status-bar-style" content="${o.statusBarStyle ?? 'default'}">`,
    existing: /<meta\b[^>]*\bname\s*=\s*["']?apple-mobile-web-app-status-bar-style\b/i,
  });
  if (o.runtime !== false) {
    const src = /^(?:[a-z]+:)?\/\//i.test(o.runtime ?? '') ? (o.runtime as string) : join(o.base, o.runtime ?? 'installkite.js');
    const attrs: string[] = [];
    if (o.sw) attrs.push(`data-sw="${u(o.sw)}"`);
    for (const [k, v] of Object.entries(o.runtimeAttrs ?? {})) attrs.push(v === true ? `data-${k}` : `data-${k}="${attr(v)}"`);
    tags.push({
      key: 'runtime',
      html: `<script src="${attr(src)}"${attrs.length ? ` ${attrs.join(' ')}` : ''} defer></script>`,
      existing: /<script\b[^>]*\bsrc\s*=\s*["'][^"']*installkite(?:\.min)?\.js|navigator\.serviceWorker\.register\s*\(/i,
    });
  }
  return tags;
}

/**
 * The relative prefix from an HTML file to the site root, for sites that
 * should work under any path: "index.html" gives "./", "blog/a.html" "../".
 */
export function relativePrefix(fileFromRoot: string): string {
  const depth = fileFromRoot.replace(/\\/g, '/').replace(/^\.\//, '').split('/').length - 1;
  return depth === 0 ? './' : '../'.repeat(depth);
}

export interface InjectResult {
  html: string;
  /** inserted: a new block; updated: an existing block changed; unchanged: nothing to do. */
  action: 'inserted' | 'updated' | 'unchanged';
  /** Tag kinds skipped because the page already has its own. */
  kept: string[];
}

/** Removes the installkite block, leaving the rest of the page untouched. */
export function removeHead(html: string): { html: string; removed: boolean } {
  if (!BLOCK_RE.test(html)) return { html, removed: false };
  return { html: html.replace(BLOCK_RE, ''), removed: true };
}

/** Inserts or refreshes the installkite block in an HTML document. */
export function injectHead(html: string, o: HeadOptions): InjectResult {
  const eol = /\r\n/.test(html) ? '\r\n' : '\n';
  const existingBlock = BLOCK_RE.exec(html);
  // Look for the page's own tags with our block taken out.
  const outside = existingBlock ? html.replace(BLOCK_RE, '') : html;
  const headPart = /<head\b[\s\S]*?(?:<\/head>|<body\b)/i.exec(outside)?.[0] ?? outside;
  const kept: string[] = [];
  const tags = headTags(o).filter((t) => {
    if (t.existing.test(headPart.replace(/<!--[\s\S]*?-->/g, ''))) {
      kept.push(t.key);
      return false;
    }
    return true;
  });

  let indent = '  ';
  if (existingBlock) indent = existingBlock[1] ?? '';
  else {
    const close = /([ \t]*)<\/head>/i.exec(html);
    const before = close ? html.slice(0, close.index) : '';
    const lastLine = /(?:^|\n)([ \t]*)\S[^\n]*\n?$/.exec(before.replace(/\r/g, ''));
    if (lastLine && close && !/<head\b[^>]*>\s*$/i.test(before)) indent = lastLine[1] ?? '';
    else if (close) indent = `${close[1] ?? ''}  `;
  }
  const lines = [MARK_START, ...tags.flatMap((t) => t.html.split('\n')), MARK_END];
  const block = lines.map((l) => indent + l).join(eol) + eol;

  if (existingBlock) {
    const next = html.replace(BLOCK_RE, () => block);
    return { html: next, action: next === html ? 'unchanged' : 'updated', kept };
  }
  const closeHead = /([ \t]*)<\/head>/i.exec(html);
  let out: string;
  if (closeHead) {
    // Insert on its own line right before </head>.
    const at = closeHead.index;
    const lineStart = html.lastIndexOf('\n', at - 1) + 1;
    const onOwnLine = /^[ \t]*$/.test(html.slice(lineStart, at));
    out = onOwnLine ? html.slice(0, lineStart) + block + html.slice(lineStart) : `${html.slice(0, at)}${eol}${block}${html.slice(at)}`;
  } else {
    const headOpen = /<head\b[^>]*>[ \t]*\r?\n?/i.exec(html);
    const body = /<body\b/i.exec(html);
    const htmlOpen = /<html\b[^>]*>[ \t]*\r?\n?/i.exec(html);
    if (headOpen) {
      // An unclosed <head>: append right after its start tag.
      const at = headOpen.index + headOpen[0].length;
      out = `${html.slice(0, at)}${/\n$/.test(headOpen[0]) ? '' : eol}${block}${html.slice(at)}`;
    } else if (body) {
      out = `${html.slice(0, body.index)}<head>${eol}${block}</head>${eol}${html.slice(body.index)}`;
    } else if (htmlOpen) {
      const at = htmlOpen.index + htmlOpen[0].length;
      out = `${html.slice(0, at)}${block}${html.slice(at)}`;
    } else {
      out = block + html;
    }
  }
  return { html: out, action: 'inserted', kept };
}

/** True when the document has an installkite block. */
export function hasBlock(html: string): boolean {
  return BLOCK_RE.test(html);
}
