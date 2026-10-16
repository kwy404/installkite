// Reads the head of an HTML document: title, description, colors, the
// manifest link, icons and links. No Node APIs, so the browser checker
// bundles it too.
import { decodeEntities } from './xml.js';

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
