// The tests run the real CLI and read the bundled runtimes from dist/, so
// build first when dist/ is missing or older than the sources.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const newest = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce((t, e) => {
    const p = join(dir, e.name);
    return Math.max(t, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
  }, 0);
const outputs = ['cli.js', 'index.js', 'sw-runtime.js', 'installkite.min.js'].map((f) => join(root, 'dist', f));
const stale = outputs.some((f) => !existsSync(f)) || Math.min(...outputs.map((f) => statSync(f).mtimeMs)) < Math.max(newest(join(root, 'src')), statSync(join(root, 'package.json')).mtimeMs);
if (stale) {
  console.log('building dist/ for the tests');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
}
