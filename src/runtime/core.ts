// The installkite browser runtime: registers the service worker, captures
// the install prompt, shows an install button, the iOS "Add to Home Screen"
// sheet, a "Refresh to update" toast and an offline badge, and emits events.

export type EventName = 'ready' | 'installable' | 'installed' | 'update' | 'updated' | 'offline' | 'online' | 'error';
export type Listener = (detail?: unknown) => void;

export interface Texts {
  install: string;
  installTitle: string;
  dismiss: string;
  iosTitle: string;
  iosStep1: string;
  iosStep2: string;
  iosStep3: string;
  close: string;
  update: string;
  refresh: string;
  offline: string;
  online: string;
}

export interface Options {
  /** Service worker URL. Default: sw.js next to installkite.js. */
  sw?: string;
  /** Registration scope. Default: the service worker's folder. */
  scope?: string;
  /** "auto": a floating install button when the site can be installed. */
  install?: 'auto' | 'none';
  /** "toast": the "Refresh to update" toast. */
  update?: 'toast' | 'none';
  /** "badge": a small badge while offline. */
  offline?: 'badge' | 'none';
  /** Do not register the service worker on init. */
  manual?: boolean;
  /** Days the floating button stays hidden after it is dismissed. */
  snoozeDays?: number;
  /** UI strings, for translations. */
  text?: Partial<Texts>;
}

export const DEFAULT_TEXT: Texts = {
  install: 'Install app',
  installTitle: 'Install this app on your device',
  dismiss: 'Not now',
  iosTitle: 'Add to your Home Screen',
  iosStep1: 'Tap the Share button in the toolbar',
  iosStep2: 'Scroll down and tap "Add to Home Screen"',
  iosStep3: 'Tap "Add" in the top corner',
  close: 'Close',
  update: 'A new version is available',
  refresh: 'Refresh',
  offline: 'You are offline',
  online: 'Back online',
};

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface Installkite {
  readonly version: string;
  /** True once the browser offered an install prompt, or on iOS when not installed. */
  readonly canInstall: boolean;
  /** True when running as an installed app. */
  readonly isInstalled: boolean;
  readonly isIOS: boolean;
  readonly online: boolean;
  readonly registration: ServiceWorkerRegistration | null;
  /** Reads options and starts (registers the service worker unless manual). */
  init(options?: Options): Installkite;
  register(url?: string, scope?: string): Promise<ServiceWorkerRegistration | null>;
  /** Shows the install prompt (or the iOS sheet). */
  install(): Promise<'accepted' | 'dismissed' | 'instructions' | 'unavailable'>;
  /** Activates a waiting service worker and reloads once it takes over. */
  update(): void;
  showIOSInstructions(): void;
  /** Saves pages for offline reading (they go into the runtime page cache). */
  cache(urls: string[]): Promise<number>;
  on(event: EventName, fn: Listener): () => void;
  off(event: EventName, fn: Listener): void;
}

const STYLE_ID = 'installkite-style';
const SNOOZE_KEY = 'installkite:snoozed';

const CSS = `.ik{--ik-a:var(--installkite-accent,#2b8ff0);--ik-f:var(--installkite-on-accent,#fff);--ik-s:var(--installkite-surface,#fff);--ik-t:var(--installkite-text,#14213d);--ik-m:color-mix(in srgb,var(--ik-t) 62%,transparent);--ik-l:color-mix(in srgb,var(--ik-t) 12%,transparent);font:500 15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ik-t);box-sizing:border-box;z-index:2147483000;position:fixed}
.ik *{box-sizing:border-box}
@media (prefers-color-scheme:dark){.ik{--ik-s:var(--installkite-surface-dark,#18202f);--ik-t:var(--installkite-text-dark,#eef2f8)}}
.ik button{font:inherit;cursor:pointer;border:0;border-radius:999px}
.ik button:focus-visible{outline:3px solid var(--ik-a);outline-offset:2px}
.ik-fab{right:16px;bottom:max(16px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:4px;padding:4px;border-radius:999px;background:var(--ik-s);box-shadow:0 10px 30px -10px rgba(0,0,0,.35),0 0 0 1px var(--ik-l)}
.ik-go{display:flex;align-items:center;gap:8px;padding:10px 16px 10px 12px;background:var(--ik-a);color:var(--ik-f);font-weight:600}
.ik-go svg,.ik-x svg{width:18px;height:18px}
.ik-x{display:grid;place-items:center;width:36px;height:36px;background:none;color:var(--ik-m)}
.ik-x:hover{color:var(--ik-t);background:var(--ik-l)}
.ik-toast{left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 8px 8px 18px;border-radius:16px;background:var(--ik-s);box-shadow:0 10px 30px -10px rgba(0,0,0,.35),0 0 0 1px var(--ik-l);max-width:calc(100vw - 32px)}
.ik-toast .ik-go{padding:8px 16px}
.ik-badge{top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:var(--ik-t);color:var(--ik-s);font-size:13px;pointer-events:none}
.ik-badge i{width:8px;height:8px;border-radius:50%;background:#f59e0b}
.ik-badge.ik-on i{background:#22c55e}
.ik-veil{inset:0;background:rgba(5,10,20,.45);display:flex;align-items:flex-end;justify-content:center}
.ik-sheet{position:relative;width:min(100%,440px);margin:0 8px max(8px,env(safe-area-inset-bottom));padding:22px 20px 18px;border-radius:24px;background:var(--ik-s);color:var(--ik-t);box-shadow:0 20px 50px -20px rgba(0,0,0,.5)}
.ik-sheet h2{margin:0 40px 14px 0;font-size:18px;line-height:1.3}
.ik-sheet ol{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.ik-sheet li{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:var(--ik-l)}
.ik-sheet li svg{flex:none;width:24px;height:24px;color:var(--ik-a)}
.ik-sheet .ik-x{position:absolute;top:12px;right:12px}
.ik-sheet .ik-app{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.ik-sheet .ik-app img{width:48px;height:48px;border-radius:12px}
@media (prefers-reduced-motion:no-preference){.ik-fab,.ik-toast,.ik-sheet,.ik-badge{animation:ik-in .35s cubic-bezier(.2,.9,.3,1.2)}@keyframes ik-in{from{opacity:0;translate:0 12px}}}
@media (min-width:700px){.ik-veil{align-items:center}}`;

const ICONS = {
  down: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14',
  x: 'M6 6l12 12M18 6 6 18',
  share: 'M12 15V3m0 0L8 7m4-4 4 4M6 11H5v10h14V11h-1',
  plus: 'M12 8v8m-4-4h8M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  check: 'M5 12.5 10 17l9-10',
};

const svg = (d: string): string => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

/** Creates an installkite instance bound to a window. */
export function createInstallkite(win: Window & typeof globalThis = window, version = '0.0.0'): Installkite {
  const doc = win.document;
  const nav = win.navigator;
  const listeners: Partial<Record<EventName, Set<Listener>>> = {};
  let opts: Options = {};
  let text: Texts = { ...DEFAULT_TEXT };
  let deferred: BeforeInstallPromptEvent | null = null;
  let reg: ServiceWorkerRegistration | null = null;
  let waiting: ServiceWorker | null = null;
  let reloading = false;
  let wantReload = false;
  let fab: HTMLElement | null = null;
  let toast: HTMLElement | null = null;
  let badge: HTMLElement | null = null;
  let badgeTimer: ReturnType<typeof setTimeout> | undefined;
  let started = false;
  const scriptSrc = (doc.currentScript as HTMLScriptElement | null)?.src || '';

  const ua = nav.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
  const standalone = (): boolean =>
    ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some((m) => win.matchMedia?.(`(display-mode: ${m})`).matches) ||
    (nav as Navigator & { standalone?: boolean }).standalone === true;

  function emit(name: EventName, detail?: unknown): void {
    listeners[name]?.forEach((fn) => {
      try {
        fn(detail);
      } catch (e) {
        win.setTimeout(() => {
          throw e;
        });
      }
    });
    win.dispatchEvent(new win.CustomEvent(`installkite:${name}`, { detail }));
  }

  function style(): void {
    if (doc.getElementById(STYLE_ID)) return;
    const s = doc.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    doc.head.appendChild(s);
    // The accent follows the page's theme color unless --installkite-accent is set.
    const theme = doc.querySelector('meta[name="theme-color"]')?.getAttribute('content');
    if (theme && !win.getComputedStyle(doc.documentElement).getPropertyValue('--installkite-accent').trim()) {
      doc.documentElement.style.setProperty('--installkite-accent', theme);
      doc.documentElement.style.setProperty('--installkite-on-accent', readableOn(theme));
    }
  }

  function readableOn(color: string): string {
    const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
    if (!m) return '#fff';
    const n = parseInt(m[1]!, 16);
    const lin = (v: number): number => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const l = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return l > 0.4 ? '#0b1220' : '#fff';
  }

  function el(cls: string, html: string, attrs: Record<string, string> = {}): HTMLElement {
    style();
    const e = doc.createElement('div');
    e.className = `ik ${cls}`;
    e.innerHTML = html;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    doc.body.appendChild(e);
    return e;
  }

  const snoozed = (): boolean => {
    try {
      const t = Number(win.localStorage.getItem(SNOOZE_KEY));
      return !!t && Date.now() - t < (opts.snoozeDays ?? 14) * 864e5;
    } catch {
      return false;
    }
  };

  const canInstall = (): boolean => !standalone() && (!!deferred || isIOS);

  /** Shows or hides every install control. */
  function sync(): void {
    const show = canInstall();
    doc.querySelectorAll<HTMLElement>('[data-installkite-install]').forEach((b) => {
      b.hidden = !show;
    });
    if (show && opts.install === 'auto' && !fab && !snoozed() && doc.body) {
      fab = el(
        'ik-fab',
        `<button type="button" class="ik-go" title="${text.installTitle}">${svg(ICONS.down)}<span>${text.install}</span></button><button type="button" class="ik-x" aria-label="${text.dismiss}">${svg(ICONS.x)}</button>`,
        { role: 'region', 'aria-label': text.installTitle },
      );
      fab.querySelector('.ik-go')!.addEventListener('click', () => void api.install());
      fab.querySelector('.ik-x')!.addEventListener('click', () => {
        try {
          win.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
        } catch {
          // storage may be blocked
        }
        removeFab();
      });
    } else if (!show) removeFab();
  }

  function removeFab(): void {
    fab?.remove();
    fab = null;
  }

  function showIOSInstructions(): void {
    if (doc.querySelector('.ik-veil')) return;
    const icon = doc.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')?.href;
    const name = doc.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content') || doc.title;
    const before = doc.activeElement as HTMLElement | null;
    const veil = el(
      'ik-veil',
      `<div class="ik-sheet" role="dialog" aria-modal="true" aria-labelledby="ik-t"><button type="button" class="ik-x" aria-label="${text.close}">${svg(ICONS.x)}</button>${
        icon ? '<div class="ik-app"><img alt=""><strong></strong></div>' : ''
      }<h2 id="ik-t">${text.iosTitle}</h2><ol><li>${svg(ICONS.share)}<span>${text.iosStep1}</span></li><li>${svg(ICONS.plus)}<span>${text.iosStep2}</span></li><li>${svg(ICONS.check)}<span>${text.iosStep3}</span></li></ol></div>`,
    );
    const strong = veil.querySelector('strong');
    if (strong) strong.textContent = name;
    veil.querySelector('img')?.setAttribute('src', icon!);
    const close = (): void => {
      veil.remove();
      doc.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    veil.addEventListener('click', (e) => {
      if (e.target === veil || (e.target as Element).closest('.ik-x')) close();
    });
    doc.addEventListener('keydown', onKey);
    veil.querySelector<HTMLElement>('.ik-x')!.focus();
  }

  function showToast(): void {
    if (opts.update === 'none' || toast || !doc.body) return;
    toast = el('ik-toast', `<span>${text.update}</span><button type="button" class="ik-go">${text.refresh}</button><button type="button" class="ik-x" aria-label="${text.close}">${svg(ICONS.x)}</button>`, {
      role: 'status',
      'aria-live': 'polite',
    });
    toast.querySelector('.ik-go')!.addEventListener('click', () => api.update());
    toast.querySelector('.ik-x')!.addEventListener('click', () => {
      toast?.remove();
      toast = null;
    });
  }

  function connectivity(): void {
    const on = nav.onLine !== false;
    emit(on ? 'online' : 'offline');
    if (opts.offline !== 'badge' || !doc.body) return;
    clearTimeout(badgeTimer);
    if (!badge) badge = el('ik-badge', '<i></i><span></span>', { role: 'status', 'aria-live': 'polite' });
    badge.classList.toggle('ik-on', on);
    badge.querySelector('span')!.textContent = on ? text.online : text.offline;
    if (on) {
      badgeTimer = setTimeout(() => {
        badge?.remove();
        badge = null;
      }, 2500);
    }
  }

  function track(worker: ServiceWorker | null): void {
    if (!worker) return;
    const check = (): void => {
      if (worker.state === 'installed' && nav.serviceWorker.controller) {
        waiting = worker;
        emit('update', { apply: () => api.update() });
        showToast();
      }
    };
    worker.addEventListener('statechange', check);
    check();
  }

  async function register(url?: string, scope?: string): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in nav)) return null;
    const swUrl = url || opts.sw || new URL('sw.js', scriptSrc || win.location.href).href;
    try {
      reg = await nav.serviceWorker.register(swUrl, scope || opts.scope ? { scope: scope || opts.scope } : undefined);
    } catch (e) {
      emit('error', e);
      return null;
    }
    if (reg.waiting) track(reg.waiting);
    reg.addEventListener('updatefound', () => track(reg!.installing));
    nav.serviceWorker.addEventListener('controllerchange', () => {
      if (wantReload && !reloading) {
        reloading = true;
        emit('updated');
        win.location.reload();
      }
    });
    // Look for a new version when the app comes back to the foreground.
    let last = Date.now();
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'visible' && Date.now() - last > 36e5) {
        last = Date.now();
        reg?.update().catch(() => undefined);
      }
    });
    emit('ready', reg);
    return reg;
  }

  const api: Installkite = {
    version,
    get canInstall() {
      return canInstall();
    },
    get isInstalled() {
      return standalone();
    },
    isIOS,
    get online() {
      return nav.onLine !== false;
    },
    get registration() {
      return reg;
    },
    init(options: Options = {}) {
      opts = { ...opts, ...options };
      text = { ...DEFAULT_TEXT, ...(opts.text || {}) };
      if (started) return api;
      started = true;
      win.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e as BeforeInstallPromptEvent;
        emit('installable');
        sync();
      });
      win.addEventListener('appinstalled', () => {
        deferred = null;
        removeFab();
        sync();
        emit('installed');
      });
      win.addEventListener('online', connectivity);
      win.addEventListener('offline', connectivity);
      doc.addEventListener('click', (e) => {
        if ((e.target as Element | null)?.closest?.('[data-installkite-install]')) {
          e.preventDefault();
          void api.install();
        }
      });
      const ready = (): void => {
        sync();
        if (nav.onLine === false) connectivity();
        if (isIOS && canInstall()) emit('installable');
      };
      if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', ready);
      else ready();
      if (!opts.manual) {
        if (doc.readyState === 'complete') void register();
        else win.addEventListener('load', () => void register());
      }
      return api;
    },
    register,
    async install() {
      if (deferred) {
        const e = deferred;
        deferred = null;
        await e.prompt();
        const { outcome } = await e.userChoice;
        removeFab();
        sync();
        if (outcome === 'accepted') emit('installed');
        return outcome;
      }
      if (isIOS && !standalone()) {
        showIOSInstructions();
        return 'instructions';
      }
      return 'unavailable';
    },
    update() {
      toast?.remove();
      toast = null;
      if (!waiting) {
        win.location.reload();
        return;
      }
      wantReload = true;
      waiting.postMessage({ type: 'SKIP_WAITING' });
    },
    showIOSInstructions,
    cache(urls: string[]) {
      const ctrl = nav.serviceWorker?.controller;
      if (!ctrl) return Promise.resolve(0);
      return new Promise((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = (e) => resolve(Number(e.data?.cached) || 0);
        ctrl.postMessage({ type: 'CACHE_URLS', urls: urls.map((u) => new URL(u, win.location.href).href) }, [ch.port2]);
      });
    },
    on(event, fn) {
      (listeners[event] ??= new Set()).add(fn);
      return () => api.off(event, fn);
    },
    off(event, fn) {
      listeners[event]?.delete(fn);
    },
  };
  return api;
}

/** Reads options from the data- attributes of a script tag. */
export function optionsFromScript(script: HTMLScriptElement | null): Options {
  if (!script) return {};
  const d = script.dataset;
  const o: Options = {};
  if (d.sw) o.sw = new URL(d.sw, script.ownerDocument.baseURI).href;
  if (d.scope) o.scope = d.scope;
  if (d.install === 'auto' || d.install === 'none') o.install = d.install;
  if (d.update === 'toast' || d.update === 'none') o.update = d.update;
  if (d.offline === 'badge' || d.offline === 'none') o.offline = d.offline;
  if (d.manual !== undefined) o.manual = true;
  return o;
}
