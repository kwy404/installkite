// The installkite site checker page, built with Voodoo.js
// (https://kwy404.github.io/Voodoo.js/). checker.js (built from src/web/)
// runs the doctor rules in the browser; this module keeps the page state in
// a Voodoo store, publishes it on V.config.globals and starts Voodoo.

const V = window.V;
const K = window.InstallkiteChecker;
const S = window.ikSeasons || null;
const SITE = new URL('../', location.href).href;

const C = V.reactive({
  input: '',
  phase: 'idle',
  step: '',
  error: '',
  result: null,
  pasteOpen: false,
  html: '',
  manifest: '',
  copied: '',
  season: '',
  seasonId: '',
  seasonLabel: '',
});

const LABELS = { pass: 'Ready', error: 'Missing', warn: 'Improve', info: 'Tip', skip: 'Not readable' };
const TONE_ICON = { ready: 'pass', partial: 'skip', missing: 'error', blocked: 'skip', down: 'warn' };
const SEASON_LINES = {
  newyear: 'New Year mode. A fresh start for your home screen icon.',
  carnival: 'Carnival mode. Skye brought confetti, the checks stay serious.',
  easter: 'Easter mode. No hidden eggs here, only hidden icons.',
  valentine: 'Valentine mode. Show your site a little love.',
  junina: 'Bonfire season. Skye is wearing her straw hat.',
  halloween: 'Halloween mode. Nothing scary below, only a list of fixes.',
  christmas: 'Christmas mode. Skye wrapped a manifest for you.',
};

const file = (url) => {
  try {
    const u = new URL(url);
    return u.pathname === '/' || u.pathname.endsWith('/') ? `${u.host}${u.pathname}` : u.pathname.split('/').pop();
  } catch {
    return url;
  }
};

let run = 0;
async function start(input, pasted) {
  C.error = '';
  let url;
  try {
    url = K.normalizeSiteUrl(input);
  } catch (e) {
    C.error = `${e.message.charAt(0).toUpperCase()}${e.message.slice(1)}.`;
    document.getElementById('url')?.focus();
    return;
  }
  const mine = ++run;
  C.phase = 'checking';
  C.step = `Reading ${file(url)}`;
  try {
    const result = await K.checkSite(url, {
      from: location.href,
      pasted,
      onLoad: (u) => {
        if (mine === run) C.step = `Reading ${file(u)}`;
      },
    });
    if (mine !== run) return;
    C.result = result;
    C.input = result.url;
    C.phase = 'done';
    remember(result.url, !!pasted);
    requestAnimationFrame(() => document.getElementById('verdict-title')?.focus?.({ preventScroll: true }));
    document.querySelector('.result')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  } catch (e) {
    if (mine !== run) return;
    C.phase = 'idle';
    C.error = `The check stopped: ${e.message}`;
  }
}

/** Keeps the checked URL in the address bar, so a result can be shared or reloaded. */
function remember(url, pasted) {
  try {
    const q = new URLSearchParams(location.search);
    if (pasted) q.delete('url');
    else q.set('url', url);
    const s = q.toString();
    history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}`);
  } catch {
    /* history blocked */
  }
}

async function copyText(text, what) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  C.copied = what;
  setTimeout(() => {
    if (C.copied === what) C.copied = '';
  }, 1600);
}

function syncSeason() {
  C.seasonId = S?.id || '';
  C.season = S?.active || '';
  C.seasonLabel = S?.id ? S.label() : '';
}
syncSeason();
addEventListener('ik:season', syncSeason);

// Seasonal art can be missing for a moment while the site is deployed: fall back to the usual Skye.
for (const img of document.querySelectorAll('img[data-fallback]')) {
  img.addEventListener('error', () => {
    if (img.getAttribute('src') !== img.dataset.fallback) img.setAttribute('src', img.dataset.fallback);
  });
}

Object.assign(V.config.globals, {
  C,
  check: () => start(C.input),
  checkPasted() {
    if (!C.html.trim()) {
      C.error = 'Paste the page source first.';
      document.getElementById('paste-html')?.focus();
      return;
    }
    if (!C.input.trim()) {
      C.error = 'Type the address of the page too, so links in the source can be followed.';
      document.getElementById('url')?.focus();
      return;
    }
    start(C.input, { html: C.html, manifest: C.manifest });
  },
  tryHere() {
    C.input = SITE;
    start(SITE);
  },
  openPaste() {
    C.pasteOpen = true;
    requestAnimationFrame(() => {
      document.querySelector('.paste')?.scrollIntoView({ block: 'nearest' });
      document.getElementById('paste-html')?.focus();
    });
  },
  again() {
    C.phase = 'idle';
    C.result = null;
    C.error = '';
    C.input = '';
    remember('', true);
    requestAnimationFrame(() => document.getElementById('url')?.focus());
  },
  copyReport: () => C.result && copyText(K.reportText(C.result), 'report'),
  toggleSeason() {
    S?.set(!S.active);
    syncSeason();
  },
  groups: () => (C.result ? C.result.groups : []),
  access: () => (C.result ? C.result.access : ''),
  tone: () => (C.result ? C.result.verdict.tone : 'ready'),
  toneIcon: () => TONE_ICON[C.result ? C.result.verdict.tone : 'ready'],
  command: () => (C.result ? C.result.command : 'npx installkite doctor example.com'),
  label: (s) => LABELS[s] || s,
  groupNote: (g) => (g.errors ? `${g.errors} missing` : g.skipped ? 'not readable' : 'nothing missing'),
  tally() {
    const n = C.result?.counts;
    if (!n || C.result.access === 'blocked' || C.result.access === 'down') return '';
    const parts = [
      n.pass && `${n.pass} ready`,
      n.error && `${n.error} missing`,
      n.warn && `${n.warn} to improve`,
      n.info && `${n.info} ${n.info === 1 ? 'tip' : 'tips'}`,
      n.skip && `${n.skip} not readable`,
    ].filter(Boolean);
    return parts.join(', ');
  },
  seasonLine: () => SEASON_LINES[C.season] || '',
  mascot: (dark) => (C.season ? `../assets/seasons/${C.season}/skye${dark ? '-dark' : ''}.svg` : `../assets/mascot${dark ? '-dark' : ''}.svg`),
});

V.start();

const first = new URLSearchParams(location.search).get('url');
if (first) {
  C.input = first;
  start(first);
}
