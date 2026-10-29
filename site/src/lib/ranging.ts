import { C_KM_S, hermite } from './lighttime';

export interface ReflectorSeries {
  r_m: number[];
  rr_mm_s: number[];
}

export interface StationSeries {
  el: number[];
  refl: Record<string, ReflectorSeries>;
}

export interface MoonMonth {
  step_s: number;
  start_utc: string;
  stations: Record<string, StationSeries>;
}

export interface Reflector {
  id: string;
  name: string;
  lat: number;
  lon: number;
  nasa: boolean;
  placed: string;
  source: string;
}

export interface Station {
  id: string;
  name: string;
  place: string;
  code: string;
  laser: string;
  center_site?: string;
  center_geodetic?: string;
}

export interface MoonIndex {
  generated_utc: string;
  source: string;
  c_km_s: number;
  months: string[];
  min_elevation_deg: number;
  round_trip_s: { min: number; max: number };
  reflectors: Reflector[];
  stations: Station[];
}

export interface Shot {
  ms: number;
  range_km: number;
  round_trip_s: number;
  elevation_deg: number;
}

export function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function nextMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function position(month: MoonMonth, ms: number, length: number): { i: number; s: number } | null {
  const t = (ms - Date.parse(month.start_utc)) / 1000 / month.step_s;
  const i = Math.floor(t);
  if (i < 0 || i >= length - 1) return null;
  return { i, s: t - i };
}

/** Station to reflector range, round trip time and elevation at a UTC instant. */
export function shotAt(month: MoonMonth, station: string, reflector: string, ms: number): Shot | null {
  const st = month.stations[station];
  const series = st?.refl[reflector];
  if (!series) return null;
  const at = position(month, ms, series.r_m.length);
  if (!at) return null;
  const { i, s } = at;
  const r_m = hermite(
    series.r_m[i],
    series.r_m[i + 1],
    series.rr_mm_s[i] / 1000,
    series.rr_mm_s[i + 1] / 1000,
    s,
    month.step_s,
  );
  const range_km = r_m / 1000;
  return {
    ms,
    range_km,
    round_trip_s: (2 * range_km) / C_KM_S,
    elevation_deg: st.el[i] + (st.el[i + 1] - st.el[i]) * s,
  };
}

/**
 * First instant at or after `fromMs` when the Moon stands at least `minEl`
 * degrees above the station's horizon, searched across the given months.
 * Elevation is interpolated linearly between hourly samples.
 */
export function nextWindow(months: MoonMonth[], station: string, fromMs: number, minEl: number): number | null {
  for (const month of months) {
    const el = month.stations[station]?.el;
    if (!el) continue;
    const t0 = Date.parse(month.start_utc);
    const step = month.step_s * 1000;
    for (let i = 0; i < el.length - 1; i++) {
      const a = t0 + i * step;
      const b = a + step;
      if (b <= fromMs) continue;
      const ea = el[i];
      const eb = el[i + 1];
      const start = Math.max(a, fromMs);
      const eStart = ea + ((eb - ea) * (start - a)) / step;
      if (eStart >= minEl) return start;
      if (eb >= minEl) {
        const cross = a + ((minEl - ea) / (eb - ea)) * step;
        return Math.ceil(Math.max(cross, start) / 1000) * 1000;
      }
    }
  }
  return null;
}
