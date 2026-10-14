// Terminal output helpers and interactive questions.
import { createInterface } from 'node:readline';

export interface Out {
  write(s: string): void;
  isTTY?: boolean;
}

export function colors(enabled: boolean) {
  const wrap = (open: number, close: number) => (s: string): string => (enabled ? `\u001b[${open}m${s}\u001b[${close}m` : s);
  return {
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    red: wrap(31, 39),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    blue: wrap(34, 39),
    cyan: wrap(36, 39),
    gray: wrap(90, 39),
    sky: (s: string): string => (enabled ? `\u001b[38;5;39m${s}\u001b[39m` : s),
    sunset: (s: string): string => (enabled ? `\u001b[38;5;209m${s}\u001b[39m` : s),
  };
}
export type Colors = ReturnType<typeof colors>;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export interface Asker {
  ask(question: string, def?: string): Promise<string>;
  confirm(question: string, def: boolean): Promise<boolean>;
  choose<T extends string>(question: string, choices: readonly T[], def: T): Promise<T>;
  close(): void;
}

/** Interactive questions on a TTY (readline). Lines are read in order, so piped answers work too. */
export function createAsker(input: NodeJS.ReadableStream, output: NodeJS.WritableStream, c: Colors): Asker {
  const rl = createInterface({ input, output, terminal: false });
  const lines: string[] = [];
  const waiters: Array<(s: string) => void> = [];
  let closed = false;
  rl.on('line', (l) => {
    const w = waiters.shift();
    if (w) w(l);
    else lines.push(l);
  });
  rl.on('close', () => {
    closed = true;
    while (waiters.length) waiters.shift()!('');
  });
  const read = (): Promise<string> =>
    new Promise((resolve) => {
      if (lines.length) resolve(lines.shift()!);
      else if (closed) resolve('');
      else waiters.push(resolve);
    });
  const prompt = (q: string, def?: string): void => {
    output.write(`${c.sky('?')} ${c.bold(q)}${def !== undefined && def !== '' ? c.gray(` (${def})`) : ''} `);
  };
  return {
    async ask(question, def = '') {
      prompt(question, def);
      const a = (await read()).trim();
      return a || def;
    },
    async confirm(question, def) {
      prompt(question, def ? 'Y/n' : 'y/N');
      const a = (await read()).trim().toLowerCase();
      if (!a) return def;
      return a === 'y' || a === 'yes';
    },
    async choose(question, choices, def) {
      for (;;) {
        prompt(`${question} ${c.gray(`[${choices.join(', ')}]`)}`, def);
        const a = (await read()).trim();
        if (!a) return def;
        const hit = choices.find((x) => x.toLowerCase() === a.toLowerCase() || x.toLowerCase().startsWith(a.toLowerCase()));
        if (hit) return hit;
        output.write(`  ${c.yellow(`choose one of: ${choices.join(', ')}`)}\n`);
        if (closed && !lines.length) return def;
      }
    },
    close() {
      rl.close();
    },
  };
}
