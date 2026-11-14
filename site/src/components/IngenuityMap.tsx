import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { stamp } from '../lib/passport';
import { asset } from '../lib/paths';
import { useJson, useReducedMotion, utcDate } from '../lib/client';
import type { Pic } from '../lib/photos';
import './ingenuity.css';

interface Flight {
  n: number;
  sol: number;
  date: string;
  from: string;
  to: string;
  hover: boolean;
  dist_m: number;
  total_m: number;
  max_alt_m: number;
  max_speed_m_s: number;
  duration_s: number;
  end: [number, number];
  path: [number, number][];
}

interface Ingenuity {
  bbox: [number, number, number, number];
  zooms: [number, number];
  deep_zooms: [number, number];
  start: { lat: number; lon: number; name: string };
  flights: Flight[];
  totals: { flights: number; hovers: number[] };
}

export interface FlightPhoto {
  n: number;
  pic: Pic;
  alt: string;
  caption: string;
}

const num = { format: (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') };
const one = { format: (v: number) => v.toFixed(1) };
const speed = { format: (v: number) => String(Number(v.toFixed(2))) };

function css(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function line(coords: [number, number][]) {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords.map(([la, lo]) => [lo, la]) } };
}

function point(at: [number, number]) {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [at[1], at[0]] } };
}

function collection(features: ReturnType<typeof line | typeof point>[]) {
  return { type: 'FeatureCollection' as const, features };
}

function total(m: number): string {
  return m < 1000 ? `${num.format(m)} m` : `${one.format(m / 1000)} km`;
}

function where(f: Flight): string {
  if (f.hover) return `Rose straight up and landed again at ${f.to}.`;
  if (f.dist_m === 0) return `Ended with an unplanned early landing at ${f.to}.`;
  return `Landed at ${f.to}.`;
}

let protocolReady = false;

export default function IngenuityMap({ photos }: { photos: FlightPhoto[] }) {
  const { data, error } = useJson<Ingenuity>('data/ingenuity.json');
  const reduced = useReducedMotion();
  const [n, setN] = useState(1);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [near, setNear] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!data || !near || !box.current || map.current) return;
    let live = true;
    let instance: MapLibreMap | null = null;
    (async () => {
      const [lib, worker, deep, sheet] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
        fetch(asset('tiles/jezero/deep.json')).then((r) => (r.ok ? r.json() : {})) as Promise<Record<string, string[]>>,
        import('maplibre-gl/dist/maplibre-gl.css?url'),
      ]);
      if (!live || !box.current) return;
      if (!document.querySelector('link[data-maplibre]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.default;
        link.dataset.maplibre = '';
        const loaded = new Promise<void>((done) => {
          link.onload = () => done();
          link.onerror = () => done();
        });
        document.head.append(link);
        await loaded;
        if (!live || !box.current) return;
      }
      const maplibregl = lib;
      maplibregl.setWorkerUrl(new URL(worker.default, location.href).href);
      const have = new Set(Object.entries(deep).flatMap(([z, tiles]) => tiles.map((t) => `${z}/${t}`)));
      const root = `${location.origin}${asset('tiles/jezero/')}`;
      if (!protocolReady) {
        maplibregl.addProtocol('jezero', async (params, abort) => {
          const key = params.url.replace('jezero://', '');
          if (!have.has(key)) return { data: new ArrayBuffer(0) };
          const res = await fetch(`${root}${key}.webp`, { signal: abort.signal });
          if (!res.ok) return { data: new ArrayBuffer(0) };
          return { data: await res.arrayBuffer() };
        });
        protocolReady = true;
      }
      const [w, s, e, nth] = data.bbox;
      const bounds: LngLatBoundsLike = [[w, s], [e, nth]];
      const lilac = css('--lilac', '#b6a6ff');
      const laser = css('--laser', '#3df58c');
      const violet = css('--violet', '#0d0a18');
      const text = css('--ink-text', '#eeeaf9');
      const style: StyleSpecification = {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: [`${root}{z}/{x}/{y}.jpg`], tileSize: 256, minzoom: data.zooms[0], maxzoom: data.zooms[1], bounds: data.bbox },
          deep: { type: 'raster', tiles: ['jezero://{z}/{x}/{y}'], tileSize: 256, minzoom: data.deep_zooms[0], maxzoom: data.deep_zooms[1], bounds: data.bbox },
          past: { type: 'geojson', data: collection([]) },
          now: { type: 'geojson', data: collection([]) },
          stop: { type: 'geojson', data: collection([]) },
          start: { type: 'geojson', data: collection([point([data.start.lat, data.start.lon])]) },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': css('--violet-raised', '#151026') } },
          { id: 'base', type: 'raster', source: 'base', paint: { 'raster-fade-duration': 150 } },
          { id: 'deep', type: 'raster', source: 'deep', minzoom: 15.5, paint: { 'raster-fade-duration': 150 } },
          { id: 'past', type: 'line', source: 'past', paint: { 'line-color': lilac, 'line-width': 1.5, 'line-opacity': 0.9 } },
          { id: 'now-casing', type: 'line', source: 'now', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': violet, 'line-width': 6, 'line-opacity': 0.85 } },
          { id: 'now', type: 'line', source: 'now', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': laser, 'line-width': 3 } },
          { id: 'start', type: 'circle', source: 'start', paint: { 'circle-radius': 4, 'circle-color': text, 'circle-stroke-color': violet, 'circle-stroke-width': 2 } },
          { id: 'stop', type: 'circle', source: 'stop', paint: { 'circle-radius': 6, 'circle-color': laser, 'circle-stroke-color': violet, 'circle-stroke-width': 2 } },
        ],
      };
      const made = new maplibregl.Map({
        container: box.current,
        style,
        bounds,
        fitBoundsOptions: { padding: 24 },
        maxBounds: [[w - 0.03, s - 0.02], [e + 0.03, nth + 0.02]],
        minZoom: 11,
        maxZoom: 18.5,
        attributionControl: false,
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'Hold Ctrl and scroll, or pinch, to zoom the map',
          'CooperativeGesturesHandler.MacHelpText': 'Pinch, or hold ⌘ and scroll, to zoom the map',
          'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move or zoom the map',
          'NavigationControl.ZoomIn': 'Zoom in',
          'NavigationControl.ZoomOut': 'Zoom out',
        },
      });
      instance = made;
      made.touchZoomRotate.disableRotation();
      made.keyboard.disableRotation();
      made.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      made.getCanvas().setAttribute('aria-label', 'Map of Jezero crater with Ingenuity’s flight paths. Arrow keys move it, plus and minus zoom.');
      made.on('load', () => {
        if (!live) return;
        map.current = made;
        setMapReady(true);
      });
      made.on('error', () => undefined);
    })().catch(() => live && setMapFailed(true));
    return () => {
      live = false;
      instance?.remove();
      map.current = null;
      setMapReady(false);
    };
  }, [data, near]);

  useEffect(() => {
    const m = map.current;
    if (!data || !m || !mapReady) return;
    const flight = data.flights[n - 1];
    const past = data.flights.slice(0, n - 1).filter((f) => f.path.length > 1).map((f) => line(f.path));
    (m.getSource('past') as GeoJSONSource).setData(collection(past));
    (m.getSource('now') as GeoJSONSource).setData(collection(flight.path.length > 1 ? [line(flight.path)] : []));
    (m.getSource('stop') as GeoJSONSource).setData(collection([point(flight.end)]));
    const animate = !reduced && !first.current;
    first.current = false;
    if (flight.path.length > 1) {
      const lons = flight.path.map((p) => p[1]);
      const lats = flight.path.map((p) => p[0]);
      m.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], {
        padding: 56,
        maxZoom: 17,
        duration: animate ? 1100 : 0,
        essential: false,
      });
    } else {
      m.easeTo({ center: [flight.end[1], flight.end[0]], zoom: 17, duration: animate ? 1100 : 0, essential: false });
    }
  }, [data, n, mapReady, reduced]);

  function pick(next: number) {
    if (!data) return;
    const v = Math.min(data.flights.length, Math.max(1, next));
    setN(v);
    const f = data.flights[v - 1];
    stamp('ingenuity', f.hover ? `Flight ${f.n}, a hover at ${num.format(f.max_alt_m)} m for ${one.format(f.duration_s)} s` : `Flight ${f.n}, ${num.format(f.dist_m)} m in ${num.format(f.duration_s)} s`);
  }

  const flight = data?.flights[n - 1];
  const count = data?.flights.length ?? 72;
  const shot = photos.find((p) => p.n === n);
  const blank = ' ';

  return (
    <div className="ig">
      <div className="ig-read" aria-live="polite">
        <p className="ig-flight">
          <span className="ig-label">Flight</span>
          <span className="ig-n mono">{flight ? flight.n : blank}</span>
          <span className="ig-of">of {count}</span>
        </p>
        <p className="ig-when">
          {flight ? (
            <>
              <span className="mono">{utcDate(Date.parse(`${flight.date}T12:00:00Z`))}</span>, sol <span className="mono">{flight.sol}</span>.{' '}
              {where(flight)}
            </>
          ) : (
            blank
          )}
        </p>
        <dl className="ig-stats">
          <div>
            <dt>Distance</dt>
            <dd className="mono">{flight ? (flight.hover ? <span className="ig-hover">Hover</span> : `${num.format(flight.dist_m)} m`) : blank}</dd>
          </div>
          <div>
            <dt>Highest</dt>
            <dd className="mono">{flight ? `${num.format(flight.max_alt_m)} m` : blank}</dd>
          </div>
          <div>
            <dt>In the air</dt>
            <dd className="mono">{flight ? `${one.format(flight.duration_s)} s` : blank}</dd>
          </div>
          <div>
            <dt>Top speed</dt>
            <dd className="mono">{flight ? `${speed.format(flight.max_speed_m_s)} m/s` : blank}</dd>
          </div>
          <div>
            <dt>All flights so far</dt>
            <dd className="mono">{flight ? total(flight.total_m) : blank}</dd>
          </div>
        </dl>
      </div>

      <div className="ig-control">
        <span className="ig-control-label" aria-hidden="true">
          Flight
        </span>
        <Slider
          thumbLabel="Flight"
          thumbValueText={(v) => (data?.flights[v - 1] ? `Flight ${v}, ${utcDate(Date.parse(`${data.flights[v - 1].date}T12:00:00Z`))}` : `Flight ${v}`)}
          min={1}
          max={count}
          step={1}
          value={[n]}
          disabled={!data}
          onValueChange={([v]) => pick(v)}
        />
        <div className="ig-steps">
          <Button type="button" variant="quiet" onClick={() => pick(n - 1)} disabled={!data || n <= 1}>
            Previous flight
          </Button>
          <Button type="button" variant="quiet" onClick={() => pick(n + 1)} disabled={!data || n >= count}>
            Next flight
          </Button>
        </div>
      </div>

      <div className="ig-stage">
        <div className="ig-mapwrap">
          <div className="ig-map" ref={box} role="region" aria-label="Map of Jezero crater" />
          <p className="ig-hint">Pinch to zoom. With a mouse, hold Ctrl or ⌘ and scroll. On a phone, drag the map with two fingers.</p>
        </div>
        <aside className="ig-photo" aria-label="Photos from Ingenuity’s own cameras">
          <div className="ig-frame" style={{ aspectRatio: shot ? `${shot.pic.width} / ${shot.pic.height}` : '4 / 3' }}>
            {shot ? (
              <picture key={shot.n}>
                <source type="image/avif" srcSet={shot.pic.avif} sizes={shot.pic.sizes} />
                <source type="image/webp" srcSet={shot.pic.webp} sizes={shot.pic.sizes} />
                <img src={shot.pic.src} width={shot.pic.width} height={shot.pic.height} alt={shot.alt} loading="lazy" decoding="async" />
              </picture>
            ) : (
              <p className="ig-nophoto">No photo from flight {n} here. Pick a flight below to see what Ingenuity’s cameras saw.</p>
            )}
          </div>
          <p className="credit ig-caption">{shot ? shot.caption : blank}</p>
          <div className="ig-picks" role="group" aria-label="Flights with a photo">
            {photos.map((p) => (
              <Button key={p.n} type="button" size="sm" variant={p.n === n ? 'line' : 'ghost'} aria-pressed={p.n === n} aria-label={`Flight ${p.n}`} onClick={() => pick(p.n)} className="mono">
                {p.n}
              </Button>
            ))}
          </div>
        </aside>
      </div>
      {(error || mapFailed) && <p className="note">The map did not load. Reload the page to try again.</p>}
    </div>
  );
}
