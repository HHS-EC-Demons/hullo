import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { hmsText, lightTimeAt, type DeepSpaceData } from '../lib/lighttime';
import { monthKey, nextMonthKey, nextWindow, shotAt, type MoonIndex, type MoonMonth } from '../lib/ranging';
import { FlightSheet, MoonSheet, VoyagerSheet, dayFmt, int, one, six, atText, type Flight, type MoonShot } from './Worksheets';
import { loadJson, useJson } from '../lib/client';
import sansFont from '@fontsource-variable/gabarito/files/gabarito-latin-wght-normal.woff2?url';
import monoFont from '@fontsource-variable/spline-sans-mono/files/spline-sans-mono-latin-wght-normal.woff2?url';
import './classroom.css';

const STATION = 'apache';
const REFLECTOR = 'a15';
const MIN_ELEVATION = 20;

interface Ingenuity {
  flights: Flight[];
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

function useMoonShot(at: number): MoonShot | null {
  const [state, setState] = useState<MoonShot | null>(null);
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
      setState({
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

export default function Classroom() {
  const [at, setAt] = useState(() => Date.now());
  useEffect(() => setAt(Date.now()), []);
  const deep = useJson<DeepSpaceData>('data/deep-space.json').data;
  const ingenuity = useJson<Ingenuity>('data/ingenuity.json').data;
  const moon = useMoonShot(at);

  const flights = useMemo(() => (ingenuity?.flights ?? []).filter((f) => (f.dist_m ?? 0) > 0 && (f.duration_s ?? 0) > 0), [ingenuity]);
  const [flightN, setFlightN] = useState(9);
  const flight = flights.find((f) => f.n === flightN) ?? flights[0] ?? null;

  const voyagerS = deep ? lightTimeAt(deep, 'voyager1', at) : null;

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
        title="How far away is the Moon?"
        line="Work out the distance to a mirror on the Moon from the time a laser pulse takes to come back."
        facts={
          moon
            ? [
                ['Laser shot', atText(moon.shot.ms), true],
                ['From', `${moon.stationName}, New Mexico`, false],
                ['Aimed at', `The ${moon.reflectorName} reflector`, false],
                ['Round trip', `${six.format(moon.shot.round_trip_s)} s`, true],
              ]
            : null
        }
        rows={['Laser shot', 'From', 'Aimed at', 'Round trip']}
        onPrint={() => printNow(moonSheet.print)}
      />
      <Activity
        title="How far away is Voyager 1?"
        line="Turn the time light takes to cross from Voyager 1 to Earth into kilometres and astronomical units."
        facts={voyagerS !== null ? [['Light time', hmsText(voyagerS), true], ['At', atText(at), true]] : null}
        rows={['Light time', 'At']}
        onPrint={() => printNow(voyagerSheet.print)}
      />
      <Activity
        title="How fast did Ingenuity fly?"
        line="Pick one of the helicopter’s flights on Mars and work out its average speed."
        facts={
          flight
            ? [
                ['Flown on', dayFmt.format(Date.parse(`${flight.date}T12:00:00Z`)), true],
                ['Distance', `${int.format(flight.dist_m as number)} m`, true],
                ['Time in the air', `${one.format(flight.duration_s as number)} s`, true],
              ]
            : null
        }
        rows={['Flown on', 'Distance', 'Time in the air']}
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

function Activity({ title, line, facts, rows, onPrint, children }: { title: string; line: string; facts: [string, string, boolean][] | null; rows: string[]; onPrint: () => void; children?: ReactNode }) {
  const id = useId();
  return (
    <section className="cr-activity" aria-labelledby={id}>
      <div className="cr-head">
        <h2 id={id}>{title}</h2>
        <p>{line}</p>
      </div>
      <div className="cr-body">
        {children}
        <dl className="cr-facts">
          {(facts ?? rows.map((k): [string, string, boolean] => [k, 'Loading…', false])).map(([k, v, mono]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={mono ? 'mono' : undefined}>{v}</dd>
            </div>
          ))}
        </dl>
        <Button variant="quiet" onClick={onPrint} disabled={!facts}>
          Print worksheet and answers
        </Button>
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

