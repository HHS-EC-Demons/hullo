import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dayMs, lifelines, span, spanText } from './timeline';
import { sourceById } from './source-index';

const moon = JSON.parse(readFileSync(new URL('../../public/data/moon/index.json', import.meta.url), 'utf8'));

describe('timeline', () => {
  const lines = lifelines(moon.reflectors);

  it('has one line per object, oldest first, with the Apollo reflectors and the answering probes', () => {
    const ids = lines.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('surveyor3');
    expect(ids).toEqual(expect.arrayContaining(['voyager1', 'voyager2', 'newhorizons', 'a11', 'a14', 'a15', 'insight']));
    expect(ids).not.toContain('l1');
    for (let i = 1; i < lines.length; i++) expect(lines[i].start >= lines[i - 1].start).toBe(true);
  });

  it('ends every silent line after it starts and leaves answering lines open', () => {
    for (const l of lines) {
      if (l.answers) expect(l.end).toBeNull();
      else expect(dayMs(l.end as string)).toBeGreaterThan(dayMs(l.start));
    }
  });

  it('cites a listed source for every line', () => {
    for (const l of lines) for (const id of l.sources) expect(sourceById(id), `${l.id} ${id}`).toBeDefined();
  });

  it('counts whole calendar months', () => {
    expect(span(dayMs('2018-05-05'), dayMs('2022-12-21'))).toEqual({ years: 4, months: 7 });
    expect(span(dayMs('2022-12-21'), dayMs('2026-11-02'))).toEqual({ years: 3, months: 10 });
    expect(span(dayMs('1977-09-05'), dayMs('2026-09-05'))).toEqual({ years: 49, months: 0 });
    expect(span(dayMs('1977-09-05'), dayMs('2026-09-04'))).toEqual({ years: 48, months: 11 });
    expect(spanText({ years: 1, months: 1 })).toBe('1 year 1 month');
    expect(spanText({ years: 0, months: 0 })).toBe('less than a month');
  });
});
