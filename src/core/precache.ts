// The precache manifest: which built files the service worker downloads on
// install, each with a content hash as its revision. A file is fetched
// again only when its hash changes.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { matchAny, walk } from './files.js';

export interface PrecacheEntry {
  /** URL relative to the service worker, for example "index.html" or "assets/app.3f2a.js". */
  url: string;
  /** Content hash (first 12 hex characters of SHA-256). */
  revision: string;
  size: number;
}

export interface PrecacheOptions {
  /** Globs of files to precache, relative to the site root. */
  include?: string[];
  /** Globs to leave out (they are still cached at runtime when requested). */
  exclude?: string[];
  /** Files larger than this many bytes are skipped. Default 2 MiB. */
  maxFileSize?: number;
}

export const DEFAULT_INCLUDE = [
  '**/*.html',
  '**/*.css',
  '**/*.js',
  '**/*.mjs',
  '**/*.webmanifest',
  '**/*.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'favicon.ico',
  'favicon-32x32.png',
  'apple-touch-icon.png',
];

export const DEFAULT_EXCLUDE = ['sw.js', 'installkite.config.json', '**/*.map', '**/*.LICENSE.txt', 'googl*.html'];

export const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024;

/** Hash of some bytes as the short hex revision installkite uses. */
export function revisionOf(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 12);
}

/** Encodes a relative file path as a URL path (spaces and unicode escaped, slashes kept). */
export function pathToUrl(path: string): string {
  return path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
}

export interface PrecacheResult {
  entries: PrecacheEntry[];
  totalSize: number;
  /** Files that matched include but were skipped, with the reason. */
  skipped: Array<{ path: string; reason: string }>;
  /** A hash of the whole list: changes whenever any file changes. */
  version: string;
}

/** Scans the site root and builds the precache manifest. */
export function buildPrecache(root: string, opts: PrecacheOptions = {}): PrecacheResult {
  const include = opts.include ?? DEFAULT_INCLUDE;
  const exclude = [...DEFAULT_EXCLUDE, ...(opts.exclude ?? [])];
  const max = opts.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const entries: PrecacheEntry[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  for (const f of walk(root)) {
    if (!matchAny(f.path, include) || matchAny(f.path, exclude)) continue;
    if (f.size > max) {
      skipped.push({ path: f.path, reason: `larger than ${Math.round(max / 1024)} kB` });
      continue;
    }
    entries.push({ url: pathToUrl(f.path), revision: revisionOf(readFileSync(f.abs)), size: f.size });
  }
  entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  return {
    entries,
    totalSize: entries.reduce((n, e) => n + e.size, 0),
    skipped,
    version: precacheVersion(entries),
  };
}

/** The version hash of a precache list (urls and revisions, order independent). */
export function precacheVersion(entries: Array<Pick<PrecacheEntry, 'url' | 'revision'>>): string {
  const sorted = [...entries].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  return revisionOf(sorted.map((e) => `${e.url} ${e.revision}`).join('\n')).slice(0, 10);
}
