import { describe, expect, it } from 'vitest';
import record from '../data/jezero-clock.json';
import { marsSolDate, marsTime, missionClock } from './mars24';

describe('mars24', () => {
  it('matches both worked examples on the GISS page, MST 23.99425 h and 13.16537 h', () => {
    const mst = (ms: number) => (marsSolDate(ms, 64.184) % 1) * 24;
    expect(mst(947116800000)).toBeCloseTo(23.99425, 4);
    expect(mst(1073137591000)).toBeCloseTo(13.16537, 4);
  });

  it('reproduces the record it is pinned to', () => {
    const c = missionClock(Date.parse(record.utc), record);
    expect(c.sol).toBe(record.sol);
    expect(c.lmst_h).toBeCloseTo(record.lmst_h, 6);
  });

  it('agrees with NASA raw image records for sols 0 and 1000 within a minute', () => {
    const zero = missionClock(Date.parse('2021-02-18T22:12:14.779Z'), record);
    expect(zero.sol).toBe(0);
    expect(Math.abs(zero.lmst_h - (17 + 19 / 60 + 22.412 / 3600))).toBeLessThan(1 / 60);
    const thousand = missionClock(Date.parse('2023-12-13T05:25:33.000Z'), record);
    expect(thousand.sol).toBe(1000);
    expect(Math.abs(thousand.lmst_h - (12 + 52 / 60 + 38.733 / 3600))).toBeLessThan(1 / 60);
  });

  it('formats a 24 hour Mars clock', () => {
    expect(marsTime(12.930876)).toBe('12:55');
    expect(marsTime(12.930876, true)).toBe('12:55:51');
  });
});
