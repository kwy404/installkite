// A small, forgiving XML parser for SVG files: elements, attributes, text,
// CDATA and character entities. Comments, processing instructions and the
// doctype are skipped.

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlElement[];
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Parses an XML document and returns its root element. Throws on input without one. */
export function parseXml(src: string): XmlElement {
  const root: XmlElement = { name: '#document', attrs: {}, children: [], text: '' };
  const stack: XmlElement[] = [root];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const lt = src.indexOf('<', i);
    const textEnd = lt === -1 ? n : lt;
    if (textEnd > i) stack[stack.length - 1]!.text += decodeEntities(src.slice(i, textEnd));
    if (lt === -1) break;
    i = lt;
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4);
      i = end === -1 ? n : end + 3;
    } else if (src.startsWith('<![CDATA[', i)) {
      const end = src.indexOf(']]>', i + 9);
      stack[stack.length - 1]!.text += src.slice(i + 9, end === -1 ? n : end);
      i = end === -1 ? n : end + 3;
    } else if (src.startsWith('<?', i)) {
      const end = src.indexOf('?>', i + 2);
      i = end === -1 ? n : end + 2;
    } else if (src.startsWith('<!', i)) {
      // Doctype, possibly with an internal subset in brackets.
      let depth = 0;
      let j = i + 2;
      for (; j < n; j++) {
        if (src[j] === '[') depth++;
        else if (src[j] === ']') depth--;
        else if (src[j] === '>' && depth <= 0) break;
      }
      i = j + 1;
    } else if (src[i + 1] === '/') {
      const end = src.indexOf('>', i);
      const name = src.slice(i + 2, end === -1 ? n : end).trim();
      // Pop to the matching element, tolerating unclosed children.
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k]!.name === name) {
          stack.length = k;
          break;
        }
      }
      i = end === -1 ? n : end + 1;
    } else {
      const m = /^<([A-Za-z_][\w:.-]*)/.exec(src.slice(i, i + 200));
      if (!m) {
        stack[stack.length - 1]!.text += '<';
        i++;
        continue;
      }
      const el: XmlElement = { name: m[1]!, attrs: {}, children: [], text: '' };
      let j = i + m[0].length;
      // Attributes.
      const attrRe = /\s*([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/y;
      for (;;) {
        while (j < n && /\s/.test(src[j]!)) j++;
        if (src[j] === '>' || src.startsWith('/>', j) || j >= n) break;
        attrRe.lastIndex = j;
        const a = attrRe.exec(src);
        if (!a || a[0].length === 0) {
          j++;
          continue;
        }
        el.attrs[a[1]!] = decodeEntities(a[3] ?? a[4] ?? a[5] ?? '');
        j = attrRe.lastIndex;
      }
      const selfClosing = src.startsWith('/>', j);
      stack[stack.length - 1]!.children.push(el);
      if (!selfClosing) stack.push(el);
      i = j + (selfClosing ? 2 : 1);
    }
  }
  const top = root.children[0];
  if (!top) throw new Error('no XML root element found');
  return top;
}
