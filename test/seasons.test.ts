// The seasonal themes of the site: site/static/seasons.js runs in a fake
// window, then its date logic and the ?season= overrides are checked.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const SRC = readFileSync(new URL('../site/static/seasons.js', import.meta.url), 'utf8');

interface Seasons {
  id: string;
  active: string;
  forced: boolean;
  easter(year: number): Date;
  detect(date: Date, lang?: string): string;
  label(id?: string): string;
  set(on: boolean): void;
}

function load({ search = '', lang = 'en-US', stored = {} as Record<string, string> } = {}) {
  const attrs: Record<string, string> = {};
  const store = { ...stored };
  const window = {
    location: { search },
    navigator: { language: lang },
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => (store[k] = v),
      removeItem: (k: string) => delete store[k],
    },
    document: {
      documentElement: {
        setAttribute: (k: string, v: string) => (attrs[k] = v),
        removeAttribute: (k: string) => delete attrs[k],
      },
    },
    dispatchEvent: () => true,
  } as Record<string, unknown>;
  runInNewContext(SRC, { window, Date, Math });
  return { api: window.ikSeasons as Seasons, attrs, store };
}

const { api } = load();
const day = (iso: string) => {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('Easter', () => {
  it('matches the known dates from 2024 to 2030', () => {
    const known: Record<number, string> = { 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21' };
    for (const [y, iso] of Object.entries(known)) expect(ymd(api.easter(Number(y)))).toBe(iso);
  });
});

describe('season windows', () => {
  const cases: [string, string, string?][] = [
    // New Year: Dec 30 to Jan 2.
    ['2026-12-29', ''],
    ['2026-12-30', 'newyear'],
    ['2027-01-02', 'newyear'],
    ['2027-01-03', ''],
    // Christmas: Dec 18 to Dec 26.
    ['2026-12-17', ''],
    ['2026-12-18', 'christmas'],
    ['2026-12-26', 'christmas'],
    ['2026-12-27', ''],
    // Halloween: Oct 24 to Oct 31.
    ['2026-10-23', ''],
    ['2026-10-24', 'halloween'],
    ['2026-10-31', 'halloween'],
    ['2026-11-01', ''],
    // Valentine's: Feb 14 everywhere, June 12 only in Brazil.
    ['2027-02-13', ''],
    ['2027-02-14', 'valentine'],
    ['2027-02-15', ''],
    ['2027-06-12', '', 'en-US'],
    ['2027-06-12', 'valentine', 'pt-BR'],
    // Carnival 2027: Easter March 28, Ash Wednesday February 10, from Saturday February 6.
    ['2027-02-05', ''],
    ['2027-02-06', 'carnival'],
    ['2027-02-10', 'carnival'],
    ['2027-02-11', ''],
    // Carnival 2026 starts on February 14: Brazil keeps Carnival, others Valentine's.
    ['2026-02-14', 'valentine', 'en-US'],
    ['2026-02-14', 'carnival', 'pt-BR'],
    ['2026-02-15', 'carnival', 'en-US'],
    ['2026-02-18', 'carnival'],
    // Easter: Good Friday to Easter Sunday.
    ['2026-04-02', ''],
    ['2026-04-03', 'easter'],
    ['2026-04-05', 'easter'],
    ['2026-04-06', ''],
    ['2025-04-18', 'easter'],
    ['2025-04-17', ''],
    // Festa Junina (Midsummer elsewhere): June 13 to June 29.
    ['2026-06-12', ''],
    ['2026-06-13', 'junina'],
    ['2026-06-29', 'junina', 'pt-BR'],
    ['2026-06-30', ''],
    // An ordinary day.
    ['2026-09-01', ''],
  ];
  for (const [iso, want, lang] of cases) {
    it(`${iso}${lang ? ` (${lang})` : ''} is ${want || 'no season'}`, () => {
      expect(api.detect(day(iso), lang || 'en-US')).toBe(want);
    });
  }
  it('treats the start and the end of a day the same', () => {
    expect(api.detect(new Date(2026, 9, 24, 0, 0, 1))).toBe('halloween');
    expect(api.detect(new Date(2026, 9, 31, 23, 59, 59))).toBe('halloween');
    expect(api.detect(new Date(2026, 3, 3, 0, 0, 1))).toBe('easter');
  });
});

describe('labels', () => {
  it('names Festa Junina for pt-BR visitors and Midsummer for others', () => {
    expect(load({ search: '?season=junina', lang: 'pt-BR' }).api.label()).toBe('Festa Junina mode');
    expect(load({ search: '?season=junina', lang: 'en-GB' }).api.label()).toBe('Midsummer mode');
    expect(api.label('halloween')).toBe('Halloween mode');
    expect(api.label('nope')).toBe('');
  });
});

describe('overrides and the off switch', () => {
  it('forces a season with ?season=<id>', () => {
    const { api: s, attrs } = load({ search: '?season=christmas' });
    expect(s.id).toBe('christmas');
    expect(s.forced).toBe(true);
    expect(attrs['data-season']).toBe('christmas');
  });
  it('turns seasons off with ?season=off', () => {
    const { api: s, attrs } = load({ search: '?x=1&season=off' });
    expect(s.id).toBe('');
    expect(attrs['data-season']).toBeUndefined();
  });
  it('ignores an unknown ?season= value', () => {
    expect(load({ search: '?season=summer' }).api.forced).toBe(false);
  });
  it('remembers the off switch per season', () => {
    const first = load({ search: '?season=easter' });
    first.api.set(false);
    expect(first.attrs['data-season']).toBeUndefined();
    expect(first.store['ik:season:easter']).toBe('off');
    first.api.set(true);
    expect(first.attrs['data-season']).toBe('easter');
    expect(first.store['ik:season:easter']).toBeUndefined();
  });
  it('a forced season shows even when it was switched off', () => {
    const s = load({ search: '?season=halloween', stored: { 'ik:season:halloween': 'off' } });
    expect(s.api.active).toBe('halloween');
  });
});
