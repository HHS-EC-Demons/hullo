import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lifelines } from '../data/timeline';
import { answeringOn, quietEvents, quietSteps } from './quiet-count';
import { localCalDate, localIsoDay } from './local-date';

const moon = JSON.parse(readFileSync(new URL('../../public/data/moon/index.json', import.meta.url), 'utf8'));

describe('quiet count', () => {
  const lines = lifelines(moon.reflectors);
  const events = quietEvents(lines);

  it('has one start per object and one last contact per silent object, oldest first', () => {
    const silent = lines.filter((l) => !l.answers).length;
    expect(events.length).toBe(lines.length + silent);
    for (let i = 1; i < events.length; i++) expect(events[i].ms).toBeGreaterThanOrEqual(events[i - 1].ms);
    expect(events.filter((e) => e.kind === 'went quiet').length).toBe(silent);
  });

  it('never counts below zero and ends on the objects that still answer', () => {
    for (const e of events) expect(e.count).toBeGreaterThanOrEqual(0);
    expect(events[events.length - 1].count).toBe(lines.filter((l) => l.answers).length);
  });

  it('counts what was answering on a given day', () => {
    expect(answeringOn(lines, '1965-01-01')).toBe(0);
    expect(answeringOn(lines, '1967-04-20')).toBe(1);
    expect(answeringOn(lines, '2026-11-02')).toBe(lines.filter((l) => l.answers).length);
    expect(answeringOn(lines, '2022-12-14')).toBe(answeringOn(lines, '2022-12-16') + 1);
  });

  it('steps from zero at the timeline start to the count today', () => {
    const now = Date.parse('2026-11-02T12:00:00Z');
    const steps = quietSteps(events, now);
    expect(steps[0].count).toBe(0);
    expect(steps[steps.length - 1]).toEqual({ ms: now, count: lines.filter((l) => l.answers).length });
  });
});

describe('local dates', () => {
  it('formats the local day in the calDate style', () => {
    const ms = new Date(2026, 10, 2, 23, 30).getTime();
    expect(localCalDate(ms)).toBe('2 Nov 2026');
    expect(localIsoDay(ms)).toBe('2026-11-02');
  });
});
