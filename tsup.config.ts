import { readFileSync } from 'node:fs';
import { defineConfig, type Options } from 'tsup';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
const define = { __VERSION__: JSON.stringify(version) };
const js = (): { js: string } => ({ js: '.js' });

const browser: Options = {
  format: ['iife'],
  platform: 'browser',
  target: 'es2020',
  define,
  outExtension: js,
  sourcemap: false,
};

export default defineConfig([
  // The service worker runtime, appended to every generated sw.js.
  { ...browser, entry: { 'sw-runtime': 'src/sw/entry.ts' }, minify: true },
  // The script tag runtime: readable and minified.
  { ...browser, entry: { installkite: 'src/runtime/global.ts' }, minify: false },
  { ...browser, entry: { 'installkite.min': 'src/runtime/global.ts' }, minify: true },
  // The web checker page (docs/app/), from the same rules as doctor.
  { ...browser, entry: { checker: 'src/web/global.ts' }, minify: true, outDir: 'docs/app' },
  // The runtime as an ES module for bundlers.
  { entry: { runtime: 'src/runtime/index.ts' }, format: ['esm'], platform: 'browser', target: 'es2020', dts: true, define, outExtension: js },
  // The Node API and the CLI.
  { entry: ['src/index.ts'], format: ['esm', 'cjs'], dts: true, shims: true, target: 'node18', platform: 'node', define },
  { entry: ['src/cli.ts'], format: ['esm'], target: 'node18', platform: 'node', define },
]);
