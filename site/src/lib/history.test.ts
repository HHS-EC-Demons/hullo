import { describe, expect, it } from 'vitest';
import history from '../data/probe-history.json';
import { decimalYear, seriesAt, sunGainKm, type History } from './history';

const H = history as History;

describe('history', () => {
  it('reads decimal years', () => {
    expect(decimalYear(Date.UTC(2026, 0, 1))).toBe(2026);
    expect(decimalYear(Date.UTC(2027, 0, 1)) - decimalYear(Date.UTC(2026, 6, 2, 12))).toBeCloseTo(0.5, 2);
  });

  it('interpolates between samples and refuses outside the table', () => {
    expect(seriesAt([2000, 2001], [10, 20], 2000.5)).toBeCloseTo(15, 6);
    expect(seriesAt([2000, 2001], [10, 20], 1999)).toBeNull();
  });

  it('puts Voyager 1 about 3.6 AU a year farther from the Sun now', () => {
    const km = sunGainKm(H, 'voyager1', Date.UTC(2025, 10, 2), Date.UTC(2026, 10, 2));
    expect(km).not.toBeNull();
    expect((km as number) / H.au_km).toBeGreaterThan(3.4);
    expect((km as number) / H.au_km).toBeLessThan(3.7);
  });

  it('has no Voyager 1 reading before launch', () => {
    expect(sunGainKm(H, 'voyager1', Date.UTC(1970, 0, 1), Date.UTC(2026, 0, 1))).toBeNull();
  });
});
