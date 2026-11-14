import { useEffect, useId, useRef, useState } from 'react';
import { loadJson, km, useJson, useNow, useReducedMotion, utcTime, localDate } from '../lib/client';
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

function elevationWord(el: number | null, min: number): string {
  if (el === null) return '';
  if (el < 0) return 'Moon below the horizon';
  if (el < min) return `Moon ${Math.round(el)}° up, too low`;
  return `Moon ${Math.round(el)}° up`;
}

export default function LaserShot() {
  const { data: index, error } = useJson<MoonIndex>('data/moon/index.json');
  const now = useNow(1000);
  const reduced = useReducedMotion();
  const uid = useId();
  const [reflector, setReflector] = useState('a15');
  const [station, setStation] = useState('apache');
  const [touched, setTouched] = useState(false);
  const [fired, setFired] = useState<Fired | null>(null);
  const [flying, setFlying] = useState(false);
  const pulse = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

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

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

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
    cancelAnimationFrame(frame.current);
    if (reduced) {
      setFired(result);
      setFlying(false);
      return;
    }
    setFired(null);
    setFlying(true);
    const total = shot.round_trip_s * 1000;
    const start = performance.now();
    const step = (ts: number) => {
      const f = Math.min(1, (ts - start) / total);
      const leg = f < 0.5 ? f * 2 : 2 - f * 2;
      if (pulse.current) pulse.current.style.setProperty('--leg', leg.toFixed(5));
      if (f < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        setFlying(false);
        setFired(result);
      }
    };
    frame.current = requestAnimationFrame(step);
  }

  const refl = index?.reflectors.find((r) => r.id === reflector);
  const st = index?.stations.find((s) => s.id === station);
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
          <span className="ls-line" />
          <span className="ls-moon" />
          <span ref={pulse} className={`ls-pulse${flying ? ' on' : ''}`} />
        </div>
        <figcaption className="ls-labels">
          <span>Earth</span>
          <span className="ls-mid mono">{shown ? `${km.format(shown.range_km)} km` : 'About 384,400 km'}</span>
          <span>Moon</span>
        </figcaption>
        <p className="ls-scale">Earth, Moon and the gap between them are drawn to scale.</p>
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
              <span>
                {r.name}
                {!r.nasa && (
                  <>
                    <span className="sr-only">, </span>
                    <small>Soviet, not NASA</small>
                  </>
                )}
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="choices">
          <legend>Laser station</legend>
          {(index?.stations ?? []).map((s) => (
            <label className="choice" key={s.id}>
              <input type="radio" name={`${uid}-st`} checked={station === s.id} onChange={() => {
                  setTouched(true);
                  setStation(s.id);
                }} />
              <span>
                {s.name}, {s.place}
                <span className="sr-only">, </span>
                <small>{elevationWord(elNow(s.id), minEl) || '\u2007'}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <button className="btn ls-fire" type="button" onClick={fire} disabled={!loaded || flying}>
          {flying ? 'Pulse on its way…' : 'Fire the laser'}
        </button>
        {error && <p className="note">Ranging data did not load. Reload the page to try again.</p>}
      </div>
      <div className="ls-readout" aria-live="polite">
        {shown && (
          <p className="ls-big mono">
            {shown.round_trip_s.toFixed(3)}
            <span className="u">s</span>
          </p>
        )}
        <p className="ls-what">
          {shown && refl && st
            ? `Round trip from ${st.name} to the ${refl.name} mirror and back, for a pulse fired ${
                shown.waited ? `on ${localDate(shown.ms)} at ${utcTime(shown.ms)}` : `at ${utcTime(shown.ms)}`
              }.`
            : flying
              ? 'The pulse is travelling at the speed of light.'
              : 'Pick a mirror and a station, then fire.'}
        </p>
        {shown?.waited && st && (
          <p className="note">
            The Moon is below {minEl}° at {st.name} right now, so the shot is timed for the next moonrise there.
          </p>
        )}
      </div>
      </div>


    </div>
  );
}
