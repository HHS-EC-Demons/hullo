import { describe, expect, it } from 'vitest';
import { ago, calDate, clock, localDay, localStamp, monthYear, monthYearOf, utcClock, utcStamp } from './dates';

describe('dates', () => {
  it('keeps the source day of a plain date string', () => {
    expect(calDate('2021-04-19')).toBe('19 Apr 2021');
    expect(calDate('1977-09-05T13:59Z')).toBe('5 Sep 1977');
    expect(monthYear('2012-08')).toBe('Aug 2012');
  });

  it('uses the UTC day of a timestamp', () => {
    expect(calDate(Date.UTC(2026, 10, 18, 23, 59))).toBe('18 Nov 2026');
    expect(utcStamp(Date.UTC(2026, 10, 18, 10, 16, 7))).toBe('10:16:07 UTC 18 Nov 2026');
    expect(utcClock(Date.UTC(2026, 10, 18, 10, 16, 7), false)).toBe('10:16 UTC');
  });

  it('reads a decimal year as a month', () => {
    expect(monthYearOf(1977.677)).toBe('Sep 1977');
    expect(monthYearOf(2026)).toBe('Jan 2026');
    expect(monthYearOf(2026.999)).toBe('Dec 2026');
  });

  it('prints a 12 hour local clock', () => {
    expect(clock(new Date(2026, 10, 3, 19, 15, 8).getTime())).toBe('7:15 PM');
    expect(clock(new Date(2026, 10, 3, 0, 5, 0).getTime(), true)).toBe('12:05:00 AM');
    expect(clock(new Date(2026, 10, 3, 12, 0, 0).getTime())).toBe('12:00 PM');
  });

  it('labels a local stamp and adds the year only when it differs', () => {
    const now = new Date(2026, 10, 3, 19, 16).getTime();
    expect(localStamp(new Date(2026, 10, 3, 19, 15).getTime(), { now })).toBe('7:15 PM Tue 3 Nov (your time)');
    expect(localDay(new Date(2027, 2, 2, 6).getTime(), now)).toBe('Tue 2 Mar 2027');
  });

  it('says how long ago', () => {
    const now = Date.UTC(2026, 10, 3, 1, 16);
    expect(ago(now - 10_000, now)).toBe('just now');
    expect(ago(now - 180_000, now)).toBe('3 min ago');
    expect(ago(now - 2 * 3600_000, now)).toBe('2 h ago');
    expect(ago(now - 4 * 86400_000, now)).toBe('4 days ago');
  });
});
