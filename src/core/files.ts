// File system helpers: a directory walker and glob matching.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '.hg', '.cache', '.next', '.astro', '.vercel', '.netlify', '.idea', '.vscode']);

export interface WalkedFile {
  /** Path relative to the root, forward slashes. */
  path: string;
  abs: string;
  size: number;
}

/** Lists every file under `root`, skipping dot folders and dependency folders. */
export function walk(root: string, opts: { skipDirs?: string[] } = {}): WalkedFile[] {
  const skip = new Set([...SKIP_DIRS, ...(opts.skipDirs ?? [])]);
  const out: WalkedFile[] = [];
  const visit = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (skip.has(e.name) || (e.name.startsWith('.') && e.name !== '.well-known')) continue;
        visit(abs);
      } else if (e.isFile()) {
        if (e.name.startsWith('.')) continue;
        out.push({ path: relative(root, abs).split('\\').join('/'), abs, size: statSync(abs).size });
      }
    }
  };
  visit(root);
  return out;
}

const cache = new Map<string, RegExp>();

/** Converts a glob (`**`, `*`, `?`, `{a,b}`, `[abc]`) to a regular expression. */
export function globToRegExp(glob: string): RegExp {
  const hit = cache.get(glob);
  if (hit) return hit;
  let re = '';
  let i = 0;
  let braces = 0;
  while (i < glob.length) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // "**/" matches zero or more folders; a trailing "**" matches anything.
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
        continue;
      }
      re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      braces++;
      re += '(?:';
    } else if (c === '}' && braces > 0) {
      braces--;
      re += ')';
    } else if (c === ',' && braces > 0) re += '|';
    else if (c === '[') {
      const end = glob.indexOf(']', i);
      if (end > i) {
        re += `[${glob.slice(i + 1, end).replace(/^!/, '^').replace(/\\/g, '\\\\')}]`;
        i = end + 1;
        continue;
      }
      re += '\\[';
    } else re += c.replace(/[.+^$()|\\]/g, '\\$&');
    i++;
  }
  const out = new RegExp(`^${re}$`, 'i');
  cache.set(glob, out);
  return out;
}

/** True when the path matches any of the globs. A glob without a slash also matches by file name. */
export function matchAny(path: string, globs: readonly string[]): boolean {
  return globs.some((g) => {
    const re = globToRegExp(g);
    if (re.test(path)) return true;
    return !g.includes('/') && re.test(path.slice(path.lastIndexOf('/') + 1));
  });
}
