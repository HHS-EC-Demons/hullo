import type { APIRoute } from 'astro';
import { readData } from '../../lib/build-data';
import type { DeepSpaceData } from '../../lib/lighttime';

interface MoonIndex {
  c_km_s: number;
  months: string[];
}

interface MoonMonth {
  step_s: number;
  start_utc: string;
  stations: Record<string, { refl: Record<string, { r_m: number[] }> }>;
}

const V1_STEP_DAYS = 7;

function nextStart(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString();
}
const MOON_STEP_H = 6;

export const GET: APIRoute = () => {
  const deep = readData<DeepSpaceData>('deep-space.json');
  const v1 = deep.probes.voyager1;
  const rg: number[] = [];
  const rr: number[] = [];
  for (let i = 0; i < v1.rg_km.length; i += V1_STEP_DAYS) {
    rg.push(Math.round(v1.rg_km[i]));
    rr.push(Number(v1.rr_km_s[i].toFixed(4)));
  }

  const moon = readData<MoonIndex>('moon/index.json');
  const rt: number[] = [];
  const rate: number[] = [];
  let moonStart = '';
  const toRt = (m: number) => ((2 * m) / 1000 / moon.c_km_s) * 1e5;
  moon.months.forEach((m, mi) => {
    const month = readData<MoonMonth>(`moon/${m}.json`);
    if (!moonStart) moonStart = month.start_utc;
    const r = month.stations.apache.refl.a15.r_m;
    const perH = 3600 / month.step_s;
    const every = Math.round(MOON_STEP_H * perH);
    const end = mi < moon.months.length - 1 ? Math.round((Date.parse(nextStart(m)) - Date.parse(month.start_utc)) / 1000 / month.step_s) : r.length;
    for (let i = 0; i < end; i += every) {
      const a = r[Math.max(0, i - 1)];
      const b = r[Math.min(r.length - 1, i + 1)];
      const span = (Math.min(r.length - 1, i + 1) - Math.max(0, i - 1)) / perH;
      rt.push(Math.round(toRt(r[i])));
      rate.push(Math.round((toRt(b) - toRt(a)) / span));
    }
  });

  return new Response(
    JSON.stringify({
      source: 'Built from deep-space.json and moon/*.json, both from JPL Horizons',
      v1: { start_utc: deep.start_utc, step_s: deep.step_s * V1_STEP_DAYS, c_km_s: deep.c_km_s, rg_km: rg, rr_km_s: rr },
      moon: { start_utc: moonStart, step_s: MOON_STEP_H * 3600, station: 'Apache Point', reflector: 'Apollo 15', rt_1e5_s: rt, rate_1e5_s_per_h: rate },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
