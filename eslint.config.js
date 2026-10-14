import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const node = {
  process: 'readonly',
  console: 'readonly',
  URL: 'readonly',
  Buffer: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  fetch: 'readonly',
  globalThis: 'readonly',
  structuredClone: 'readonly',
};
const browser = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  location: 'readonly',
  localStorage: 'readonly',
  matchMedia: 'readonly',
  requestAnimationFrame: 'readonly',
  getComputedStyle: 'readonly',
  CustomEvent: 'readonly',
  HTMLElement: 'readonly',
  Blob: 'readonly',
  FileReader: 'readonly',
  Image: 'readonly',
  TextEncoder: 'readonly',
  caches: 'readonly',
  self: 'readonly',
  Response: 'readonly',
  Request: 'readonly',
  Headers: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'docs/', 'tmp/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...node } },
    rules: {
      'no-control-regex': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/runtime/**', 'src/sw/**', 'site/assets/**'],
    languageOptions: { globals: { ...browser } },
  },
);
