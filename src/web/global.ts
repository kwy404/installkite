// The web checker bundle for docs/app/: exposes the checker on
// window.InstallkiteChecker for the page script.
import { VERSION } from '../version.js';
import { browserLoader, checkSite, commandFor, groupChecks, normalizeSiteUrl, reportText, verdictFor } from './checker.js';

const api = { version: VERSION, checkSite, normalizeSiteUrl, commandFor, reportText, groupChecks, verdictFor, browserLoader };

declare global {
  interface Window {
    InstallkiteChecker: typeof api;
  }
}

(globalThis as unknown as Window).InstallkiteChecker = api;
