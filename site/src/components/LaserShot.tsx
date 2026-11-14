import { lazy, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { AnimationPlaybackControls } from 'motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ChartFrame from '@/components/ui/chart-frame';
import { loadJson, km, useJson, useNow, useReducedMotion } from '../lib/client';
import { clock, localStamp, YOUR_TIME } from '../lib/dates';
import { stamp } from '../lib/passport';
import { monthKey, nextMonthKey, nextWindow, shotAt, type MoonIndex, type MoonMonth, type Shot } from '../lib/ranging';
import './laser.css';

const MoonRangeChart = lazy(() => import('./MoonRangeChart'));

const EARTH_R = 6371;
const DRIFT_CM_YEAR = 3.8;
const YEAR_MS = 365.25 * 86400000;
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
    for (const key of keys) {
      if (months[key]) continue;
      loadJson<MoonMonth>(`data/moon/${key}.json`)
        .then((m) => live && setMonths((prev) => ({ ...prev, [key]: m })))
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [wanted]);
  return months;
}

function useNear(ref: React.RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: '200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return near;
}

let motion: Promise<typeof import('motion')> | null = null;

function loadMotion() {
  motion ??= import('motion');
  return motion;
}

function elevationWord(el: number | null, min: number): string {
  if (el === null) return '';
  if (el < 0) return `${Math.round(el)}°, set`;
  if (el < min) return `${Math.round(el)}°, low`;
  return `${Math.round(el)}°`;
}

function Drift({ now }: { now: number | null }) {
  const label = useId();
  const thisYear = now ? new Date(now).getUTCFullYear() : 2026;
  const [born, setBorn] = useState(2014);
  const years = now ? Math.max(0, (now - Date.UTC(born, 6, 1)) / YEAR_MS) : null;
  const cm = years === null ? null : Math.round(years * DRIFT_CM_YEAR);
  return (
    <div className="ls-drift">
      <p id={label} className="ls-drift-label">
        Born <span className="mono">{born}</span>
      </p>
      <Slider
        thumbLabelledBy={label}
        thumbValueText={(v) => `${v}, the Moon is about ${cm ?? 0} cm farther from Earth since then`}
        min={1969}
        max={thisYear}
        step={1}
        value={[born]}
        onValueChange={([v]) => setBorn(v)}
      />
      <p className="ls-drift-out" aria-live="polite">
        <span className="mono">{cm === null ? '\u2007\u2007' : cm} cm</span> farther
      </p>
    </div>
  );
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
  const chartBox = useRef<HTMLDivElement>(null);
  const near = useNear(chartBox);

  const current = now ? monthKey(now) : null;
  const keys = current && index ? [current, nextMonthKey(current)].filter((k) => index.months.includes(k)) : [];
  const months = useMonths(keys);
  const loaded = keys.length > 0 && keys.every((k) => months[k]);
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
      stamp(reflector, `${result.round_trip_s.toFixed(4)} s round trip to ${name}, ${km.format(result.range_km)} km`);
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
  if (flying) what = 'Firing';
  else if (shot) what = <>Echo at <span className="mono">{shot.waited ? localStamp(shot.ms, { seconds: true }) : `${clock(shot.ms, true)} ${YOUR_TIME}`}</span></>;
  else if (preview) what = preview.waited ? <>Next echo, <span className="mono">{localStamp(preview.ms)}</span></> : 'Echo now';

  return (
    <div className="ls">
      <div className="wrap ls-hero">
        <div className="ls-left">
          <div className="ls-head">{head}</div>
          <div className="ls-controls">
            <fieldset className="choices">
              <legend>Mirror</legend>
              {(index?.reflectors ?? []).map((r) => (
                <label className="choice" key={r.id}>
                  <input type="radio" name={`${uid}-refl`} checked={reflector === r.id} onChange={() => setReflector(r.id)} />
                  <span>{r.name}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className="choices">
              <legend>Station</legend>
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
                    <span className="sr-only">, </span>
                    <small className="mono">{elevationWord(elNow(s.id), minEl) || ' '}</small>
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
                {shown ? shown.round_trip_s.toFixed(3) : ' .   '}
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
          <Drift now={now} />
          {error && <p className="note">Ranging data did not load.</p>}
        </div>
        {photo}
      </div>
      <section className="wrap ls-chartsec" aria-labelledby={`${uid}-ch`}>
        <h2 id={`${uid}-ch`} className="ls-h2">
          {chartTitle}
        </h2>
        <div ref={chartBox}>
          <ChartFrame className="h-[300px] md:h-[360px]">
            {near && loaded && current && now && (
              <MoonRangeChart
                month={months[current]}
                station={station}
                reflector={reflector}
                minEl={minEl}
                now={now}
                label={`Range from ${stationName} to the ${mirrorName} mirror, hour by hour this month, with now marked`}
              />
            )}
          </ChartFrame>
        </div>
      </section>
    </div>
  );
}
