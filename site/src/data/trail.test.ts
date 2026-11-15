import { describe, expect, it } from 'vitest';
import { TRAIL, TRAIL_PHOTOS, yearsLater } from './trail';
import { PHOTO_CREDIT_PAGES, sourceById } from './source-index';
import { SILENT } from './silent';

describe('trail', () => {
  it('runs oldest first with one photo per stop', () => {
    for (let i = 1; i < TRAIL.length; i++) expect(TRAIL[i].year).toBeGreaterThan(TRAIL[i - 1].year);
    expect(new Set(TRAIL_PHOTOS).size).toBe(TRAIL.length + 2);
  });

  it('cites a listed source for every stop', () => {
    for (const s of TRAIL) {
      expect(s.sources.length).toBeGreaterThan(0);
      for (const id of s.sources) expect(sourceById(id), `${s.name} ${id}`).toBeDefined();
    }
  });

  it('credits every photo under Home on the Sources page', () => {
    const home = PHOTO_CREDIT_PAGES.find((p) => p.page === 'Home');
    expect(home?.credits.length).toBe(TRAIL_PHOTOS.length);
  });

  it('matches the last contact years on the Silent page', () => {
    const ended = TRAIL.map((s) => ({ s, silent: SILENT.find((x) => x.name === s.name || x.short === s.name) })).filter((x) => x.silent);
    expect(ended.map((x) => x.s.name)).toEqual(['Surveyor 3', 'Viking 1']);
    for (const { s, silent } of ended) expect(s.status).toBe(`Last contact ${silent?.date.slice(0, 4)}`);
  });

  it('keeps the visible copy short and plain', () => {
    for (const s of TRAIL) {
      const text = [s.name, s.place, s.did, s.status].join(' ');
      expect(s.did.split(' ').length).toBeLessThanOrEqual(6);
      expect(text).not.toMatch(/[():;!?—–]/);
    }
  });

  it('words the gap between two years', () => {
    expect(yearsLater(1976, 1977)).toBe('1 year later');
    expect(yearsLater(1977, 2021)).toBe('44 years later');
  });
});
