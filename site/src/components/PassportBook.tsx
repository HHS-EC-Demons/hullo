import { forwardRef, type CSSProperties, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BRAND, WORDMARK } from '../brand';
import { GROUPS, STAMP_OBJECTS, type StampObject } from '../data/stamps';
import { getHolder, getServerStamps, getStamps, setHolder, subscribeStamps, type Stamp } from '../lib/passport';
import { href } from '../lib/paths';
import sansFont from '@fontsource-variable/gabarito/files/gabarito-latin-wght-normal.woff2?url';
import monoFont from '@fontsource-variable/spline-sans-mono/files/spline-sans-mono-latin-wght-normal.woff2?url';
import './passport.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayText(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 9) - 4) * 0.8;
}

interface Props {
  site: string;
}

export default function PassportBook({ site }: Props) {
  const stamps = useSyncExternalStore(subscribeStamps, getStamps, getServerStamps);
  const [name, setName] = useState('');
  const [printedAt, setPrintedAt] = useState(() => Date.now());
  const sheet = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const hintId = useId();

  useEffect(() => setName(getHolder()), []);

  const byId = new Map(stamps.map((s) => [s.id, s]));
  const earned = STAMP_OBJECTS.filter((o) => byId.has(o.id));

  const print = useReactToPrint({
    contentRef: sheet,
    documentTitle: `${BRAND} passport`,
    fonts: [
      { family: 'Gabarito Variable', source: `url(${sansFont})`, weight: '400 900' },
      { family: 'Spline Sans Mono Variable', source: `url(${monoFont})`, weight: '300 700' },
    ],
    pageStyle: '@page { size: landscape; margin: 12mm; } html, body { background: #fff !important; }',
  });

  return (
    <div className="pp">
      <div className="pp-top">
        <p className="pp-count">
          <span className="pp-count-n">{earned.length}</span>
          <span className="pp-count-of"> of {STAMP_OBJECTS.length} stamped</span>
        </p>
        <form
          className="pp-print"
          onSubmit={(e) => {
            e.preventDefault();
            setPrintedAt(Date.now());
            requestAnimationFrame(() => print());
          }}
        >
          <div className="pp-field">
            <label htmlFor={nameId}>Name on the certificate</label>
            <Input
              id={nameId}
              name="certificate-name"
              spellCheck={false}
              value={name}
              maxLength={60}
              autoComplete="off"
              aria-describedby={hintId}
              onChange={(e) => {
                setName(e.target.value);
                setHolder(e.target.value);
              }}
            />
            <p id={hintId} className="pp-hint">
              Optional. Stays on this device and only appears on the printout.
            </p>
          </div>
          <Button type="submit" disabled={earned.length === 0}>
            Print certificate
          </Button>
        </form>
      </div>

      {earned.length === 0 && <p className="pp-empty">No stamps yet. Each empty slot below shows where to earn it.</p>}

      {GROUPS.map((g) => {
        const objects = STAMP_OBJECTS.filter((o) => o.group === g.key);
        if (objects.length === 0) return null;
        const got = objects.filter((o) => byId.has(o.id)).length;
        return (
          <section key={g.key} className="pp-group" aria-labelledby={`pp-${g.key}`}>
            <h2 id={`pp-${g.key}`} className="pp-group-title">
              <a href={href(objects[0].page)}>{g.title}</a>
              <span className="pp-group-count mono">
                {got} of {objects.length}
              </span>
            </h2>
            <ul className="pp-grid">
              {objects.map((o) => (
                <li key={o.id}>{byId.has(o.id) ? <StampMark object={o} stamp={byId.get(o.id) as Stamp} /> : <EmptySlot object={o} />}</li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="pp-cert-wrap" aria-hidden="true">
        <Certificate ref={sheet} name={name.trim()} earned={earned} byId={byId} printedAt={printedAt} site={site} />
      </div>
    </div>
  );
}

const GROUP_TITLE = new Map(GROUPS.map((g) => [g.key, g.title]));

function StampMark({ object, stamp }: { object: StampObject; stamp: Stamp }) {
  return (
    <article className="pp-stamp" style={{ '--tilt': `${tilt(object.id)}deg` } as CSSProperties} aria-label={`${object.name}, stamped ${dayText(stamp.at)}`}>
      <p className="pp-stamp-where mono">{GROUP_TITLE.get(object.group)}</p>
      <h3 className="pp-stamp-name">{object.name}</h3>
      {stamp.detail && <p className="pp-stamp-detail mono">{stamp.detail}</p>}
      <p className="pp-stamp-date mono">
        <time dateTime={new Date(stamp.at).toISOString()}>{dayText(stamp.at)}</time>
      </p>
    </article>
  );
}

function EmptySlot({ object }: { object: StampObject }) {
  return (
    <a className="pp-slot" href={href(object.page)}>
      <span className="pp-slot-name">{object.name}</span>
      <span className="pp-slot-hint">{object.hint}</span>
    </a>
  );
}

interface CertificateProps {
  name: string;
  earned: StampObject[];
  byId: Map<string, Stamp>;
  printedAt: number;
  site: string;
}

const Certificate = forwardRef<HTMLDivElement, CertificateProps>(function Certificate({ name, earned, byId, printedAt, site }, ref) {
  return (
    <div ref={ref} className="cert">
      <header className="cert-head">
        <p className="cert-mark" translate="no">{WORDMARK}</p>
        <p className="cert-date">Printed {dayText(printedAt)}</p>
      </header>
      <p className="cert-title">
        {name ? `${name} reached ${earned.length} of the ${STAMP_OBJECTS.length} objects on ${BRAND}` : `Reached ${earned.length} of the ${STAMP_OBJECTS.length} objects on ${BRAND}`}
      </p>
      <p className="cert-line">Each stamp holds a real figure from the moment the object was reached, worked out from NASA data.</p>
      <ul className="cert-grid">
        {earned.map((o) => {
          const s = byId.get(o.id) as Stamp;
          return (
            <li key={o.id} className="cert-stamp" style={{ transform: `rotate(${tilt(o.id) * 0.6}deg)` }}>
              <p className="cert-stamp-name">{o.name}</p>
              {s.detail && <p className="cert-stamp-detail">{s.detail}</p>}
              <p className="cert-stamp-date">{dayText(s.at)}</p>
            </li>
          );
        })}
      </ul>
      <footer className="cert-foot">
        <p>{site}</p>
        <p>Made for the NASA Space Apps Challenge 2026. Not endorsed by NASA.</p>
      </footer>
    </div>
  );
});
