import { beforeEach, describe, expect, it } from 'vitest';
import { STAMP_OBJECTS } from '../data/stamps';
import { STAMP_EVENT, clearStamps, getHolder, getStamp, getStamps, onStamp, setHolder, stamp, stampCount } from './passport';

class MemoryStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const store = new MemoryStorage();
const target = new EventTarget();
Object.assign(globalThis, {
  localStorage: store,
  window: Object.assign(target, { localStorage: store }),
});

beforeEach(() => store.clear());

describe('passport', () => {
  it('keeps the first stamp for an object and its figure', () => {
    const first = stamp('voyager1', '23 h 57 min 46 s of light away', 1000);
    expect(first).toEqual({ id: 'voyager1', detail: '23 h 57 min 46 s of light away', at: 1000 });
    const again = stamp('voyager1', 'other', 2000);
    expect(again).toEqual(first);
    expect(stampCount()).toBe(1);
    expect(getStamp('voyager1')?.detail).toBe('23 h 57 min 46 s of light away');
  });

  it('returns the same array until the stamps change', () => {
    stamp('a11', '2.5034 s round trip', 1);
    const a = getStamps();
    expect(getStamps()).toBe(a);
    stamp('a14', '2.5101 s round trip', 2);
    expect(getStamps()).not.toBe(a);
    expect(getStamps().map((s) => s.id)).toEqual(['a11', 'a14']);
  });

  it('fires hullo:stamp with the count for a new stamp only', () => {
    const seen: number[] = [];
    const raw: Event[] = [];
    const listen = (e: Event) => raw.push(e);
    target.addEventListener(STAMP_EVENT, listen);
    const stop = onStamp((n) => seen.push(n));
    stamp('ingenuity', 'Flight 9, 625 m', 5);
    stamp('ingenuity', 'Flight 10, 233 m', 6);
    stamp('insight', 'Silent for 3 years', 7);
    stop();
    target.removeEventListener(STAMP_EVENT, listen);
    expect(seen).toEqual([1, 2]);
    expect((raw[0] as CustomEvent).detail.stamp.id).toBe('ingenuity');
  });

  it('survives broken storage and ignores empty ids', () => {
    store.setItem('hullo.passport.v1', '{not json');
    expect(getStamps()).toEqual([]);
    expect(stamp('', 'x')).toBeNull();
    store.setItem('hullo.passport.v1', JSON.stringify([{ id: 'a15', detail: 'ok', at: 3 }, { id: 4 }, null]));
    expect(getStamps().map((s) => s.id)).toEqual(['a15']);
    clearStamps();
    expect(stampCount()).toBe(0);
  });

  it('keeps the certificate name on the device only', () => {
    setHolder('  Test   Reader ');
    expect(getHolder()).toBe(' Test Reader ');
    setHolder('   ');
    expect(getHolder()).toBe('');
  });

  it('gives every object a unique id', () => {
    const ids = STAMP_OBJECTS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('voyager1');
    expect(ids).toContain('pioneer10');
    expect(ids).toContain('surveyor3');
  });
});
