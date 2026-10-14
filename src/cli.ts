#!/usr/bin/env node
import { run } from './cli/main.js';

run(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  stdin: process.stdin,
  cwd: process.cwd(),
  env: process.env,
}).then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    process.stderr.write(`installkite: ${(e as Error)?.stack || String(e)}\n`);
    process.exitCode = 1;
  },
);
