import { lazy, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { AnimationPlaybackControls } from 'motion';
import { Button } from '@/components/ui/button';
import ChartFrame from '@/components/ui/chart-frame';
import { Skeleton } from '@/components/ui/skeleton';
import { loadJson, km, useJson, useNow, useReducedMotion } from '../lib/client';
import { clock, localStamp } from '../lib/dates';
import { stamp } from '../lib/passport';
import { monthKey, nextMonthKey, nextWindow, shotAt, type MoonIndex, type MoonMonth, type Shot } from '../lib/ranging';
import './laser.css';

const MoonRangeChart = lazy(() => import('./MoonRangeChart'));

const EARTH_R = 6371;
const MOON_R = 1737.4;

interface Fired extends Shot {
  station: string;
  reflector: string;
  waited: boolean;
}

function useMonths(keys: string[]): Record<string, MoonMonth> {
  const [months, setMonths] = useState<Record<string, MoonMonth>>({});
  const wanted = keys.join(',');
  useEffect(() => {
    let live = true;
    const todo = keys.filter((k) => !months[k]);
    (async () => {
      for (const key of todo) {
        const m = await loadJson<MoonMonth>(`data/moon/${key}.json`).catch(() => null);
        if (!live || !m) return;
        setMonths((prev) => ({ ...prev, [key]: m }));
      }
    })();
    return () => {
      live = false;
    };
  }, [wanted]);
  return months;
}

let motion: Promise<typeof import('motion')> | null = null;

function loadMotion() {
  motion ??= import('motion');
  return motion;
}

function elevationWord(el: number | null): string {
  return el === null ? '' : `${Math.round(el)}°`;
}


export default function LaserShot({ index: given, head, photo, chartTitle }: { index?: MoonIndex; head?: ReactNode; photo?: ReactNode; chartTitle?: string }) {
  const { data: fetched, error } = useJson<MoonIndex>(given ? null : 'data/moon/index.json');
  const index = given ?? fetched;
  const now = useNow(1000);
  const reduced = useReducedMotion();
  const uid = useId();
  const [reflector, setReflector] = useState('a15');
  const [station, setStation] = useState('apache');
  const [touched, setTouched] = useState(false);
  const [fired, setFired] = useState<Fired | null>(null);
  const [flying, setFlying] = useState(false);
  const pulse = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const flight = useRef<AnimationPlaybackControls[]>([]);

  const current = now ? monthKey(now) : null;
  const wanted = current && index ? [current, nextMonthKey(current)].filter((k) => index.months.includes(k)) : [];
  const months = useMonths(wanted);
  const keys = wanted.filter((k) => months[k]);
  const loaded = !!current && !!months[current];
  const minEl = index?.min_elevation_deg ?? 20;

  const elNow = (st: string): number | null => {
    if (!loaded || !now || !current) return null;
    const shot = shotAt(months[current], st, 'a11', now);
    return shot ? shot.elevation_deg : null;
  };

  useEffect(() => () => flight.current.forEach((a) => a.stop()), []);

  useEffect(() => {
    if (touched || !loaded || !index) return;
    let best = station;
    let top = -91;
    for (const s of index.stations) {
      const el = elNow(s.id);
      if (el !== null && el > top) {
        top = el;
        best = s.id;
      }
    }
    if (best !== station) setStation(best);
  }, [loaded, touched]);

  function aim(from: number): Fired | null {
    if (!loaded) return null;
    const list = keys.map((k) => months[k]);
    const when = nextWindow(list, station, from, minEl);
    if (when === null) return null;
    const shot = shotAt(months[monthKey(when)] ?? list[0], station, reflector, when);
    if (!shot) return null;
    return { ...shot, station, reflector, waited: when - from > 1500 };
  }

  function fire() {
    if (!loaded || !index) return;
    const result = aim(Date.now());
    if (!result) return;
    const name = index.reflectors.find((r) => r.id === reflector)?.name ?? reflector;
    const land = () => {
      setFlying(false);
      setFired(result);
      stamp(reflector, `${result.round_trip_s.toFixed(1)} s round trip to ${name}, ${km.format(result.range_km)} km`);
    };
    flight.current.forEach((a) => a.stop());
    flight.current = [];
    const el = pulse.current;
    const track = line.current;
    if (reduced || !el || !track) {
      land();
      return;
    }
    setFired(null);
    setFlying(true);
    const travel = Math.max(0, track.getBoundingClientRect().width - el.getBoundingClientRect().width);
    const duration = result.round_trip_s;
    const edge = Math.min(0.04, 0.12 / duration);
    loadMotion()
      .then(({ animate }) => {
        const move = animate(el, { x: [0, travel, 0] }, { duration, ease: 'linear', times: [0, 0.5, 1] });
        const glow = animate(el, { opacity: [0, 1, 1, 0] }, { duration, ease: 'linear', times: [0, edge, 1 - edge, 1] });
        flight.current = [move, glow];
        return move.finished;
      })
      .then(land, land);
  }

  const shot = fired && fired.reflector === reflector && fired.station === station ? fired : null;
  const preview = !shot && now ? aim(now) : null;
  const shown = shot ?? preview;
  const live = now && loaded ? shotAt(months[current!], station, reflector, now) : null;
  const distance = live?.range_km ?? 384400;
  const span = EARTH_R + distance + MOON_R;
  const ex = (EARTH_R / span) * 100;
  const mx = ((EARTH_R + distance) / span) * 100;
  const stationName = index?.stations.find((s) => s.id === station)?.name ?? '';
  const mirrorName = index?.reflectors.find((r) => r.id === reflector)?.name ?? '';

  let what: ReactNode = ' ';
  if (shot) what = <>Echo <span className="mono">{shot.waited ? localStamp(shot.ms, { seconds: true, label: false }) : clock(shot.ms, true)}</span></>;
  else if (preview?.waited) what = <>Echo <span className="mono">{localStamp(preview.ms, { label: false })}</span></>;
  else if (preview || flying) what = 'Echo';

  return (
    <div className="ls">
      <div className="wrap ls-hero">
        <div className="ls-left">
          <div className="ls-head">{head}</div>
          <div className="ls-controls">
            <fieldset className="choices" aria-label="Mirror">
              {(index?.reflectors ?? []).map((r) => (
                <label className="choice" key={r.id}>
                  <input type="radio" name={`${uid}-refl`} checked={reflector === r.id} onChange={() => setReflector(r.id)} />
                  <span>{r.name}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="choices" aria-label="Station">
              {(index?.stations ?? []).map((s) => (
                <label className="choice" key={s.id}>
                  <input
                    type="radio"
                    name={`${uid}-st`}
                    checked={station === s.id}
                    onChange={() => {
                      setTouched(true);
                      setStation(s.id);
                    }}
                  />
                  <span>
                    {s.name}
                    <small className="mono">{elevationWord(elNow(s.id)) || ' '}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="ls-fireline">
            <Button variant="primary" size="lg" className="ls-fire" type="button" onClick={fire} onPointerEnter={loadMotion} onFocus={loadMotion} disabled={!loaded || flying}>
              {flying ? 'Firing' : 'Fire laser'}
            </Button>
            <div className="ls-readout" aria-live="polite">
              <p className={`ls-big mono${flying ? ' ls-dim' : ''}`}>
                {shown ? shown.round_trip_s.toFixed(1) : <Skeleton className="inline-block h-[0.78em] w-[5ch] align-baseline" />}
                <span className="u">s</span>
              </p>
              <p className="ls-what">{what}</p>
            </div>
          </div>
          <figure className="ls-scene" style={{ ['--ex' as string]: ex.toFixed(4), ['--mx' as string]: mx.toFixed(4), ['--mr' as string]: ((MOON_R / span) * 100).toFixed(4) }}>
            <div className="ls-stage" aria-hidden="true">
              <span className="ls-earth" />
              <span ref={line} className="ls-line" />
              <span className="ls-moon" />
              <span ref={pulse} className="ls-pulse" />
            </div>
            <figcaption className="ls-labels">
              <span>Earth</span>
              <span className="ls-mid mono">{live ? `${km.format(live.range_km)} km` : ' '}</span>
              <span>Moon</span>
            </figcaption>
          </figure>
          {error && <p className="note">Ranging data did not load.</p>}
        </div>
        {photo}
      </div>
      <section className="wrap ls-chartsec" aria-label={chartTitle}>
        <div>
          <ChartFrame className="h-[300px] md:h-[360px]">
            {loaded && current && now ? (
              <MoonRangeChart
                month={months[current]}
                station={station}
                reflector={reflector}
                minEl={minEl}
                now={Math.floor(now / 60000) * 60000}
                label={`Range from ${stationName} to the ${mirrorName} mirror, hour by hour this month, with now marked`}
              />
            ) : (
              <Skeleton className="absolute inset-0" />
            )}
          </ChartFrame>
        </div>
      </section>
    </div>
  );
}
