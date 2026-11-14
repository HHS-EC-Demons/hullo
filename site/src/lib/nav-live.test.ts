import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lightTimeAt, type DeepSpaceData } from './lighttime';
import { moonEcho, shortHms, voyagerLight, type NavData } from './nav-live';
import { GET } from '../pages/data/nav.json';

const deep = JSON.parse(readFileSync(new URL('../../public/data/deep-space.json', import.meta.url), 'utf8')) as DeepSpaceData;
const read = (m: string) => JSON.parse(readFileSync(new URL(`../../public/data/moon/${m}.json`, import.meta.url), 'utf8'));

describe('compact samples behind the nav figures', async () => {
  const res = await (GET as unknown as () => Response)();
  const nav = (await res.json()) as NavData;

  it('keeps Voyager 1 within 2 ms of the daily table', () => {
    for (const iso of ['2026-02-03T05:00:00Z', '2026-11-18T10:16:07Z', '2027-03-02T06:05:00Z', '2027-09-30T23:59:00Z']) {
      const ms = Date.parse(iso);
      expect(Math.abs((voyagerLight(nav, ms) as number) - (lightTimeAt(deep, 'voyager1', ms) as number))).toBeLessThan(0.002);
    }
  });

  it('keeps the Apollo 15 echo from Apache Point within 2 ms of the hourly table', () => {
    const month = read('2026-11');
    const r = month.stations.apache.refl.a15.r_m as number[];
    for (const h of [5, 77, 301, 555]) {
      const ms = Date.parse(month.start_utc) + h * 3600e3;
      const exact = (2 * r[h]) / 1000 / nav.v1.c_km_s;
      expect(Math.abs((moonEcho(nav, ms) as number) - exact)).toBeLessThan(0.002);
    }
  });

  it('formats a light time as hours, minutes and seconds', () => {
    expect(shortHms(86399.9)).toBe('23h 59m 59s');
    expect(shortHms(3601)).toBe('1h 00m 01s');
  });
});
