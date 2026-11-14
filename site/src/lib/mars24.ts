/**
 * Mars time from the NASA GISS Mars24 algorithm
 * (https://www.giss.nasa.gov/tools/mars24/help/algorithm.html), steps A-2,
 * A-5 and C-2, with TT - UTC = 69.184 s as the page gives for dates after
 * 1 Jan 2017. A mission clock is pinned to one NASA record of a UTC time,
 * the sol and the local mean solar time, so the offset from Airy Mean Time
 * and the sol number both come from that record.
 */

export interface MissionRecord {
  utc: string;
  sol: number;
  lmst_h: number;
  tt_minus_utc_s: number;
}

export interface MarsClock {
  sol: number;
  lmst_h: number;
}

/** Mars Sol Date for a Unix time in milliseconds (steps A-2, A-5, C-2). */
export function marsSolDate(ms: number, ttMinusUtc = 69.184): number {
  const jdUt = 2440587.5 + ms / 86400000;
  const jdTt = jdUt + ttMinusUtc / 86400;
  return (jdTt - 2451549.5) / 1.0274912517 + 44796.0 - 0.0009626;
}

function frac(x: number): number {
  return x - Math.floor(x);
}

/** Sol and local mean solar time on the mission clock of `record` at `ms`. */
export function missionClock(ms: number, record: MissionRecord): MarsClock {
  const t0 = Date.parse(record.utc);
  const msd0 = marsSolDate(t0, record.tt_minus_utc_s);
  let offset = record.lmst_h / 24 - frac(msd0);
  offset -= Math.round(offset);
  const local0 = msd0 + offset;
  const local = marsSolDate(ms, record.tt_minus_utc_s) + offset;
  return { sol: record.sol + Math.floor(local) - Math.floor(local0), lmst_h: frac(local) * 24 };
}

/** "14:32" or "14:32:07" on a 24 hour Mars clock. */
export function marsTime(hours: number, seconds = false): string {
  const total = Math.floor(hours * 3600);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return seconds ? `${p(h)}:${p(m)}:${p(s)}` : `${p(h)}:${p(m)}`;
}
