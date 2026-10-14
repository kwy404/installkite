// The package version, injected at build time by tsup and vitest.
declare const __VERSION__: string | undefined;

export const VERSION: string = typeof __VERSION__ === 'string' ? __VERSION__ : '0.0.0-dev';
