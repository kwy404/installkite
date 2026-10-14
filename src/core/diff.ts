// Line diff (Myers' O(ND) algorithm) and unified diff output, used by
// --dry-run to show what would change in each file.

export type DiffOp = { type: 'equal' | 'add' | 'remove'; line: string };

/** The shortest edit script between two lists of lines. */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)) x = v[offset + k + 1]!;
      else x = v[offset + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }
  // Walk the trace backwards.
  const ops: DiffOp[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d]!;
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && vd[offset + k - 1]! < vd[offset + k + 1]!)) prevK = k + 1;
    else prevK = k - 1;
    const prevX = d === 0 ? 0 : vd[offset + prevK]!;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', line: a[x - 1]! });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) ops.push({ type: 'add', line: b[y - 1]! });
      else ops.push({ type: 'remove', line: a[x - 1]! });
      x = prevX;
      y = prevY;
    }
  }
  while (x > 0 && y > 0) {
    ops.push({ type: 'equal', line: a[x - 1]! });
    x--;
    y--;
  }
  return ops.reverse();
}

export interface UnifiedOptions {
  context?: number;
  color?: boolean;
}

/** A unified diff between two texts, or an empty string when they are equal. */
export function unifiedDiff(oldText: string, newText: string, file: string, opts: UnifiedOptions = {}): string {
  if (oldText === newText) return '';
  const context = opts.context ?? 3;
  const split = (s: string): string[] => {
    const lines = s.replace(/\r\n/g, '\n').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  };
  const ops = diffLines(split(oldText), split(newText));
  const paint = (code: string, s: string): string => (opts.color ? `\u001b[${code}m${s}\u001b[0m` : s);
  const out: string[] = [paint('1', `--- a/${file}`), paint('1', `+++ b/${file}`)];
  // Group changes into hunks with context.
  const changes = ops.map((o, i) => (o.type === 'equal' ? -1 : i)).filter((i) => i >= 0);
  let i = 0;
  while (i < changes.length) {
    let start = Math.max(0, changes[i]! - context);
    let end = Math.min(ops.length, changes[i]! + context + 1);
    while (i + 1 < changes.length && changes[i + 1]! - context <= end) {
      i++;
      end = Math.min(ops.length, changes[i]! + context + 1);
    }
    i++;
    // Line numbers at the hunk start.
    let oldLine = 1;
    let newLine = 1;
    for (let k = 0; k < start; k++) {
      if (ops[k]!.type !== 'add') oldLine++;
      if (ops[k]!.type !== 'remove') newLine++;
    }
    const body: string[] = [];
    let oldCount = 0;
    let newCount = 0;
    for (let k = start; k < end; k++) {
      const o = ops[k]!;
      if (o.type === 'equal') {
        body.push(` ${o.line}`);
        oldCount++;
        newCount++;
      } else if (o.type === 'remove') {
        body.push(paint('31', `-${o.line}`));
        oldCount++;
      } else {
        body.push(paint('32', `+${o.line}`));
        newCount++;
      }
    }
    out.push(paint('36', `@@ -${oldCount ? oldLine : oldLine - 1},${oldCount} +${newCount ? newLine : newLine - 1},${newCount} @@`));
    out.push(...body);
    start = end;
  }
  return `${out.join('\n')}\n`;
}
