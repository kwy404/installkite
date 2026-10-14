// The offline fallback page: one self contained HTML file (inline styles,
// the app icon as a data URL) so it renders at any URL with no network.
import { contrast, mix, parseColor, toHex } from './color.js';

export interface OfflinePageOptions {
  name: string;
  themeColor: string;
  backgroundColor: string;
  /** A data URL or absolute URL of the app icon. */
  icon?: string;
  lang?: string;
  title?: string;
  message?: string;
  retryLabel?: string;
  savedLabel?: string;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Picks black or white text, whichever reads better on a color. */
function onColor(c: readonly number[]): string {
  return contrast(c, [255, 255, 255]) >= contrast(c, [17, 24, 39]) ? '#ffffff' : '#111827';
}

/** Builds offline.html. */
export function generateOfflinePage(o: OfflinePageOptions): string {
  const theme = parseColor(o.themeColor) ?? [56, 152, 236, 1];
  const bg = parseColor(o.backgroundColor) ?? [255, 255, 255, 1];
  const light = contrast(bg, [0, 0, 0]) > contrast(bg, [255, 255, 255]);
  const accent = toHex(theme);
  // A readable accent for links and the button on the page background.
  let ink = theme.slice(0, 3);
  for (let i = 0; i < 10 && contrast(ink, light ? [255, 255, 255] : [17, 24, 39]) < 4.5; i++) ink = mix(ink, light ? [0, 0, 0] : [255, 255, 255], 0.18);
  const title = o.title ?? 'You are offline';
  const message = o.message ?? `${o.name} could not reach the network. Check your connection, then try again. Pages you opened before still work.`;
  const retry = o.retryLabel ?? 'Try again';
  const saved = o.savedLabel ?? 'Saved on this device';
  const icon = o.icon
    ? `<img class="icon" src="${esc(o.icon)}" width="96" height="96" alt="">`
    : `<div class="icon icon-letter" aria-hidden="true">${esc(o.name.trim().charAt(0).toUpperCase() || 'A')}</div>`;
  return `<!doctype html>
<html lang="${esc(o.lang || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${esc(accent)}">
<meta name="robots" content="noindex">
<title>${esc(title)} | ${esc(o.name)}</title>
<style>
  :root {
    --accent: ${accent};
    --on-accent: ${onColor(theme)};
    --ink: ${toHex(ink)};
    --bg: ${toHex(bg)};
    --fg: ${light ? '#111827' : '#f3f4f6'};
    --muted: ${light ? '#4b5563' : '#a1a1aa'};
    --card: ${light ? 'rgba(255,255,255,.78)' : 'rgba(24,24,27,.72)'};
    --line: ${light ? 'rgba(17,24,39,.1)' : 'rgba(255,255,255,.12)'};
    color-scheme: ${light ? 'light' : 'dark'};
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    display: grid;
    place-items: center;
    padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
    font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: var(--fg);
    background:
      radial-gradient(120% 70% at 50% -10%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%),
      radial-gradient(60% 40% at 100% 100%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%),
      var(--bg);
  }
  main {
    width: min(100%, 440px);
    text-align: center;
    padding: 36px 28px 28px;
    border: 1px solid var(--line);
    border-radius: 28px;
    background: var(--card);
    backdrop-filter: blur(12px);
    box-shadow: 0 24px 60px -24px rgba(0,0,0,.28);
  }
  .badge-wrap { position: relative; width: 96px; height: 96px; margin: 0 auto 22px; }
  .icon { width: 96px; height: 96px; border-radius: 24px; display: block; box-shadow: 0 12px 28px -10px color-mix(in srgb, var(--accent) 70%, transparent); }
  .icon-letter { display: grid; place-items: center; background: var(--accent); color: var(--on-accent); font-size: 44px; font-weight: 700; }
  .signal {
    position: absolute; right: -10px; bottom: -10px; width: 40px; height: 40px; border-radius: 50%;
    display: grid; place-items: center; background: var(--bg); border: 1px solid var(--line); color: var(--muted);
  }
  .signal svg { width: 22px; height: 22px; }
  h1 { margin: 0 0 8px; font-size: 1.6rem; line-height: 1.2; letter-spacing: -0.01em; }
  p { margin: 0 auto; color: var(--muted); max-width: 34ch; }
  button {
    margin-top: 22px; display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 22px; border: 0; border-radius: 999px; cursor: pointer;
    font: inherit; font-weight: 600; color: var(--on-accent); background: var(--accent);
    box-shadow: 0 10px 24px -12px var(--accent);
  }
  button:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  button svg { width: 18px; height: 18px; }
  .status { margin-top: 14px; font-size: .875rem; min-height: 1.4em; }
  .saved { margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--line); text-align: left; }
  .saved[hidden] { display: none; }
  .saved h2 { margin: 0 0 10px; font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
  .saved ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .saved a {
    display: block; padding: 9px 12px; border-radius: 12px; color: var(--ink); text-decoration: none;
    border: 1px solid var(--line); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .saved a:hover, .saved a:focus-visible { background: color-mix(in srgb, var(--accent) 10%, transparent); }
  @media (prefers-reduced-motion: no-preference) {
    .signal { animation: pulse 2.4s ease-in-out infinite; }
    @keyframes pulse { 50% { transform: scale(1.08); } }
  }
</style>
</head>
<body>
<main>
  <div class="badge-wrap">
    ${icon}
    <span class="signal" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M5 12.6a10 10 0 0 1 14 0"/><path d="M8.5 16.3a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path d="M3 3l18 18"/></svg></span>
  </div>
  <h1>${esc(title)}</h1>
  <p>${esc(message)}</p>
  <button type="button" id="retry"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>${esc(retry)}</button>
  <p class="status" id="status" role="status" aria-live="polite"></p>
  <nav class="saved" id="saved" hidden aria-labelledby="saved-title">
    <h2 id="saved-title">${esc(saved)}</h2>
    <ul id="saved-list"></ul>
  </nav>
</main>
<script>
(function () {
  var status = document.getElementById('status');
  function retry() {
    status.textContent = navigator.onLine ? 'Reconnecting...' : 'Still offline. Retrying when the network is back.';
    if (navigator.onLine) location.reload();
  }
  document.getElementById('retry').addEventListener('click', retry);
  window.addEventListener('online', function () { location.reload(); });
  // List pages this device already has, so the visitor can keep reading.
  if (!('caches' in window)) return;
  caches.keys().then(function (names) {
    var wanted = names.filter(function (n) { return /^installkite-(pages|precache-)/.test(n); });
    return Promise.all(wanted.map(function (n) { return caches.open(n).then(function (c) { return c.keys(); }); }));
  }).then(function (lists) {
    var seen = {}, links = [];
    [].concat.apply([], lists || []).forEach(function (req) {
      var u = new URL(req.url);
      if (u.origin !== location.origin || /__installkite|offline\\.html$/.test(u.pathname)) return;
      if (!/(\\/|\\.html)$/.test(u.pathname)) return;
      var key = u.pathname.replace(/index\\.html$/, '');
      if (seen[key] || key === location.pathname) return;
      seen[key] = 1;
      links.push(key);
    });
    links.sort();
    var list = document.getElementById('saved-list');
    links.slice(0, 8).forEach(function (path) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = path;
      a.textContent = decodeURIComponent(path.replace(/\\.html$/, '').replace(/\\/$/, '').split('/').pop() || '') || 'Home';
      a.textContent = a.textContent.charAt(0).toUpperCase() + a.textContent.slice(1).replace(/[-_]+/g, ' ');
      li.appendChild(a);
      list.appendChild(li);
    });
    if (links.length) document.getElementById('saved').hidden = false;
  }).catch(function () {});
})();
</script>
</body>
</html>
`;
}
