// Script tag build (dist/installkite.js): creates window.installkite and
// starts from the script tag's data- attributes.
import { createInstallkite, optionsFromScript } from './core.js';

declare const __VERSION__: string;

const script = document.currentScript as HTMLScriptElement | null;
const w = window as Window & typeof globalThis & { installkite?: ReturnType<typeof createInstallkite> };
if (!w.installkite) {
  const ik = createInstallkite(w, __VERSION__);
  w.installkite = ik;
  ik.init(optionsFromScript(script));
}
