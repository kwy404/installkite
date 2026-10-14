// ES module build of the runtime (import installkite from 'installkite/runtime').
// Call init() once in the browser:
//   import installkite from 'installkite/runtime';
//   installkite.init({ sw: '/sw.js', install: 'auto' });
import { createInstallkite, type Installkite } from './core.js';

export { createInstallkite, optionsFromScript, DEFAULT_TEXT } from './core.js';
export type { EventName, Installkite, Listener, Options, Texts } from './core.js';

declare const __VERSION__: string;

let instance: Installkite | null = null;

/** The shared instance, created on first use (so importing on the server is safe). */
function get(): Installkite {
  if (!instance) {
    const w = window as Window & typeof globalThis & { installkite?: Installkite };
    instance = w.installkite ?? createInstallkite(w, __VERSION__);
    w.installkite = instance;
  }
  return instance;
}

const installkite = new Proxy({} as Installkite, {
  get(_t, key) {
    const target = get();
    const v = (target as unknown as Record<string | symbol, unknown>)[key];
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v;
  },
});

export default installkite;
