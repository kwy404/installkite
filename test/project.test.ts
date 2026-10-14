import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyPlan, expandHtml, planBuild, planIcons, planInit } from '../src/core/project.js';
import { readConfig } from '../src/core/config.js';
import { readSwSettings } from '../src/core/sw.js';
import { LOGO_SVG, PAGE, cleanupTemp, discPng, tempSite } from './helpers.js';

afterEach(cleanupTemp);

describe('planInit', () => {
  it('writes every option into the config, manifest, tags and worker', () => {
    const dir = tempSite({ 'index.html': PAGE(), 'logo.svg': LOGO_SVG });
    const plan = planInit(dir, {
      name: 'Acme',
      themeColor: 'teal',
      themeColorDark: '#000',
      orientation: 'portrait',
      relative: true,
      url: 'https://acme.example/',
      offline: false,
      navigationTimeout: 1500,
      installButton: 'none',
      updateToast: false,
      offlineIndicator: false,
      shortcuts: false,
      screenshots: false,
      lang: 'pt',
      description: 'Bread',
    });
    applyPlan(dir, plan.files);
    const cfg = readConfig(dir)!;
    expect(cfg).toMatchObject({ relative: true, url: 'https://acme.example/', app: { themeColorDark: '#000000', orientation: 'portrait', lang: 'pt' }, sw: { offline: null, navigationTimeout: 1500 } });
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(html).toContain('href="./manifest.webmanifest"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
    expect(html).toContain('data-update="none"');
    expect(html).not.toContain('data-install');
    const sw = readSwSettings(readFileSync(join(dir, 'sw.js'), 'utf8'))!;
    expect(sw.offline).toBeNull();
    expect(sw.navigationTimeout).toBe(1500);
    expect(plan.files.find((f) => f.path === 'offline.html')).toBeUndefined();
    const m = JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8'));
    expect(m.orientation).toBe('portrait');
    expect(m.shortcuts).toBeUndefined();
  });

  it('keeps earlier answers on a second run and notes kept tags', () => {
    const dir = tempSite({ 'index.html': PAGE('Acme', '\n  <link rel="icon" href="own.ico">'), 'mark.png': discPng(512) });
    applyPlan(dir, planInit(dir, { icon: 'mark.png', name: 'First Name', backgroundColor: '#123456' }).files);
    const again = planInit(dir, {});
    expect(again.config.app.name).toBe('First Name');
    expect(again.config.icon).toBe('mark.png');
    expect(again.config.app.backgroundColor).toBe('#123456');
    expect(again.notes.join(' ')).toMatch(/kept the page's own favicon/);
    expect(again.files.filter((f) => f.action !== 'unchanged').map((f) => f.path)).toEqual([]);
  });

  it('does not append the build step twice and leaves plain sites alone', () => {
    const pkg = { scripts: { build: 'astro build && npx installkite build' }, dependencies: { astro: '5' } };
    const dir = tempSite({ 'package.json': JSON.stringify(pkg), 'public/logo.svg': LOGO_SVG });
    const plan = planInit(dir, {});
    expect(plan.files.some((f) => f.path === 'package.json')).toBe(false);
    expect(plan.snippet).toContain('<link rel="manifest"');
    expect(plan.files.some((f) => f.path === 'public/sw.js')).toBe(true);
  });
});

describe('planBuild', () => {
  it('adds the tags to pages a generator rebuilt and re-hashes the worker', () => {
    const dir = tempSite({ 'index.html': PAGE(), 'logo.svg': LOGO_SVG });
    applyPlan(dir, planInit(dir, {}).files);
    writeFileSync(join(dir, 'index.html'), PAGE('Rebuilt'));
    writeFileSync(join(dir, 'new.html'), PAGE('New'));
    const build = planBuild(dir);
    expect(build.files.map((f) => f.path).sort()).toEqual(['index.html', 'new.html', 'sw.js']);
    applyPlan(dir, build.files);
    expect(planBuild(dir).files.every((f) => f.action === 'unchanged')).toBe(true);
    expect(build.entries.some((e) => e.url === 'new.html')).toBe(true);
    expect(() => planBuild(tempSite())).toThrow(/init" first/);
  });

  it('builds a framework project from the deployed folder', () => {
    const pkg = { scripts: { build: 'vite build' }, devDependencies: { vite: '6' } };
    const dir = tempSite({ 'package.json': JSON.stringify(pkg), 'index.html': PAGE(), 'public/logo.svg': LOGO_SVG });
    applyPlan(dir, planInit(dir, {}).files);
    expect(() => planBuild(dir)).toThrow(/does not exist/);
    writeFileSync(join(dir, 'public', 'extra.css'), 'x');
    const distFiles = { 'dist/index.html': readFileSync(join(dir, 'index.html'), 'utf8'), 'dist/assets/app.123.js': 'console.log(1)' };
    for (const [p, c] of Object.entries(distFiles)) {
      const abs = join(dir, p);
      mkdirSync(join(abs, '..'), { recursive: true });
      writeFileSync(abs, c);
    }
    const build = planBuild(dir);
    expect(build.files.map((f) => f.path)).toEqual(['dist/sw.js']);
    expect(build.entries.map((e) => e.url)).toContain('assets/app.123.js');
  });
});

describe('helpers', () => {
  it('expands explicit html files and globs, skipping the offline page', () => {
    const dir = tempSite({ 'a.html': 'a', 'b/c.html': 'c', 'offline.html': 'o', 'googleabc.html': 'g' });
    expect(expandHtml(dir, { html: ['a.html', 'missing.html'] })).toEqual(['a.html']);
    expect(expandHtml(dir, { html: ['**/*.html'] })).toEqual(['a.html', 'b/c.html']);
  });

  it('plans a standalone icon set', () => {
    const dir = tempSite({ 'logo.svg': LOGO_SVG });
    const files = planIcons(dir, 'logo.svg', 'static', { screenshots: true, themeColor: '#123456' });
    expect(files.some((f) => f.path === 'static/icons/icon-512.png')).toBe(true);
    expect(files.some((f) => f.path === 'static/favicon.ico')).toBe(true);
  });
});
