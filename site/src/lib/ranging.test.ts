import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { monthKey, nextMonthKey, nextWindow, shotAt, type MoonIndex, type MoonMonth } from './ranging';

function month(key: string): MoonMonth {
  return JSON.parse(readFileSync(new URL(`../../public/data/moon/${key}.json`, import.meta.url), 'utf8')) as MoonMonth;
}

const index = JSON.parse(readFileSync(new URL('../../public/data/moon/index.json', import.meta.url), 'utf8')) as MoonIndex;

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/horizons-moon.json', import.meta.url), 'utf8')) as {
  checks: { station: string; reflector: string; utc: string; elevation_deg: number; range_km: number; round_trip_s: number }[];
};

describe('laser round trip from the hourly Horizons table', () => {
  it.each(fixtures.checks)('matches Horizons from $station to $reflector at $utc', (check) => {
    const ms = Date.parse(check.utc);
    const shot = shotAt(month(monthKey(ms)), check.station, check.reflector, ms);
    expect(shot).not.toBeNull();
    const s = shot as NonNullable<typeof shot>;
    expect(Math.abs(s.range_km - check.range_km)).toBeLessThan(0.1);
    expect(Math.abs(s.round_trip_s - check.round_trip_s)).toBeLessThan(1e-6);
    expect(Math.abs(s.elevation_deg - check.elevation_deg)).toBeLessThan(1.5);
  });

  it('keeps every round trip between 2.3 s and 2.7 s', () => {
    expect(index.round_trip_s.min).toBeGreaterThan(2.3);
    expect(index.round_trip_s.max).toBeLessThan(2.7);
  });

  it('carries the first hour of the next month so the last hour interpolates', () => {
    const nov = month('2026-11');
    const dec = month('2026-12');
    const last = nov.stations.apache.refl.a15.r_m.at(-1);
    expect(last).toBe(dec.stations.apache.refl.a15.r_m[0]);
    expect(shotAt(nov, 'apache', 'a15', Date.parse('2026-11-30T23:30:00Z'))).not.toBeNull();
  });

  it('finds the next time the Moon is at least 20 degrees up', () => {
    const from = Date.parse('2027-02-11T05:41:00Z');
    const months = [month('2027-02'), month('2027-03')];
    const when = nextWindow(months, 'apache', from, 20) as number;
    expect(when).toBeGreaterThan(from);
    const shot = shotAt(month(monthKey(when)), 'apache', 'a11', when) as NonNullable<ReturnType<typeof shotAt>>;
    expect(shot.elevation_deg).toBeGreaterThanOrEqual(19.5);
    expect(when - from).toBeLessThan(26 * 3600 * 1000);
  });

  it('returns the same instant when the Moon is already up', () => {
    const ms = Date.parse('2026-11-20T03:17:00Z');
    expect(nextWindow([month('2026-11')], 'apache', ms, 20)).toBe(ms);
  });

  it('steps month keys across a year end', () => {
    expect(nextMonthKey('2026-12')).toBe('2027-01');
    expect(monthKey(Date.parse('2027-01-31T23:59:59Z'))).toBe('2027-01');
  });
});
