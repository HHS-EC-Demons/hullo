import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { arrivalAt, hmsText, lightTimeAt, rangeAt, uplinkAt, type DeepSpaceData } from './lighttime';

const data = JSON.parse(
  readFileSync(new URL('../../public/data/deep-space.json', import.meta.url), 'utf8'),
) as DeepSpaceData;

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/horizons-deep-space.json', import.meta.url), 'utf8')) as {
  checks: { probe: string; utc: string; lt_s: number; rg_km: number; rr_km_s: number }[];
};

describe('light time from the daily Horizons table', () => {
  it.each(fixtures.checks)('matches Horizons for $probe at $utc', (check) => {
    const ms = Date.parse(check.utc);
    const lt = lightTimeAt(data, check.probe, ms);
    const r = rangeAt(data, check.probe, ms);
    expect(lt).not.toBeNull();
    expect(Math.abs((lt as number) - check.lt_s)).toBeLessThan(0.01);
    expect(Math.abs((r as { rg_km: number }).rg_km - check.rg_km)).toBeLessThan(2);
    expect(Math.abs((r as { rr_km_s: number }).rr_km_s - check.rr_km_s)).toBeLessThan(0.001);
  });

  it('puts Voyager 1 at one light-day on 2026-11-18 at 10:16:07 UTC, as NASA states', () => {
    const lt = lightTimeAt(data, 'voyager1', Date.parse('2026-11-18T10:16:07Z')) as number;
    expect(Math.abs(lt - 86400)).toBeLessThan(0.01);
    expect(data.probes.voyager1.light_day_utc?.slice(0, 19)).toMatch(/^2026-11-18T10:16:0[67]/);
  });

  it('adds the distance Voyager 1 covers at about 17 km/s while a message is on its way', () => {
    const ms = Date.parse('2026-11-18T10:16:07Z');
    const lt = lightTimeAt(data, 'voyager1', ms) as number;
    const up = uplinkAt(data, 'voyager1', ms) as number;
    expect(up).toBeGreaterThan(lt);
    expect(Math.abs(up - lt - (17 * lt) / data.c_km_s)).toBeLessThan(0.6);
    expect(arrivalAt(data, 'voyager1', ms)).toBeCloseTo(ms + up * 1000, 0);
  });

  it('returns null outside the table', () => {
    expect(lightTimeAt(data, 'voyager1', Date.parse('2025-06-01T00:00:00Z'))).toBeNull();
    expect(lightTimeAt(data, 'voyager1', Date.parse('2029-06-01T00:00:00Z'))).toBeNull();
  });

  it('formats durations in hours, minutes and seconds', () => {
    expect(hmsText(86399.99)).toBe('23 h 59 min 59 s');
    expect(hmsText(2.5)).toBe('2 s');
    expect(hmsText(61)).toBe('1 min 01 s');
  });
});
