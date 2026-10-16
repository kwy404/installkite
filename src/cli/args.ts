// A small argument parser: --flag, --no-flag, --key value, --key=value,
// -y style short flags and positionals.

export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

export interface ArgSpec {
  /** Flags that take a value. */
  values: readonly string[];
  /** Boolean flags (also accept --no-<flag>). */
  booleans: readonly string[];
  /** Short aliases: { y: 'yes' }. */
  aliases: Readonly<Record<string, string>>;
}

export class ArgError extends Error {}

/** Edit distance between two short words (insert, delete, replace, swap). */
export function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

/** The candidate closest to a mistyped word, when it is close enough to be a typo. */
export function closest(word: string, candidates: readonly string[]): string | undefined {
  const w = word.toLowerCase();
  let best: string | undefined;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = c.replace(/-/g, '') === w.replace(/-/g, '') ? 0.5 : distance(w, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best !== undefined && bestD <= Math.max(1, Math.floor(w.length / 3)) ? best : undefined;
}

const hint = (key: string, spec: ArgSpec): string => {
  const near = closest(key, [...spec.values, ...spec.booleans]);
  return near ? `. Did you mean --${near}?` : '';
};

export function parseArgs(argv: readonly string[], spec: ArgSpec): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      let key = eq > 0 ? a.slice(2, eq) : a.slice(2);
      const inline = eq > 0 ? a.slice(eq + 1) : undefined;
      if (spec.values.includes(key)) {
        const v = inline ?? argv[++i];
        if (v === undefined || (inline === undefined && v.startsWith('--'))) throw new ArgError(`--${key} needs a value`);
        flags[key] = v;
        continue;
      }
      let value = true;
      if (key.startsWith('no-') && spec.booleans.includes(key.slice(3))) {
        key = key.slice(3);
        value = false;
      }
      if (!spec.booleans.includes(key)) throw new ArgError(`unknown option --${key}${hint(key, spec)}`);
      if (inline !== undefined) {
        if (!/^(true|false|1|0|yes|no)$/i.test(inline)) throw new ArgError(`--${key} is a switch, it takes no value`);
        value = /^(true|1|yes)$/i.test(inline) ? value : !value;
      }
      flags[key] = value;
    } else if (a.startsWith('-') && a.length > 1) {
      for (const ch of a.slice(1)) {
        const long = spec.aliases[ch];
        if (!long) throw new ArgError(`unknown option -${ch}`);
        if (spec.values.includes(long)) {
          const v = argv[++i];
          if (v === undefined) throw new ArgError(`-${ch} needs a value`);
          flags[long] = v;
        } else flags[long] = true;
      }
    } else positionals.push(a);
  }
  return { command: positionals.shift(), positionals, flags };
}
