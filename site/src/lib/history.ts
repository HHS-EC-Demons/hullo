export interface Track {
  name: string;
  first_utc: string;
  t: number[];
  sun_au: number[];
  earth_light_h: number[];
}

export interface History {
  au_km: number;
  probes: Record<string, Track>;
}

/** Decimal UTC year, so 1 Jul 2026 00:00 UTC is about 2026.496. */
export function decimalYear(ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  const a = Date.UTC(y, 0, 1);
  const b = Date.UTC(y + 1, 0, 1);
  return y + (ms - a) / (b - a);
}

/** Linear reading of a monthly series at decimal year `x`, or null outside the table. */
export function seriesAt(t: number[], v: number[], x: number): number | null {
  if (!t.length || x < t[0] || x > t[t.length - 1]) return null;
  let lo = 0;
  let hi = t.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t[mid] <= x) lo = mid;
    else hi = mid;
  }
  if (t[hi] === t[lo]) return v[lo];
  return v[lo] + ((v[hi] - v[lo]) * (x - t[lo])) / (t[hi] - t[lo]);
}

/** Kilometres a probe moved away from the Sun between two instants, from the monthly Horizons table. */
export function sunGainKm(h: History, key: string, fromMs: number, toMs: number): number | null {
  const p = h.probes[key];
  const a = seriesAt(p.t, p.sun_au, decimalYear(fromMs));
  const b = seriesAt(p.t, p.sun_au, decimalYear(toMs));
  return a === null || b === null ? null : (b - a) * h.au_km;
}
