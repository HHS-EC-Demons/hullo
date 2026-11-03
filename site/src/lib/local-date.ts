import { calDate } from './dates';

const p2 = (n: number) => String(n).padStart(2, '0');

/** "2 Nov 2026" for the visitor's own local day of `ms`, in the calDate format. */
export function localCalDate(ms: number): string {
  const t = new Date(ms);
  return calDate(`${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`);
}

/** "2026-11-02" for the visitor's own local day of `ms`. */
export function localIsoDay(ms: number): string {
  const t = new Date(ms);
  return `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`;
}
