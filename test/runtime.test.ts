// The browser runtime, in jsdom.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { createInstallkite, DEFAULT_TEXT, optionsFromScript } from '../src/runtime/core.js';

type Win = Window & typeof globalThis;

function browser(opts: { ua?: string; standalone?: boolean; body?: string } = {}) {
  const dom = new JSDOM(`<!doctype html><html><head><meta name="theme-color" content="#2b8ff0"><meta name="apple-mobile-web-app-title" content="Acme"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><title>Acme</title></head><body>${opts.body ?? ''}</body></html>`, {
    url: 'https://acme.example/app/',
    pretendToBeVisual: true,
    // location.reload() after an update is not implemented in jsdom.
    virtualConsole: new VirtualConsole().sendTo(console, { omitJSDOMErrors: true }),
  });
  const win = dom.window as unknown as Win;
  Object.defineProperty(win, 'matchMedia', { value: (q: string) => ({ matches: !!opts.standalone && q.includes('standalone'), media: q }) });
  if (opts.ua) Object.defineProperty(win.navigator, 'userAgent', { value: opts.ua, configurable: true });
  return { dom, win, doc: win.document };
}

function promptEvent(win: Win, outcome: 'accepted' | 'dismissed') {
  const e = new win.Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }>; prompted: number };
  e.prompted = 0;
  e.prompt = async () => {
    e.prompted++;
  };
  e.userChoice = Promise.resolve({ outcome });
  return e;
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('install prompt', () => {
  it('captures beforeinstallprompt, shows the button and prompts on click', async () => {
    const { win, doc } = browser({ body: '<button data-installkite-install hidden>Get the app</button>' });
    const ik = createInstallkite(win, '1.2.3');
    const events: string[] = [];
    ik.on('installable', () => events.push('installable'));
    ik.on('installed', () => events.push('installed'));
    ik.init({ install: 'auto', manual: true });
    expect(ik.canInstall).toBe(false);
    expect(doc.querySelector('.ik-fab')).toBeNull();
    const e = promptEvent(win, 'accepted');
    win.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(ik.canInstall).toBe(true);
    expect(events).toEqual(['installable']);
    const own = doc.querySelector<HTMLButtonElement>('[data-installkite-install]')!;
    expect(own.hidden).toBe(false);
    const fab = doc.querySelector('.ik-fab')!;
    expect(fab.textContent).toContain(DEFAULT_TEXT.install);
    expect(doc.getElementById('installkite-style')).not.toBeNull();
    (fab.querySelector('.ik-go') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(e.prompted).toBe(1);
    expect(events).toEqual(['installable', 'installed']);
    expect(doc.querySelector('.ik-fab')).toBeNull();
    expect(own.hidden).toBe(true);
    expect(ik.version).toBe('1.2.3');
  });

  it('remembers a dismissed button and returns the prompt outcome', async () => {
    const { win, doc } = browser();
    const ik = createInstallkite(win).init({ install: 'auto', manual: true });
    win.dispatchEvent(promptEvent(win, 'dismissed'));
    (doc.querySelector('.ik-fab .ik-x') as HTMLButtonElement).click();
    expect(doc.querySelector('.ik-fab')).toBeNull();
    expect(win.localStorage.getItem('installkite:snoozed')).toMatch(/^\d+$/);
    // A new page load: the button stays hidden while snoozed, install() still works.
    const again = createInstallkite(win).init({ install: 'auto', manual: true });
    win.dispatchEvent(promptEvent(win, 'dismissed'));
    expect(doc.querySelectorAll('.ik-fab')).toHaveLength(0);
    expect(await again.install()).toBe('dismissed');
    expect(await again.install()).toBe('unavailable');
    expect(ik.isInstalled).toBe(false);
  });

  it('hides everything when already installed', () => {
    const { win, doc } = browser({ standalone: true, body: '<a data-installkite-install>Install</a>' });
    const ik = createInstallkite(win).init({ install: 'auto', manual: true });
    win.dispatchEvent(promptEvent(win, 'accepted'));
    expect(ik.isInstalled).toBe(true);
    expect(ik.canInstall).toBe(false);
    expect(doc.querySelector('.ik-fab')).toBeNull();
    expect(doc.querySelector<HTMLElement>('[data-installkite-install]')!.hidden).toBe(true);
  });

  it('shows Add to Home Screen instructions on iOS', async () => {
    const { win, doc } = browser({ ua: IPHONE });
    const ik = createInstallkite(win).init({ manual: true, text: { iosTitle: 'Adicionar a Tela de Inicio' } });
    expect(ik.isIOS).toBe(true);
    expect(ik.canInstall).toBe(true);
    expect(await ik.install()).toBe('instructions');
    const sheet = doc.querySelector('.ik-sheet')!;
    expect(sheet.getAttribute('role')).toBe('dialog');
    expect(sheet.querySelector('h2')!.textContent).toBe('Adicionar a Tela de Inicio');
    expect(sheet.querySelectorAll('li')).toHaveLength(3);
    expect(sheet.querySelector('img')!.getAttribute('src')).toBe('https://acme.example/apple-touch-icon.png');
    expect(sheet.querySelector('strong')!.textContent).toBe('Acme');
    expect(doc.activeElement!.classList.contains('ik-x')).toBe(true);
    ik.showIOSInstructions(); // only one sheet at a time
    expect(doc.querySelectorAll('.ik-sheet')).toHaveLength(1);
    doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(doc.querySelector('.ik-sheet')).toBeNull();
  });

  it('opens the iOS sheet from install elements', () => {
    const { win, doc } = browser({ ua: IPHONE, body: '<button data-installkite-install>Install</button>' });
    createInstallkite(win).init({ manual: true });
    doc.querySelector<HTMLButtonElement>('[data-installkite-install]')!.click();
    expect(doc.querySelector('.ik-sheet')).not.toBeNull();
    (doc.querySelector('.ik-veil') as HTMLElement).click();
    expect(doc.querySelector('.ik-sheet')).toBeNull();
  });
});

describe('service worker updates', () => {
  function fakeSw(win: Win, withController = true) {
    const listeners: Record<string, Array<() => void>> = {};
    const messages: unknown[] = [];
    const waiting = { state: 'installed', addEventListener: () => undefined, postMessage: (m: unknown) => messages.push(m) };
    const reg = { waiting, installing: null, addEventListener: () => undefined, update: async () => undefined };
    const registered: string[] = [];
    const sw = {
      controller: withController ? { postMessage: (_m: unknown, ports: MessagePort[]) => ports[0]!.postMessage({ cached: 2 }) } : null,
      register: async (url: string) => {
        registered.push(url);
        return reg;
      },
      addEventListener: (type: string, fn: () => void) => (listeners[type] ??= []).push(fn),
    };
    Object.defineProperty(win.navigator, 'serviceWorker', { value: sw, configurable: true });
    return { messages, registered, fire: (type: string) => listeners[type]?.forEach((f) => f()) };
  }

  it('registers, shows the update toast and activates the new version on Refresh', async () => {
    const { win, doc } = browser();
    const sw = fakeSw(win);
    const ik = createInstallkite(win);
    const events: string[] = [];
    ik.on('ready', () => events.push('ready'));
    ik.on('update', () => events.push('update'));
    ik.on('updated', () => events.push('updated'));
    ik.init({ manual: true, sw: '/app/sw.js' });
    const reg = await ik.register();
    expect(reg).not.toBeNull();
    expect(ik.registration).toBe(reg);
    expect(sw.registered).toEqual(['/app/sw.js']);
    expect(events).toEqual(['update', 'ready']);
    const toast = doc.querySelector('.ik-toast')!;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.textContent).toContain(DEFAULT_TEXT.update);
    (toast.querySelector('.ik-go') as HTMLButtonElement).click();
    expect(sw.messages).toEqual([{ type: 'SKIP_WAITING' }]);
    expect(doc.querySelector('.ik-toast')).toBeNull();
    sw.fire('controllerchange');
    expect(events).toContain('updated');
  });

  it('defaults the worker URL to sw.js next to the page and skips the toast when asked', async () => {
    const { win, doc } = browser();
    const sw = fakeSw(win);
    const ik = createInstallkite(win).init({ manual: true, update: 'none' });
    await ik.register();
    expect(sw.registered).toEqual(['https://acme.example/app/sw.js']);
    expect(doc.querySelector('.ik-toast')).toBeNull();
  });

  it('reports registration errors and works without service worker support', async () => {
    const { win } = browser();
    Object.defineProperty(win.navigator, 'serviceWorker', {
      value: {
        register: async () => {
          throw new Error('SecurityError');
        },
        addEventListener: () => undefined,
      },
      configurable: true,
    });
    const ik = createInstallkite(win).init({ manual: true });
    const errors: unknown[] = [];
    ik.on('error', (e) => errors.push(e));
    expect(await ik.register()).toBeNull();
    expect(String(errors[0])).toMatch(/SecurityError/);
    const bare = browser();
    expect(await createInstallkite(bare.win).init({ manual: true }).register()).toBeNull();
  });

  it('asks the worker to save pages for offline reading', async () => {
    const { win } = browser();
    fakeSw(win);
    const ik = createInstallkite(win).init({ manual: true });
    expect(await ik.cache(['/app/a/', '/app/b/'])).toBe(2);
    const none = browser();
    fakeSw(none.win, false);
    expect(await createInstallkite(none.win).init({ manual: true }).cache(['/x'])).toBe(0);
  });
});

describe('connectivity and events', () => {
  it('shows an offline badge and emits online and offline', () => {
    const { win, doc } = browser();
    const ik = createInstallkite(win).init({ manual: true, offline: 'badge' });
    const seen: string[] = [];
    const off = ik.on('offline', () => seen.push('offline'));
    ik.on('online', () => seen.push('online'));
    const domEvents: string[] = [];
    win.addEventListener('installkite:offline', () => domEvents.push('offline'));
    Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true });
    win.dispatchEvent(new win.Event('offline'));
    expect(ik.online).toBe(false);
    expect(doc.querySelector('.ik-badge')!.textContent).toBe(DEFAULT_TEXT.offline);
    Object.defineProperty(win.navigator, 'onLine', { value: true, configurable: true });
    win.dispatchEvent(new win.Event('online'));
    expect(doc.querySelector('.ik-badge')!.textContent).toBe(DEFAULT_TEXT.online);
    expect(doc.querySelector('.ik-badge')!.classList.contains('ik-on')).toBe(true);
    off();
    Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true });
    win.dispatchEvent(new win.Event('offline'));
    expect(seen).toEqual(['offline', 'online']);
    expect(domEvents).toEqual(['offline', 'offline']);
  });

  it('keeps going when a listener throws', () => {
    const { win } = browser();
    const ik = createInstallkite(win).init({ manual: true });
    let after = 0;
    ik.on('online', () => {
      throw new Error('boom');
    });
    ik.on('online', () => after++);
    const errors: unknown[] = [];
    win.setTimeout = ((fn: () => void) => {
      try {
        fn();
      } catch (e) {
        errors.push(e);
      }
      return 0;
    }) as typeof win.setTimeout;
    win.dispatchEvent(new win.Event('online'));
    expect(after).toBe(1);
    expect(errors).toHaveLength(1);
  });

  it('sets the accent from the theme color with a readable foreground', () => {
    const { win, doc } = browser();
    createInstallkite(win).init({ manual: true, install: 'auto' });
    win.dispatchEvent(promptEvent(win, 'accepted'));
    expect(doc.documentElement.style.getPropertyValue('--installkite-accent')).toBe('#2b8ff0');
    expect(doc.documentElement.style.getPropertyValue('--installkite-on-accent')).toBe('#fff');
  });
});

describe('script tag options', () => {
  it('reads data attributes', () => {
    const { doc } = browser();
    const s = doc.createElement('script');
    s.dataset.sw = 'sw.js';
    s.dataset.install = 'auto';
    s.dataset.update = 'none';
    s.dataset.offline = 'badge';
    s.dataset.manual = '';
    s.dataset.scope = '/app/';
    expect(optionsFromScript(s)).toEqual({ sw: 'https://acme.example/app/sw.js', install: 'auto', update: 'none', offline: 'badge', manual: true, scope: '/app/' });
    s.dataset.install = 'sometimes';
    expect(optionsFromScript(s).install).toBeUndefined();
    expect(optionsFromScript(null)).toEqual({});
  });

  it('the script tag build starts itself from its data attributes', () => {
    const code = readFileSync(join(__dirname, '..', 'dist', 'installkite.min.js'), 'utf8');
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://acme.example/', runScripts: 'dangerously' });
    const s = dom.window.document.createElement('script');
    s.setAttribute('data-manual', '');
    s.setAttribute('data-offline', 'badge');
    s.textContent = code;
    dom.window.document.head.appendChild(s);
    const ik = (dom.window as unknown as { installkite: { version: string; init: unknown; canInstall: boolean } }).installkite;
    expect(ik.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof ik.init).toBe('function');
    expect(ik.canInstall).toBe(false);
  });

  it('stays under 6 kB gzipped', () => {
    const code = readFileSync(join(__dirname, '..', 'dist', 'installkite.min.js'));
    expect(gzipSync(code, { level: 9 }).length).toBeLessThan(6 * 1024);
  });
});
