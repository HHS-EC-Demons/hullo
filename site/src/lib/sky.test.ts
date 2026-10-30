import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decText, hammer, positionsOn, raText, skyDay, type SkyIndex, type SkyMonth } from './sky';

const data = (path: string) => JSON.parse(readFileSync(new URL(`../../public/data/sky/${path}`, import.meta.url), 'utf8'));

describe('hammer projection', () => {
  it('puts the chart center at the origin and the poles at the top and bottom', () => {
    const [x0, y0] = hammer(0, 0);
    expect(x0).toBeCloseTo(0, 9);
    expect(y0).toBeCloseTo(0, 9);
    expect(hammer(123, 90)[1]).toBeCloseTo(Math.SQRT2, 9);
    expect(hammer(123, -90)[1]).toBeCloseTo(-Math.SQRT2, 9);
  });

  it('grows right ascension to the left, like a map of the sky seen from inside', () => {
    expect(hammer(90, 0)[0]).toBeLessThan(0);
    expect(hammer(270, 0)[0]).toBeGreaterThan(0);
    expect(Math.abs(hammer(179.999, 0)[0])).toBeCloseTo(2 * Math.SQRT2, 3);
  });
});

describe('sky positions', () => {
  it('finds the month file and day for a UTC instant', () => {
    expect(skyDay(Date.UTC(2026, 9, 30, 23, 59))).toEqual({ month: '2026-10', day: 29 });
    expect(skyDay(Date.UTC(2027, 0, 1, 0, 0))).toEqual({ month: '2027-01', day: 0 });
  });

  it('reads Voyager 1 on 30 Oct 2026 as the Horizons observer table gives it', () => {
    const index = data('index.json') as SkyIndex;
    const month = data('2026-10.json') as SkyMonth;
    const v1 = positionsOn(month, index.bodies, 29).find((p) => p.key === 'voyager1')!;
    expect(v1.ra).toBeCloseTo(258.73836, 2);
    expect(v1.dec).toBeCloseTo(12.10059, 2);
    expect(v1.con).toBe('Oph');
    expect(index.constellations[v1.con]).toBe('Ophiuchus');
  });

  it('ships every star brighter than magnitude 5.5 and no fainter ones', () => {
    const stars = data('stars.json') as { mag_limit: number; stars: number[] };
    const mags = stars.stars.filter((_, i) => i % 3 === 2);
    expect(mags.length).toBe(2847);
    expect(Math.max(...mags)).toBeLessThanOrEqual(5.5);
  });
});

describe('coordinate text', () => {
  it('writes right ascension in hours and minutes and declination with a sign', () => {
    expect(raText(258.73836)).toBe('17h 15m');
    expect(raText(359.99)).toBe('0h 00m');
    expect(decText(12.10059)).toBe('+12.1°');
    expect(decText(-20.29)).toBe('−20.3°');
  });
});
