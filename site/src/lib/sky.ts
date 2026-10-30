export interface SkyBody {
  key: string;
  name: string;
  short: string;
  kind: 'probe' | 'world';
  holds?: string;
}

export interface SkyIndex {
  months: string[];
  bodies: SkyBody[];
  constellations: Record<string, string>;
  star_count: number;
}

export interface SkyMonth {
  month: string;
  first_day: string;
  days: (number | string)[][];
}

export interface SkyStars {
  mag_limit: number;
  stars: number[];
  lines: number[][];
}

export interface SkyPosition {
  key: string;
  ra: number;
  dec: number;
  con: string;
}

const DEG = Math.PI / 180;

/**
 * Hammer equal-area projection of right ascension and declination in degrees,
 * centered on `ra0`, with right ascension growing to the left as on a sky map.
 * Returns x in [-2√2, 2√2] and y in [-√2, √2], y up.
 */
export function hammer(ra: number, dec: number, ra0 = 0): [number, number] {
  const lon = -((((ra - ra0 + 540) % 360) + 360) % 360 - 180) * DEG;
  const lat = dec * DEG;
  const z = Math.sqrt(1 + Math.cos(lat) * Math.cos(lon / 2));
  return [(2 * Math.SQRT2 * Math.cos(lat) * Math.sin(lon / 2)) / z, (Math.SQRT2 * Math.sin(lat)) / z];
}

/** Longitude from the chart center in degrees, -180 to 180. */
export function offsetFromCenter(ra: number, ra0 = 0): number {
  return ((((ra - ra0 + 540) % 360) + 360) % 360) - 180;
}

/** Month key and day index (0 based) for a UTC instant. */
export function skyDay(ms: number): { month: string; day: number } {
  const d = new Date(ms);
  return { month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, day: d.getUTCDate() - 1 };
}

/** Positions of every body on one day of a month file. */
export function positionsOn(month: SkyMonth, bodies: SkyBody[], day: number): SkyPosition[] {
  const row = month.days[Math.max(0, Math.min(month.days.length - 1, day))];
  return bodies.map((b, i) => ({
    key: b.key,
    ra: Number(row[i * 3]),
    dec: Number(row[i * 3 + 1]),
    con: String(row[i * 3 + 2]),
  }));
}

/** Right ascension in degrees as hours and minutes, for example 17h 14m. */
export function raText(ra: number): string {
  const total = Math.round((((ra % 360) + 360) % 360) * 4);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Declination in degrees with a sign and one decimal, for example +12.1°. */
export function decText(dec: number): string {
  const v = dec.toFixed(1);
  return `${dec >= 0 ? '+' : '−'}${v.replace('-', '')}°`;
}
