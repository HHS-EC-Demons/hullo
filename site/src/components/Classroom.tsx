import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { C_KM_S, dailyHours, hmsText, lightTimeAt, type DeepSpaceData } from '../lib/lighttime';
import { monthKey, nextMonthKey, nextWindow, shotAt, type MoonIndex, type MoonMonth } from '../lib/ranging';
import { FlightSheet, MoonSheet, VoyagerSheet, int, one, six, type Flight, type MoonShot } from './Worksheets';
import { loadJson, useJson } from '../lib/client';
import { calDate, localStamp, monthYear, MONTHS } from '../lib/dates';
import type { Point } from './ClassCharts';
import sansFont from '@fontsource-variable/gabarito/files/gabarito-latin-wght-normal.woff2?url';
import monoFont from '@fontsource-variable/spline-sans-mono/files/spline-sans-mono-latin-wght-normal.woff2?url';
import './classroom.css';

const SeriesChart = lazy(() => import('./ClassCharts').then((m) => ({ default: m.SeriesChart })));
const FlightChart = lazy(() => import('./ClassCharts').then((m) => ({ default: m.FlightChart })));


const STATION = 'apache';
const REFLECTOR = 'a15';
const MIN_ELEVATION = 20;

interface Ingenuity {
  flights: Flight[];
}

export interface TopicPhoto {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  sizes: string;
  alt: string;
  caption: string;
  when: string;
  nasaId: string;
  credit: string;
  page: string;
  fit?: 'cover' | 'contain';
}

interface Props {
  photos: { moon: TopicPhoto | null; voyager: TopicPhoto | null; flight: TopicPhoto | null };
  title: string;
  line: string;
}

interface MoonState extends MoonShot {
  points: Point[];
}

const PRINT_FONTS = [
  { family: 'Gabarito Variable', source: `url(${sansFont})`, weight: '400 900' },
  { family: 'Spline Sans Mono Variable', source: `url(${monoFont})`, weight: '300 700' },
];

function usePrint(title: string) {
  const ref = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({
    contentRef: ref,
    documentTitle: title,
    fonts: PRINT_FONTS,
    pageStyle: '@page { size: portrait; margin: 16mm 16mm 14mm; } html, body { background: #fff !important; }',
  });
  return { ref, print };
}

function useMoonShot(at: number): MoonState | null {
  const [state, setState] = useState<MoonState | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const index = await loadJson<MoonIndex>('data/moon/index.json');
      const keys = [monthKey(at), nextMonthKey(monthKey(at))].filter((k) => index.months.includes(k));
      const months = await Promise.all(keys.map((k) => loadJson<MoonMonth>(`data/moon/${k}.json`)));
      const when = nextWindow(months, STATION, at, MIN_ELEVATION);
      if (when === null) return;
      const month = months.find((m) => monthKey(Date.parse(m.start_utc)) === monthKey(when)) ?? months[0];
      const shot = shotAt(month, STATION, REFLECTOR, when);
      if (!shot || !live) return;
      const t0 = Date.parse(month.start_utc);
      const step = month.step_s * 1000;
      const r = month.stations[STATION]?.refl[REFLECTOR]?.r_m ?? [];
      setState({
        points: r.map((m, i) => ({ x: t0 + i * step, y: (2 * m) / 1000 / C_KM_S })),
        shot,
        stationName: index.stations.find((s) => s.id === STATION)?.name ?? STATION,
        reflectorName: index.reflectors.find((r) => r.id === REFLECTOR)?.name ?? REFLECTOR,
      });
    })().catch(() => null);
    return () => {
      live = false;
    };
  }, [at]);
  return state;
}

function dayTick(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function weekTicks(lo: number, hi: number, width: number): number[] {
  const first = new Date(lo);
  const every = width < 360 ? 14 : 7;
  const out: number[] = [];
  for (let i = 0; ; i += every) {
    const t = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1 + i).getTime();
    if (t > hi) break;
    out.push(t);
  }
  return out;
}

function quarterTicks(lo: number, hi: number, width: number): number[] {
  const every = width < 420 ? 12 : width < 640 ? 6 : 3;
  const a = new Date(lo);
  const out: number[] = [];
  for (let m = a.getUTCMonth(); ; m += every) {
    const t = Date.UTC(a.getUTCFullYear(), m, 1);
    if (t > hi) break;
    if (t >= lo) out.push(t);
  }
  return out;
}

export default function Classroom({ photos, title, line }: Props) {
  const [at, setAt] = useState(() => Date.now());
  useEffect(() => setAt(Date.now()), []);
  const deep = useJson<DeepSpaceData>('data/deep-space.json').data;
  const ingenuity = useJson<Ingenuity>('data/ingenuity.json').data;
  const moon = useMoonShot(at);

  const flights = useMemo(() => (ingenuity?.flights ?? []).filter((f) => (f.dist_m ?? 0) > 0 && (f.duration_s ?? 0) > 0), [ingenuity]);
  const [flightN, setFlightN] = useState(9);
  const flight = flights.find((f) => f.n === flightN) ?? flights[0] ?? null;

  const voyagerS = deep ? lightTimeAt(deep, 'voyager1', at) : null;
  const voyagerPoints = useMemo(() => (deep ? dailyHours(deep, 'voyager1').map((d) => ({ x: d.ms, y: d.hours })) : []), [deep]);

  const moonSheet = usePrint('Moon distance worksheet');
  const voyagerSheet = usePrint('Voyager 1 distance worksheet');
  const flightSheet = usePrint('Ingenuity speed worksheet');

  function printNow(print: () => void) {
    setAt(Date.now());
    window.setTimeout(() => print(), 400);
  }

  return (
    <div className="cr">
      <Activity
        title="Moon distance"
        photo={photos.moon}
        head={
          <header className="page-head cr-head">
            <h1>{title}</h1>
            <p>{line}</p>
          </header>
        }
        facts={moon ? [['Round trip', `${six.format(moon.shot.round_trip_s)} s`]] : null}
        rows={['Round trip']}
        after={<MoonCheck km={moon ? (moon.shot.round_trip_s / 2) * C_KM_S : null} />}
        onPrint={() => printNow(moonSheet.print)}
        chart={
          moon && (
            <SeriesChart
              points={moon.points}
              marker={{ x: moon.shot.ms, y: moon.shot.round_trip_s }}
              label={`Laser round trip from ${moon.stationName} to the ${moon.reflectorName} reflector, hour by hour`}
              xTitle="date"
              yTitle="round trip, s"
              tickX={dayTick}
              tickY={(v) => v.toFixed(2)}
              readX={(v) => localStamp(v, { label: false })}
              readY={(v) => `${six.format(v)} s`}
              xTickValues={weekTicks}
            />
          )
        }
      />
      <Activity
        title="Voyager 1 distance"
        photo={photos.voyager}
        facts={voyagerS !== null ? [['Light time', hmsText(voyagerS)]] : null}
        rows={['Light time']}
        onPrint={() => printNow(voyagerSheet.print)}
        chart={
          voyagerPoints.length > 1 && voyagerS !== null && (
            <SeriesChart
              points={voyagerPoints}
              marker={{ x: at, y: voyagerS / 3600 }}
              refY={{ y: 24, label: '1 light day' }}
              label="Voyager 1 light time, day by day"
              xTitle="date"
              yTitle="light time, h"
              tickX={(v) => monthYear(v)}
              tickY={(v) => v.toFixed(1)}
              readX={(v) => calDate(v)}
              readY={(v) => hmsText(v * 3600)}
              xTickValues={quarterTicks}
            />
          )
        }
      />
      <Activity
        title="Ingenuity speed"
        photo={photos.flight}
        chart={
          flights.length > 0 && (
            <FlightChart
              flights={flights}
              picked={flight?.n ?? flightN}
              onPick={setFlightN}
              readDist={(m) => `${int.format(m)} m`}
              readTime={(t) => `${one.format(t)} s`}
            />
          )
        }
        facts={
          flight
            ? [
                ['Distance', `${int.format(flight.dist_m as number)} m`],
                ['Time', `${one.format(flight.duration_s as number)} s`],
              ]
            : null
        }
        rows={['Distance', 'Time']}
        onPrint={() => printNow(flightSheet.print)}
      >
        <FlightPicker flights={flights} value={flight?.n ?? flightN} onChange={setFlightN} />
      </Activity>

      <div className="cr-sheets" aria-hidden="true">
        {moon && <MoonSheet ref={moonSheet.ref} m={moon} printedAt={at} />}
        {voyagerS !== null && <VoyagerSheet ref={voyagerSheet.ref} seconds={voyagerS} printedAt={at} />}
        {flight && <FlightSheet ref={flightSheet.ref} f={flight} printedAt={at} />}
      </div>
    </div>
  );
}

function MoonCheck({ km }: { km: number | null }) {
  const id = useId();
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ off: number } | null>(null);
  const guess = Number(text.replace(/[\s,]/g, ''));
  return (
    <form
      className="cr-check"
      onSubmit={(e) => {
        e.preventDefault();
        if (km === null || !Number.isFinite(guess) || text.trim() === '') return;
        setResult({ off: guess - Math.round(km) });
      }}
    >
      <label htmlFor={id}>Answer in km</label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setResult(null);
        }}
        className="cr-check-input mono"
      />
      <Button type="submit" variant="secondary" disabled={km === null}>
        Check
      </Button>
      <p className="cr-check-out" aria-live="polite">
        {result &&
          (Math.abs(result.off) <= 1000 ? (
            'Correct'
          ) : (
            <>
              <span className="mono">{int.format(Math.abs(result.off))} km</span> {result.off > 0 ? 'high' : 'low'}
            </>
          ))}
      </p>
    </form>
  );
}

function Activity({ title, photo, head, facts, rows, chart, after, onPrint, children }: { title: string; photo: TopicPhoto | null; head?: ReactNode; facts: [string, string][] | null; rows: string[]; chart: ReactNode; after?: ReactNode; onPrint: () => void; children?: ReactNode }) {
  const id = useId();
  const first = head !== undefined;
  return (
    <section className={first ? 'cr-activity first' : 'cr-activity'} aria-labelledby={id}>
      {head}
      {photo && (
        <figure className="cr-photo">
          <picture>
            <source type="image/avif" srcSet={photo.avif} sizes={photo.sizes} />
            <source type="image/webp" srcSet={photo.webp} sizes={photo.sizes} />
            <img
              src={photo.src}
              width={photo.width}
              height={photo.height}
              alt={`${photo.caption}, ${photo.when}.`}
              className={photo.fit === 'contain' ? 'contain' : undefined}
              loading={first ? 'eager' : 'lazy'}
              fetchPriority={first ? 'high' : 'auto'}
              decoding="async"
            />
          </picture>
        </figure>
      )}
      <div className="cr-body">
        <h2 id={id}>{title}</h2>
        {children}
        <dl className="cr-facts">
          {(facts ?? rows.map((k): [string, string] => [k, '…'])).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="mono">{v}</dd>
            </div>
          ))}
        </dl>
        {after}
        <div className="cr-chart">
          <Suspense fallback={null}>{chart}</Suspense>
        </div>
        <div className="cr-print">
          <Button variant="primary" onClick={onPrint} disabled={!facts}>
            Print sheet
          </Button>
        </div>
      </div>
    </section>
  );
}

function FlightPicker({ flights, value, onChange }: { flights: Flight[]; value: number; onChange: (n: number) => void }) {
  const index = Math.max(0, flights.findIndex((f) => f.n === value));
  return (
    <div className="cr-pick">
      <p className="cr-pick-label" aria-hidden="true">
        Flight <span className="mono">{value}</span>
      </p>
      <Slider
        thumbLabel="Flight"
        thumbValueText={(i) => `Flight ${flights[i]?.n ?? value}`}
        min={0}
        max={Math.max(flights.length - 1, 1)}
        step={1}
        value={[index]}
        disabled={flights.length === 0}
        onValueChange={([i]) => flights[i] && onChange(flights[i].n)}
      />
    </div>
  );
}

