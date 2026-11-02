import { describe, expect, it } from 'vitest';
import { groupInt, km, longDate, utcDate, utcDay, utcMonth, utcTime } from './client';

describe('plain formatters', () => {
  it('groups whole numbers with commas', () => {
    expect(groupInt(25862287292.4)).toBe('25,862,287,292');
    expect(km.format(999)).toBe('999');
    expect(km.format(1000)).toBe('1,000');
    expect(groupInt(-1234567)).toBe('-1,234,567');
  });

  it('writes UTC dates and times', () => {
    const ms = Date.parse('2026-11-18T10:16:07Z');
    expect(utcTime(ms)).toBe('10:16:07 UTC');
    expect(utcDay(ms)).toBe('Wed 18 Nov');
    expect(utcDate(ms)).toBe('18 Nov 2026');
    expect(utcMonth(ms)).toBe('Nov');
    expect(longDate(Date.parse('2003-01-23T12:00:00Z'))).toBe('23 Jan 2003');
  });
});
