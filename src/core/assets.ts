// Locates the bundled browser files (the service worker runtime and the
// installkite.js runtime) next to the compiled CLI, or in dist/ when running
// from source.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AssetName = 'sw-runtime.js' | 'installkite.js' | 'installkite.min.js';

function here(): string {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname === 'string' ? __dirname : process.cwd();
  }
}

/** Absolute path of a bundled asset. Throws with a hint when it is missing. */
export function assetPath(name: AssetName): string {
  const dir = here();
  const candidates = [join(dir, name), join(dir, '..', 'dist', name), join(dir, '..', '..', 'dist', name)];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`installkite: bundled file ${name} not found (looked in ${candidates.join(', ')}). Run npm run build.`);
}

/** The text of a bundled asset. */
export function readAsset(name: AssetName): string {
  return readFileSync(assetPath(name), 'utf8');
}
