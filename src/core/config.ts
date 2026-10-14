// installkite.config.json: what init decided, so build and doctor can run
// again without questions (in CI, after every site build).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Display, ShortcutInput } from './manifest.js';
import type { ServiceWorkerOptions } from './sw.js';

export const CONFIG_FILE = 'installkite.config.json';
export const SCHEMA_URL = 'https://kwy404.github.io/installkite/config.schema.json';

export interface RuntimeConfig {
  /** "local" copies installkite.js into the site, "cdn" links jsDelivr, "none" leaves registration to you. */
  mode: 'local' | 'cdn' | 'none';
  /** "auto" shows a floating install button when the site can be installed; "none" hides it. */
  installButton: 'auto' | 'none';
  /** Show the "Refresh to update" toast when a new version is ready. */
  updateToast: boolean;
  /** Show a small badge while the device is offline. */
  offlineIndicator: boolean;
}

export interface InstallkiteConfig {
  $schema?: string;
  /** The deployed folder (precached by build), relative to the config file. */
  root: string;
  /** Where the generated static files are written, relative to the config file. */
  publicDir: string;
  /** The URL path the site is served under: "/" or "/repo/" on GitHub Pages. */
  base: string;
  /** Write per page relative URLs in head tags instead of base absolute ones. */
  relative?: boolean;
  /** The production URL, used by doctor --url. */
  url?: string;
  /** The icon source image, relative to the config file. */
  icon: string;
  /** Folder for the icons inside publicDir. */
  iconsDir: string;
  /** HTML files the head tags are injected into (relative paths or globs). */
  html: string[];
  app: {
    name: string;
    shortName: string;
    description?: string;
    lang?: string;
    display: Display;
    themeColor: string;
    themeColorDark?: string;
    backgroundColor: string;
    startUrl: string;
    scope: string;
    orientation?: string;
    categories?: string[];
    shortcuts?: ShortcutInput[];
    screenshots: boolean;
  };
  runtime: RuntimeConfig;
  sw: ServiceWorkerOptions & {
    include?: string[];
    exclude?: string[];
    maxFileSize?: number;
  };
  /** Revisions of the generated placeholder screenshots, so doctor can remind you to replace them. */
  placeholders?: Record<string, string>;
}

/** Reads installkite.config.json from a folder, or null when there is none. */
export function readConfig(cwd: string): InstallkiteConfig | null {
  const path = join(cwd, CONFIG_FILE);
  if (!existsSync(path)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`${CONFIG_FILE} is not valid JSON: ${(e as Error).message}`);
  }
  return validateConfig(raw);
}

/** Checks the shape of a parsed config and fills defaults for optional parts. */
export function validateConfig(raw: unknown): InstallkiteConfig {
  if (!raw || typeof raw !== 'object') throw new Error(`${CONFIG_FILE} must contain an object`);
  const c = raw as Partial<InstallkiteConfig>;
  for (const key of ['root', 'publicDir', 'base', 'icon'] as const) {
    if (typeof c[key] !== 'string') throw new Error(`${CONFIG_FILE}: "${key}" must be a string`);
  }
  if (!c.app || typeof c.app.name !== 'string') throw new Error(`${CONFIG_FILE}: "app.name" is required`);
  return {
    ...c,
    iconsDir: c.iconsDir ?? 'icons',
    html: c.html ?? [],
    runtime: { mode: 'local', installButton: 'auto', updateToast: true, offlineIndicator: true, ...(c.runtime || {}) },
    sw: c.sw ?? {},
    app: {
      ...c.app,
      display: c.app.display ?? 'standalone',
      startUrl: c.app.startUrl ?? './',
      scope: c.app.scope ?? './',
      screenshots: c.app.screenshots ?? false,
      backgroundColor: c.app.backgroundColor ?? '#ffffff',
      themeColor: c.app.themeColor ?? '#3b82f6',
    },
  } as InstallkiteConfig;
}

/** Serializes the config with a stable layout. */
export function stringifyConfig(c: InstallkiteConfig): string {
  const { $schema: _schema, ...rest } = c;
  return `${JSON.stringify({ $schema: SCHEMA_URL, ...rest }, null, 2)}\n`;
}
