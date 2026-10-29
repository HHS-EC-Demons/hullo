import { useEffect, useId, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { asset } from '../lib/paths';
import { useJson, useReducedMotion, utcDate } from '../lib/client';
import './ingenuity.css';

interface Flight {
  n: number;
  sol: number;
  date: string;
  from: string;
  to: string;
  dist_m: number;
  total_m: number;
  max_alt_m: number;
  max_speed_m_s: number | null;
  duration_s: number;
  total_s: number;
  end: [number, number];
  path: [number, number][];
}

interface Ingenuity {
  bbox: [number, number, number, number];
  zooms: [number, number];
  start: { lat: number; lon: number; name: string; sol: number; date: string };
  flights: Flight[];
  totals: { flights: number; distance_m: number; air_time_s: number };
}

const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function css(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function IngenuityMap() {
  const { data, error } = useJson<Ingenuity>('data/ingenuity.json');
  const reduced = useReducedMotion();
  const uid = useId();
  const [n, setN] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ past: L.LayerGroup; now: L.LayerGroup } | null>(null);

  useEffect(() => {
    if (!data || !box.current || map.current) return;
    const [w, s, e, nth] = data.bbox;
    const bounds = L.latLngBounds([s, w], [nth, e]);
    const m = L.map(box.current, {
      attributionControl: false,
      zoomControl: true,
      scrollWheelZoom: false,
      minZoom: data.zooms[0],
      maxZoom: 17,
      maxBounds: bounds.pad(0.15),
      maxBoundsViscosity: 1,
      keyboard: true,
    });
    L.tileLayer(asset('tiles/jezero/{z}/{x}/{y}.jpg'), {
      minZoom: data.zooms[0],
      maxNativeZoom: data.zooms[1],
      maxZoom: 17,
      bounds,
      tileSize: 256,
    }).addTo(m);
    m.fitBounds(bounds);
    const past = L.layerGroup().addTo(m);
    const now = L.layerGroup().addTo(m);
    layers.current = { past, now };
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [data]);

  useEffect(() => {
    const m = map.current;
    const lg = layers.current;
    if (!data || !m || !lg) return;
    const flight = data.flights[n - 1];
    const ink = css('--ink') || '#17181b';
    const paper = '#f2f0e9';
    const signal = '#4cc994';
    lg.past.clearLayers();
    lg.now.clearLayers();
    for (const f of data.flights.slice(0, n - 1)) {
      if (f.path.length > 1) L.polyline(f.path, { color: paper, weight: 1.5, opacity: 0.75, interactive: false }).addTo(lg.past);
    }
    L.circleMarker([data.start.lat, data.start.lon], { radius: 4, color: ink, weight: 2, fillColor: paper, fillOpacity: 1, interactive: false }).addTo(lg.past);
    if (flight.path.length > 1) {
      L.polyline(flight.path, { color: '#121315', weight: 6, opacity: 0.85, interactive: false }).addTo(lg.now);
      L.polyline(flight.path, { color: signal, weight: 3, opacity: 1, interactive: false }).addTo(lg.now);
    }
    L.circleMarker(flight.end, { radius: 6, color: '#121315', weight: 2, fillColor: signal, fillOpacity: 1, interactive: false }).addTo(lg.now);
    const pts = flight.path.length > 1 ? flight.path : [flight.end];
    const b = L.latLngBounds(pts);
    m.flyToBounds(b, { padding: [48, 48], maxZoom: 17, animate: !reduced, duration: 0.6 });
  }, [data, n, reduced]);

  const flight = data?.flights[n - 1];
  const count = data?.flights.length ?? 72;

  return (
    <div className="ig">
      <div className="ig-read" aria-live="polite">
        <p className="ig-flight">
          <span className="ig-label">Flight</span>
          <span className="ig-n mono">{flight ? flight.n : '\u2007'}</span>
          <span className="ig-of">of {count}</span>
        </p>
        <p className="ig-when">
          {flight ? (
            <>
              <span className="mono">{utcDate(Date.parse(`${flight.date}T12:00:00Z`))}</span>, sol{' '}
              <span className="mono">{flight.sol}</span>. Landed at {flight.to}.
            </>
          ) : (
            '\u2007'
          )}
        </p>
        <dl className="ig-stats">
          <div>
            <dt>Distance</dt>
            <dd className="mono">{flight ? `${one.format(flight.dist_m)} m` : '\u2007'}</dd>
          </div>
          <div>
            <dt>Highest</dt>
            <dd className="mono">{flight ? `${num.format(flight.max_alt_m)} m` : '\u2007'}</dd>
          </div>
          <div>
            <dt>In the air</dt>
            <dd className="mono">{flight ? `${one.format(flight.duration_s)} s` : '\u2007'}</dd>
          </div>
          <div>
            <dt>Top speed</dt>
            <dd className="mono">
              {flight ? (flight.max_speed_m_s !== null ? `${one.format(flight.max_speed_m_s)} m/s` : 'not listed') : '\u2007'}
            </dd>
          </div>
          <div>
            <dt>All flights so far</dt>
            <dd className="mono">
              {flight ? (flight.total_m < 1000 ? `${one.format(flight.total_m)} m` : `${one.format(flight.total_m / 1000)} km`) : '\u2007'}
            </dd>
          </div>
        </dl>
      </div>


      <div className="ig-control">
        <label htmlFor={`${uid}-flight`}>Flight</label>
        <input
          id={`${uid}-flight`}
          type="range"
          min={1}
          max={count}
          step={1}
          value={n}
          disabled={!data}
          aria-valuetext={flight ? `Flight ${flight.n}, ${utcDate(Date.parse(`${flight.date}T12:00:00Z`))}` : undefined}
          onChange={(e) => setN(Number(e.target.value))}
        />
        <div className="ig-steps">
          <button type="button" className="btn btn-quiet" onClick={() => setN((v) => Math.max(1, v - 1))} disabled={!data || n <= 1}>
            Previous flight
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setN((v) => Math.min(count, v + 1))} disabled={!data || n >= count}>
            Next flight
          </button>
        </div>
      </div>
      <div className="ig-map" ref={box} role="region" aria-label="Map of Jezero crater with Ingenuity’s flight paths" />
      {error && <p className="note">Flight data did not load. Reload the page to try again.</p>}
    </div>
  );
}
