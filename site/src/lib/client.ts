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

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short',
});
const utcTimeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});
const longDateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function localDate(ms: number): string {
  return dateFmt.format(ms);
}

export function localTime(ms: number): string {
  return timeFmt.format(ms);
}

export function utcTime(ms: number): string {
  return `${utcTimeFmt.format(ms)} UTC`;
}

const utcDateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const utcDayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export function utcDay(ms: number): string {
  return utcDayFmt.format(ms);
}

export function utcDate(ms: number): string {
  return utcDateFmt.format(ms);
}

export function longDate(ms: number): string {
  return longDateFmt.format(ms);
}

export const km = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
