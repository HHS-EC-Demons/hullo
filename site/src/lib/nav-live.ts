import { hermite } from './lighttime';
import { asset } from './paths';

export interface NavData {
  v1: { start_utc: string; step_s: number; c_km_s: number; rg_km: number[]; rr_km_s: number[] };
  moon: { start_utc: string; step_s: number; station: string; reflector: string; rt_1e5_s: number[]; rate_1e5_s_per_h: number[] };
}

export interface NavFigures {
  v1LightS: number | null;
  moonEchoS: number | null;
}

/** Voyager 1's one-way light time in seconds from the weekly samples, by cubic Hermite. */
export function voyagerLight(d: NavData, ms: number): number | null {
  const v = d.v1;
  const t = (ms - Date.parse(v.start_utc)) / 1000 / v.step_s;
  const i = Math.floor(t);
  if (i < 0 || i >= v.rg_km.length - 1) return null;
  const rg = hermite(v.rg_km[i], v.rg_km[i + 1], v.rr_km_s[i], v.rr_km_s[i + 1], t - i, v.step_s);
  return rg / v.c_km_s;
}

/** Round trip of a laser pulse from Apache Point to the Apollo 15 mirror, by cubic Hermite on 6 hour samples. */
export function moonEcho(d: NavData, ms: number): number | null {
  const m = d.moon;
  const t = (ms - Date.parse(m.start_utc)) / 1000 / m.step_s;
  const i = Math.floor(t);
  const y = m.rt_1e5_s;
  const dy = m.rate_1e5_s_per_h;
  if (i < 0 || i >= y.length - 1) return null;
  return hermite(y[i], y[i + 1], dy[i], dy[i + 1], t - i, m.step_s / 3600) / 1e5;
}

export function shortHms(seconds: number): string {
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

let data: NavData | null = null;
let loading: Promise<NavData | null> | null = null;
let figures: NavFigures = { v1LightS: null, moonEchoS: null };
const listeners = new Set<(f: NavFigures) => void>();
let timer = 0;

function compute(): void {
  if (!data) return;
  const now = Date.now();
  figures = { v1LightS: voyagerLight(data, now), moonEchoS: moonEcho(data, now) };
  listeners.forEach((cb) => cb(figures));
}

function schedule(): void {
  window.clearTimeout(timer);
  if (document.visibilityState === 'hidden') return;
  timer = window.setTimeout(() => {
    compute();
    schedule();
  }, 1000 - (Date.now() % 1000) + 8);
}

function load(): Promise<NavData | null> {
  if (!loading) {
    loading = fetch(asset('data/nav.json'))
      .then((r) => (r.ok ? (r.json() as Promise<NavData>) : null))
      .catch(() => null)
      .then((d) => {
        data = d;
        compute();
        schedule();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') compute();
          schedule();
        });
        return d;
      });
  }
  return loading;
}

export function getFigures(): NavFigures {
  return figures;
}

export function subscribeFigures(cb: (f: NavFigures) => void): () => void {
  listeners.add(cb);
  load();
  if (data) cb(figures);
  return () => listeners.delete(cb);
}
