/**
 * Dates and clock times for readers, built from Date getters and name
 * arrays without Intl, because the first Intl formatter on a page starts
 * ICU and costs hundreds of milliseconds on a slow phone.
 *
 * A calendar date reads "19 Apr 2021". A clock time shown to the visitor is
 * their own local time, "7:15 PM Tue 3 Nov (your time)". UTC appears only as
 * small secondary text where the science needs it, "10:16:07 UTC".
 */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const YOUR_TIME = '(your time)';

type When = string | number | Date;

const p2 = (n: number) => String(n).padStart(2, '0');
const PLAIN = /^(\d{4})-(\d{2})(?:-(\d{2}))?/;

function parts(when: When): { y: number; m: number; d: number } {
  if (typeof when === 'string') {
    const hit = PLAIN.exec(when.trim());
    if (hit) return { y: Number(hit[1]), m: Number(hit[2]) - 1, d: hit[3] ? Number(hit[3]) : 1 };
  }
  const t = new Date(when);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

/** "19 Apr 2021". A "2021-04-19" string keeps the source's own day, a timestamp uses its UTC day. */
export function calDate(when: When): string {
  const { y, m, d } = parts(when);
  return `${d} ${MONTHS[m]} ${y}`;
}

/** "Apr 2021". */
export function monthYear(when: When): string {
  const { y, m } = parts(when);
  return `${MONTHS[m]} ${y}`;
}

/** "Apr 2021" from a decimal year such as 2021.29. */
export function monthYearOf(decimalYear: number): string {
  const y = Math.floor(decimalYear + 1e-6);
  const m = Math.min(11, Math.max(0, Math.floor((decimalYear - y) * 12 + 1e-6)));
  return `${MONTHS[m]} ${y}`;
}

/** "7:15 PM" or, with seconds, "7:15:08 PM", in the visitor's local time. */
export function clock(ms: number, seconds = false): string {
  const t = new Date(ms);
  const h = t.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${p2(t.getMinutes())}${seconds ? `:${p2(t.getSeconds())}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Tue 3 Nov" in the visitor's local time, with the year when it is not this year. */
export function localDay(ms: number, now: number = Date.now()): string {
  const t = new Date(ms);
  const year = t.getFullYear() !== new Date(now).getFullYear() ? ` ${t.getFullYear()}` : '';
  return `${DAYS[t.getDay()]} ${t.getDate()} ${MONTHS[t.getMonth()]}${year}`;
}

/** "7:15 PM Tue 3 Nov (your time)". */
export function localStamp(ms: number, opts: { seconds?: boolean; now?: number; label?: boolean } = {}): string {
  const text = `${clock(ms, opts.seconds)} ${localDay(ms, opts.now)}`;
  return opts.label === false ? text : `${text} ${YOUR_TIME}`;
}

/** "10:16:07 UTC". */
export function utcClock(ms: number, seconds = true): string {
  const t = new Date(ms);
  return `${p2(t.getUTCHours())}:${p2(t.getUTCMinutes())}${seconds ? `:${p2(t.getUTCSeconds())}` : ''} UTC`;
}

/** "10:16:07 UTC 18 Nov 2026". */
export function utcStamp(ms: number, seconds = true): string {
  return `${utcClock(ms, seconds)} ${calDate(ms)}`;
}

/** "just now", "3 min ago", "2 h ago", "4 days ago". */
export function ago(ms: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'just now';
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 36) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}
