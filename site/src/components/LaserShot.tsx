import { useEffect, useId, useRef, useState } from 'react';
import type { AnimationPlaybackControls } from 'motion';
import { Button } from '@/components/ui/button';
import { loadJson, km, useJson, useNow, useReducedMotion, utcTime, utcDay } from '../lib/client';
import { stamp } from '../lib/passport';
import { monthKey, nextMonthKey, nextWindow, shotAt, type MoonIndex, type MoonMonth, type Shot } from '../lib/ranging';
import './laser.css';

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

export default function LaserShot({ index: given }: { index?: MoonIndex }) {
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

  function fire() {
    if (!loaded || !now || !index) return;
    const t = Date.now();
    const list = keys.map((k) => months[k]);
    const when = nextWindow(list, station, t, minEl);
    if (when === null) return;
    const shot = shotAt(months[monthKey(when)] ?? list[0], station, reflector, when);
    if (!shot) return;
    const result: Fired = { ...shot, station, reflector, waited: when - t > 1500 };
    const name = index.reflectors.find((r) => r.id === reflector)?.name ?? reflector;
    const land = () => {
      setFlying(false);
      setFired(result);
      stamp(reflector, `${shot.round_trip_s.toFixed(4)} s round trip to ${name}, ${km.format(shot.range_km)} km`);
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
    const duration = shot.round_trip_s;
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

  const shown = fired && fired.reflector === reflector && fired.station === station ? fired : null;
  const distance = shown?.range_km ?? 384400;
  const span = EARTH_R + distance + MOON_R;
  const ex = (EARTH_R / span) * 100;
  const mx = ((EARTH_R + distance) / span) * 100;

  return (
    <div className="ls">
      <figure className="ls-scene" style={{ ['--ex' as string]: ex.toFixed(4), ['--mx' as string]: mx.toFixed(4), ['--mr' as string]: ((MOON_R / span) * 100).toFixed(4) }}>
        <div className="ls-stage" aria-hidden="true">
          <span className="ls-earth" />
          <span ref={line} className="ls-line" />
          <span className="ls-moon" />
          <span ref={pulse} className="ls-pulse" />
        </div>
        <figcaption className="ls-labels">
          <span>Earth</span>
          <span className="ls-mid mono">{shown ? `${km.format(shown.range_km)} km` : '~384,400 km'}</span>
          <span>Moon</span>
        </figcaption>
      </figure>
      <div className="ls-top">
      <div className="ls-controls">
        <fieldset className="choices">
          <legend>Mirror</legend>
          {(index?.reflectors ?? []).map((r) => (
            <label className="choice" key={r.id}>
              <input
                type="radio"
                name={`${uid}-refl`}
                checked={reflector === r.id}
                onChange={() => setReflector(r.id)}
              />
              <span>{r.name}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="choices ls-stations">
          <legend>Station</legend>
          {(index?.stations ?? []).map((s) => (
            <label className="choice" key={s.id}>
              <input type="radio" name={`${uid}-st`} checked={station === s.id} onChange={() => {
                  setTouched(true);
                  setStation(s.id);
                }} />
              <span>
                {s.name}
                <span className="sr-only">, </span>
                <small className="mono">{elevationWord(elNow(s.id), minEl) || '\u2007'}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <Button variant="primary" size="lg" className="ls-fire" type="button" onClick={fire} onPointerEnter={loadMotion} onFocus={loadMotion} disabled={!loaded || flying}>
          {flying ? 'Firing' : 'Fire laser'}
        </Button>
        {error && <p className="note">Ranging data did not load.</p>}
      </div>
      <div className="ls-readout" aria-live="polite">
        {shown && (
          <p className="ls-big mono">
            {shown.round_trip_s.toFixed(3)}
            <span className="u">s</span>
          </p>
        )}
        {shown && (
          <p className="ls-what">
            Round trip, <span className="mono">{shown.waited ? `${utcDay(shown.ms)}, ${utcTime(shown.ms)}` : utcTime(shown.ms)}</span>
          </p>
        )}
        {shown?.waited && <p className="note">Timed for {minEl}° elevation.</p>}
      </div>
      </div>


    </div>
  );
}
