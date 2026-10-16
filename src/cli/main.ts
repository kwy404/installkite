// The installkite command line: init, build, doctor, icons and remove.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CONFIG_FILE, readConfig } from '../core/config.js';
import { doctorLocal, doctorRemote, normalizeSiteUrl, type DoctorReport } from '../core/doctor.js';
import { removeHead } from '../core/inject.js';
import { DISPLAY_MODES, type Display } from '../core/manifest.js';
import { applyPlan, expandHtml, planBuild, planIcons, planInit, type InitAnswers, type PlannedFile } from '../core/project.js';
import { scanSite, type ScanResult } from '../core/scan.js';
import { VERSION } from '../version.js';
import { ArgError, closest, parseArgs, type ArgSpec, type ParsedArgs } from './args.js';
import { colors, createAsker, formatBytes, type Colors } from './ui.js';

export interface Io {
  stdout: NodeJS.WritableStream & { isTTY?: boolean };
  stderr: NodeJS.WritableStream;
  stdin: NodeJS.ReadableStream & { isTTY?: boolean };
  cwd: string;
  env: Record<string, string | undefined>;
}

const SPEC: ArgSpec = {
  values: ['root', 'public', 'base', 'icon', 'name', 'short-name', 'description', 'theme-color', 'theme-color-dark', 'background-color', 'display', 'start-url', 'scope', 'lang', 'out', 'url', 'background', 'cwd', 'timeout', 'orientation'],
  booleans: [
    'yes',
    'dry-run',
    'inject',
    'install-button',
    'update-toast',
    'offline-indicator',
    'screenshots',
    'offline-page',
    'shortcuts',
    'cdn',
    'runtime',
    'postbuild',
    'relative',
    'check',
    'json',
    'strict',
    'help',
    'version',
    'color',
    'quiet',
  ],
  aliases: { y: 'yes', h: 'help', v: 'version', n: 'dry-run', q: 'quiet' },
};

const HELP = `installkite ${VERSION}: make any website installable and offline capable

Usage
  npx installkite init [options]      manifest, icons, service worker, offline page and head tags
  npx installkite build [options]     refresh the precache list after each site build (CI)
  npx installkite doctor [url]        audit installability and offline readiness
  npx installkite icons <image>       only the icon set from one PNG or SVG
  npx installkite remove              take the installkite tags out of the HTML files

init
  --root <dir>              the deployed folder that gets precached (detected: ., dist, out, public)
  --public <dir>            where generated files go (detected: public/ for Vite, Next.js, Astro)
  --base <path>             URL path the site is served under, like /my-repo/ on GitHub Pages
  --relative                write relative URLs in head tags (sites served from any folder)
  --icon <file>             source image, PNG or SVG, 512x512 or larger
  --name <name>             app name
  --short-name <name>       home screen label, 12 characters or fewer
  --description <text>      app description
  --theme-color <color>     toolbar and title bar color
  --theme-color-dark <c>    theme color in dark mode
  --background-color <c>    splash screen and icon background
  --display <mode>          standalone (default), fullscreen, minimal-ui or browser
  --start-url <url>         page the app opens on (default ./)
  --scope <url>             pages that belong to the app (default ./)
  --lang <code>             language of the app, like en or pt-BR
  --cdn                     load installkite.js from jsDelivr instead of copying it
  --no-runtime              do not add installkite.js (register the service worker yourself)
  --no-inject               do not edit HTML files (prints the tags to paste)
  --no-install-button       no floating install button
  --no-update-toast         no "Refresh to update" toast
  --no-offline-indicator    no offline badge
  --no-offline-page         no offline fallback page
  --no-screenshots          no placeholder screenshots
  --no-shortcuts            no app shortcuts from your navigation
  --no-postbuild            do not add "installkite build" to the package.json build script
  -y, --yes                 accept detected values, ask nothing
  -n, --dry-run             print a diff of every change, write nothing

build
  --check                   exit with code 1 when sw.js is out of date, write nothing
  -n, --dry-run             show what would change

doctor
  [url]                     audit a live site instead of the files on disk
                            (example.com works too: https:// is added)
  --url <url>               the same, as an option
  --timeout <seconds>       how long to wait for each file of a live site (default 15)
  --json                    machine readable report
  --strict                  warnings also fail (exit code 1)

icons
  --out <dir>               output folder (default .)
  --background <color>      background of maskable and apple-touch-icon images
  --screenshots             also write placeholder screenshots

general
  --cwd <dir>               run in another folder
  --no-color                plain output
  -q, --quiet               only errors
  -h, --help                this help
  -v, --version             print the version

Docs: https://kwy404.github.io/installkite/
Check a live site in your browser: https://kwy404.github.io/installkite/app/
`;

const COMMANDS = ['init', 'build', 'doctor', 'icons', 'remove', 'help'];

const FRAMEWORK_LABEL: Record<ScanResult['framework'], string> = {
  plain: 'static HTML',
  vite: 'Vite',
  next: 'Next.js (static export)',
  astro: 'Astro',
  wordpress: 'WordPress',
  laravel: 'Laravel',
};

function printFiles(out: (s: string) => void, c: Colors, files: PlannedFile[], dry: boolean, quiet: boolean): void {
  if (quiet) return;
  const changed = files.filter((f) => f.action !== 'unchanged');
  const width = Math.min(48, Math.max(...files.map((f) => f.path.length), 10));
  for (const f of files) {
    const tag = f.action === 'create' ? c.green('create') : f.action === 'update' ? c.yellow('update') : c.gray('  same');
    const size = typeof f.content === 'string' ? Buffer.byteLength(f.content) : f.content.length;
    out(`  ${tag}  ${f.path.padEnd(width)}  ${c.gray(formatBytes(size).padStart(8))}${f.note ? c.gray(`  ${f.note}`) : ''}\n`);
  }
  if (dry) {
    for (const f of changed) {
      if (f.diff && !/\.(png|ico)$/.test(f.path)) out(`\n${colorDiff(f.diff, c)}`);
    }
  }
}

function colorDiff(diff: string, c: Colors): string {
  return diff
    .split('\n')
    .map((l) => (l.startsWith('+++') || l.startsWith('---') ? c.bold(l) : l.startsWith('+') ? c.green(l) : l.startsWith('-') ? c.red(l) : l.startsWith('@@') ? c.cyan(l) : l))
    .join('\n');
}

function printReport(out: (s: string) => void, c: Colors, r: DoctorReport, quiet: boolean): void {
  const mark = { pass: c.green('pass'), error: c.red('fail'), warn: c.yellow('warn'), info: c.blue('info'), skip: c.gray('skip') };
  out(`\n${c.bold('installkite doctor')} ${c.gray(r.mode === 'remote' ? r.url : `${r.url.replace('https://site.installkite.local', '')} (files on disk)`)}\n\n`);
  for (const ch of r.checks) {
    if (quiet && ch.status !== 'error') continue;
    out(`  ${mark[ch.status]}  ${ch.title}${c.gray(`: ${ch.message}`)}\n`);
    if (ch.fix && ch.status !== 'pass') out(`        ${c.dim('fix:')} ${ch.fix}\n`);
  }
  const verdict = r.errors
    ? c.red(`${r.errors} problem${r.errors > 1 ? 's' : ''} block install or offline use`)
    : c.green(`installable${r.offlineReady ? ' and offline ready' : ''}`);
  out(`\n  ${verdict}${r.warnings ? c.yellow(`, ${r.warnings} warning${r.warnings > 1 ? 's' : ''}`) : ''}\n\n`);
}

/** Runs the CLI. Returns the exit code. */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  const out = (s: string): void => {
    io.stdout.write(s);
  };
  const err = (s: string): void => {
    io.stderr.write(s);
  };
  let args: ParsedArgs;
  try {
    args = parseArgs(argv, SPEC);
  } catch (e) {
    if (e instanceof ArgError) {
      err(`installkite: ${e.message}\nRun "npx installkite --help" for the options.\n`);
      return 2;
    }
    throw e;
  }
  const f = args.flags;
  const useColor = f.color !== false && !io.env.NO_COLOR && (f.color === true || !!io.stdout.isTTY);
  const c = colors(useColor);
  if (f.version) {
    out(`${VERSION}\n`);
    return 0;
  }
  if (f.help || !args.command || args.command === 'help') {
    out(HELP);
    return args.command || f.help ? 0 : 1;
  }
  const cwd = resolve(io.cwd, typeof f.cwd === 'string' ? f.cwd : '.');
  if (!existsSync(cwd)) {
    err(`installkite: folder not found: ${cwd}\n`);
    return 2;
  }
  const quiet = f.quiet === true;
  const dry = f['dry-run'] === true;
  const str = (k: string): string | undefined => (typeof f[k] === 'string' ? (f[k] as string) : undefined);
  const bool = (k: string): boolean | undefined => (typeof f[k] === 'boolean' ? (f[k] as boolean) : undefined);

  try {
    switch (args.command) {
      case 'init':
        return await init();
      case 'build':
        return build();
      case 'doctor':
        return await doctor();
      case 'icons':
        return icons();
      case 'remove':
        return remove();
      default: {
        const near = closest(args.command, COMMANDS);
        err(`installkite: unknown command "${args.command}"${near ? `. Did you mean "${near}"?` : ''}\nRun "npx installkite --help" for the commands.\n`);
        return 2;
      }
    }
  } catch (e) {
    err(`${c.red('installkite:')} ${(e as Error).message}\n`);
    return 1;
  }

  async function init(): Promise<number> {
    const display = str('display');
    if (display && !DISPLAY_MODES.includes(display as Display)) throw new Error(`--display must be one of ${DISPLAY_MODES.join(', ')}`);
    const answers: InitAnswers = {};
    const set = <K extends keyof InitAnswers>(k: K, v: InitAnswers[K] | undefined): void => {
      if (v !== undefined) answers[k] = v;
    };
    set('root', str('root'));
    set('publicDir', str('public'));
    set('base', str('base'));
    set('relative', bool('relative'));
    set('icon', str('icon'));
    set('name', str('name'));
    set('shortName', str('short-name'));
    set('description', str('description'));
    set('themeColor', str('theme-color'));
    set('themeColorDark', str('theme-color-dark'));
    set('backgroundColor', str('background-color'));
    set('display', display as Display | undefined);
    set('startUrl', str('start-url'));
    set('scope', str('scope'));
    set('lang', str('lang'));
    set('orientation', str('orientation'));
    set('inject', bool('inject'));
    set('screenshots', bool('screenshots'));
    set('postbuild', bool('postbuild'));
    if (bool('offline-page') === false) answers.offline = false;
    if (bool('shortcuts') === false) answers.shortcuts = false;
    if (bool('install-button') !== undefined) answers.installButton = f['install-button'] ? 'auto' : 'none';
    set('updateToast', bool('update-toast'));
    set('offlineIndicator', bool('offline-indicator'));
    if (f.cdn === true) answers.runtime = 'cdn';
    if (f.runtime === false) answers.runtime = 'none';

    const scan = scanSite(cwd, { root: answers.root, publicDir: answers.publicDir, base: answers.base });
    // INSTALLKITE_INTERACTIVE=1 asks the questions without a terminal (answers piped on stdin).
    const interactive = f.yes !== true && ((!!io.stdin.isTTY && !!io.stdout.isTTY) || io.env.INSTALLKITE_INTERACTIVE === '1');
    if (!quiet) {
      out(`\n${c.sky('installkite')} ${c.gray(VERSION)}  ${c.bold('make it installable')}\n\n`);
      out(`  ${c.gray('site')}     ${FRAMEWORK_LABEL[scan.framework]} in ${scan.root}/${scan.htmlFiles.length ? c.gray(` (${scan.htmlFiles.length} HTML file${scan.htmlFiles.length > 1 ? 's' : ''})`) : ''}\n`);
      out(`  ${c.gray('base')}     ${scan.base}${scan.baseSource ? c.gray(` from ${scan.baseSource}`) : ''}${scan.host ? c.gray(`, ${scan.host === 'github-pages' ? 'GitHub Pages' : 'Netlify'}`) : ''}\n`);
      out(`  ${c.gray('icon')}     ${answers.icon ?? scan.iconCandidates[0] ?? 'none found, initials will be drawn'}\n\n`);
    }
    if (interactive) {
      const asker = createAsker(io.stdin, io.stdout, c);
      try {
        answers.name ??= await asker.ask('App name', scan.name);
        answers.shortName ??= await asker.ask('Home screen label (12 characters or fewer)', defaultShort(answers.name));
        answers.icon ??= await asker.ask('Icon source image (PNG or SVG, or "monogram")', scan.iconCandidates[0] ?? 'monogram');
        answers.themeColor ??= (await asker.ask('Theme color (empty: from the icon)', scan.themeColor ?? '')) || undefined;
        answers.backgroundColor ??= await asker.ask('Background color', '#ffffff');
        answers.display ??= await asker.choose('Display mode', DISPLAY_MODES, 'standalone');
        answers.base ??= await asker.ask('Base path the site is served under', scan.base);
        answers.installButton ??= (await asker.confirm('Show a floating install button', true)) ? 'auto' : 'none';
      } finally {
        asker.close();
      }
    }
    const plan = planInit(cwd, answers, answers.base !== undefined && answers.base !== scan.base ? {} : { scan });
    if (!quiet) {
      out(`  ${c.gray('app')}      ${c.bold(plan.config.app.name)} ${c.gray(`(${plan.config.app.display}, theme ${plan.config.app.themeColor})`)}\n`);
      out(`  ${c.gray('offline')}  ${plan.precache.count} files precached ${c.gray(`(${formatBytes(plan.precache.size)})`)}\n\n`);
    }
    printFiles(out, c, plan.files, dry, quiet);
    for (const w of plan.warnings) err(`  ${c.yellow('warn')}  ${w}\n`);
    if (!quiet) for (const n of plan.notes) out(`  ${c.blue('note')}  ${n}\n`);
    if (plan.snippet && !quiet) {
      out(`\n  ${c.bold('Paste these tags into your <head>')} ${c.gray(recipeHint(scan.framework))}\n\n`);
      out(`${plan.snippet.split('\n').map((l) => `    ${c.cyan(l)}`).join('\n')}\n`);
    }
    if (dry) {
      out(`\n  ${c.yellow('dry run:')} nothing was written. Run without --dry-run to apply.\n\n`);
      return 0;
    }
    const written = applyPlan(cwd, plan.files);
    if (!quiet) {
      out(`\n  ${c.green('done.')} ${written.length} file${written.length === 1 ? '' : 's'} written.\n`);
      out(`  Next: ${c.bold('npx installkite doctor')} to audit, then deploy over HTTPS.\n\n`);
    }
    return 0;
  }

  function build(): number {
    const config = readConfig(cwd);
    if (!config) throw new Error(`no ${CONFIG_FILE} in ${cwd}: run "npx installkite init" first`);
    if (str('root')) config.root = str('root')!;
    const result = planBuild(cwd, config);
    const changed = result.files.filter((x) => x.action !== 'unchanged');
    if (f.check) {
      if (changed.length) {
        err(`${c.red('installkite:')} ${changed.map((x) => x.path).join(', ')} out of date. Run "npx installkite build".\n`);
        return 1;
      }
      if (!quiet) out(`${c.green('ok')} sw.js is up to date: ${result.entries.length} files, version ${result.version}\n`);
      return 0;
    }
    printFiles(out, c, result.files, dry, quiet);
    if (!quiet) out(`\n  ${result.entries.length} files precached ${c.gray(`(${formatBytes(result.size)})`)}, version ${c.bold(result.version)}\n\n`);
    if (!dry) applyPlan(cwd, result.files);
    return 0;
  }

  async function doctor(): Promise<number> {
    const given = str('url') ?? args.positionals[0];
    if (args.positionals.length > (str('url') ? 0 : 1)) throw new Error('doctor takes one URL');
    let report: DoctorReport;
    if (given) {
      const url = normalizeSiteUrl(given);
      const timeout = str('timeout');
      const seconds = timeout === undefined ? 15 : Number(timeout);
      if (!(seconds > 0) || seconds > 600) throw new Error('--timeout must be a number of seconds, more than 0 and at most 600');
      report = await doctorRemote(url, { config: readConfig(cwd), timeoutMs: Math.round(seconds * 1000) });
    } else {
      report = await doctorLocal(cwd, { root: str('root'), base: str('base') });
    }
    if (f.json) out(`${JSON.stringify(report, null, 2)}\n`);
    else printReport(out, c, report, quiet);
    return report.errors || (f.strict && report.warnings) ? 1 : 0;
  }

  function icons(): number {
    const source = args.positionals[0];
    if (!source) throw new Error('usage: npx installkite icons <image.png|image.svg> [--out dir]');
    if (!existsSync(join(cwd, source))) throw new Error(`image not found: ${source}`);
    const files = planIcons(cwd, source, str('out') ?? '.', { background: str('background'), screenshots: f.screenshots === true, themeColor: str('theme-color') });
    printFiles(out, c, files, false, quiet);
    if (!dry) applyPlan(cwd, files);
    return 0;
  }

  function remove(): number {
    const config = readConfig(cwd);
    const scan = config ? null : scanSite(cwd);
    const html = config ? expandHtml(cwd, config) : scan!.htmlFiles;
    let n = 0;
    for (const file of html) {
      const abs = join(cwd, file);
      const res = removeHead(readFileSync(abs, 'utf8'));
      if (!res.removed) continue;
      n++;
      if (!quiet) out(`  ${c.yellow('update')}  ${file}\n`);
      if (!dry) writeFileSync(abs, res.html);
    }
    if (!quiet) out(`\n  removed the installkite tags from ${n} file${n === 1 ? '' : 's'}. Generated files were left in place.\n`);
    return 0;
  }
}

function defaultShort(name: string): string {
  return name.length <= 12 ? name : (name.split(/\s*[|:]\s*|\s+-\s+/)[0] ?? name).slice(0, 12).trim();
}

function recipeHint(fw: ScanResult['framework']): string {
  switch (fw) {
    case 'next':
      return '(app/layout.tsx: see the Next.js recipe)';
    case 'astro':
      return '(your base layout: see the Astro recipe)';
    case 'laravel':
      return '(resources/views/layouts/app.blade.php)';
    case 'wordpress':
      return '(header.php or a wp_head hook)';
    default:
      return '';
  }
}
