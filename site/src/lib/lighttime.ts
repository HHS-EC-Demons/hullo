export const C_KM_S = 299792.458;

export interface ProbeSeries {
  name: string;
  horizons_id: string;
  horizons_target: string;
  rg_km: number[];
  rr_km_s: number[];
  up_s: number[];
  light_day_utc: string | null;
}

export interface DeepSpaceData {
  generated_utc: string;
  source: string;
  start_utc: string;
  start_jd_ut: number;
  step_s: number;
  c_km_s: number;
  probes: Record<string, ProbeSeries>;
}

export interface RangeSample {
  rg_km: number;
  rr_km_s: number;
}

/**
 * Cubic Hermite interpolation between two samples a step `h` seconds apart,
 * with values y0, y1 and rates d0, d1 in units per second, at fraction s.
 */
export function hermite(y0: number, y1: number, d0: number, d1: number, s: number, h: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * y0 +
    (s3 - 2 * s2 + s) * h * d0 +
    (-2 * s3 + 3 * s2) * y1 +
    (s3 - s2) * h * d1
  );
}

/** Derivative of the Hermite curve, in units per second. */
export function hermiteRate(y0: number, y1: number, d0: number, d1: number, s: number, h: number): number {
  const s2 = s * s;
  return (
    ((6 * s2 - 6 * s) * y0 + (3 * s2 - 4 * s + 1) * h * d0 + (-6 * s2 + 6 * s) * y1 + (3 * s2 - 2 * s) * h * d1) / h
  );
}

function locate(data: DeepSpaceData, key: string, ms: number): { p: ProbeSeries; i: number; s: number } | null {
  const p = data.probes[key];
  if (!p) return null;
  const t = (ms - Date.parse(data.start_utc)) / 1000 / data.step_s;
  const i = Math.floor(t);
  if (i < 0 || i >= p.rg_km.length - 1) return null;
  return { p, i, s: t - i };
}

/** Geometric distance from Earth's center and its rate at a UTC instant. */
export function rangeAt(data: DeepSpaceData, key: string, ms: number): RangeSample | null {
  const at = locate(data, key, ms);
  if (!at) return null;
  const { p, i, s } = at;
  const h = data.step_s;
  return {
    rg_km: hermite(p.rg_km[i], p.rg_km[i + 1], p.rr_km_s[i], p.rr_km_s[i + 1], s, h),
    rr_km_s: hermiteRate(p.rg_km[i], p.rg_km[i + 1], p.rr_km_s[i], p.rr_km_s[i + 1], s, h),
  };
}

/** One-way light time in seconds for the geometric distance at `ms`. */
export function lightTimeAt(data: DeepSpaceData, key: string, ms: number): number | null {
  const r = rangeAt(data, key, ms);
  return r ? r.rg_km / data.c_km_s : null;
}

/** Seconds a message sent from Earth's center at `ms` takes to reach the probe. */
export function uplinkAt(data: DeepSpaceData, key: string, ms: number): number | null {
  const at = locate(data, key, ms);
  if (!at) return null;
  const { p, i, s } = at;
  return p.up_s[i] + (p.up_s[i + 1] - p.up_s[i]) * s;
}

/** UTC milliseconds when a message sent at `sentMs` reaches the probe. */
export function arrivalAt(data: DeepSpaceData, key: string, sentMs: number): number | null {
  const up = uplinkAt(data, key, sentMs);
  return up === null ? null : sentMs + up * 1000;
}

/** Daily light time series in hours, for charts. */
export function dailyHours(data: DeepSpaceData, key: string): { ms: number; hours: number }[] {
  const p = data.probes[key];
  const t0 = Date.parse(data.start_utc);
  return p.rg_km.map((rg, i) => ({ ms: t0 + i * data.step_s * 1000, hours: rg / data.c_km_s / 3600 }));
}

export interface Hms {
  h: number;
  m: number;
  s: number;
}

export function splitHms(seconds: number): Hms {
  const whole = Math.floor(seconds);
  return { h: Math.floor(whole / 3600), m: Math.floor((whole % 3600) / 60), s: whole % 60 };
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function hmsText(seconds: number): string {
  const { h, m, s } = splitHms(seconds);
  if (h > 0) return `${h} h ${pad2(m)} min ${pad2(s)} s`;
  if (m > 0) return `${m} min ${pad2(s)} s`;
  return `${s} s`;
}
