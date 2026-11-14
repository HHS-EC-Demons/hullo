import { useEffect, useState, useSyncExternalStore } from 'react';
import { asset } from './paths';

const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(path: string): Promise<T> {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetch(asset(path)).then((res) => {
      if (!res.ok) throw new Error(`${path} returned ${res.status}`);
      return res.json();
    });
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit as Promise<T>;
}

export function useJson<T>(path: string | null): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    if (!path) return;
    let live = true;
    loadJson<T>(path)
      .then((data) => live && setState({ data, error: null }))
      .catch((e: Error) => live && setState({ data: null, error: e.message }));
    return () => {
      live = false;
    };
  }, [path]);
  return state;
}

export function useNow(stepMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    let timer = 0;
    const tick = () => {
      setNow(Date.now());
      timer = window.setTimeout(tick, stepMs - (Date.now() % stepMs) + 5);
    };
    timer = window.setTimeout(tick, stepMs - (Date.now() % stepMs) + 5);
    return () => window.clearTimeout(timer);
  }, [stepMs]);
  return now;
}

function subscribeMotion(cb: () => void): () => void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number) => String(n).padStart(2, '0');

/**
 * Date and number text without Intl. The first Intl formatter on a page
 * starts ICU, which costs hundreds of milliseconds on a slow phone, so the
 * live numbers use these plain English formats instead.
 */
export function zoneLabel(ms: number): string {
  const off = -new Date(ms).getTimezoneOffset();
  if (off === 0) return 'UTC';
  const a = Math.abs(off);
  return `UTC${off > 0 ? '+' : '-'}${Math.floor(a / 60)}${a % 60 ? `:${p2(a % 60)}` : ''}`;
}

export function localDate(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function localTime(ms: number): string {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${zoneLabel(ms)}`;
}

export function utcTime(ms: number): string {
  const d = new Date(ms);
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;
}

export function utcDay(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function utcDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function utcMonth(ms: number): string {
  return MONTHS[new Date(ms).getUTCMonth()];
}

export function longDate(ms: number): string {
  return utcDate(ms);
}

export function groupInt(n: number): string {
  const sign = n < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(n)));
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return sign + out;
}

export const km = { format: groupInt };
