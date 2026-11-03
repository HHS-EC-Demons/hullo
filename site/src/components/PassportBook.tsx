import { forwardRef, lazy, Suspense, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BRAND, WORDMARK } from '../brand';
import { GROUPS, STAMP_OBJECTS, type StampObject } from '../data/stamps';
import { getHolder, getServerStamps, getStamps, setHolder, subscribeStamps, type Stamp } from '../lib/passport';
import { href } from '../lib/paths';
import sansFont from '@fontsource-variable/gabarito/files/gabarito-latin-wght-normal.woff2?url';
import monoFont from '@fontsource-variable/spline-sans-mono/files/spline-sans-mono-latin-wght-normal.woff2?url';
import { localCalDate } from '../lib/local-date';
import './passport.css';

const PassportChart = lazy(() => import('./PassportChart'));
const VoyagerSince = lazy(() => import('./VoyagerSince'));

const dayText = localCalDate;

function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ((h % 9) - 4) * 0.8;
}

export interface Thumb {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  sizes: string;
  alt: string;
  nasaId: string;
  credit: string;
  page: string;
  when: string;
}

interface Props {
  site: string;
  thumbs: Record<string, Thumb>;
  title: string;
  line: string;
}

export default function PassportBook({ site, thumbs, title, line }: Props) {
  const stamps = useSyncExternalStore(subscribeStamps, getStamps, getServerStamps);
  const [name, setName] = useState('');
  const [printedAt, setPrintedAt] = useState(() => Date.now());
  const [live, setLive] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const nameId = useId();

  useEffect(() => {
    setName(getHolder());
    setLive(true);
  }, []);

  const [openedAt] = useState(() => Date.now());
  const byId = new Map(stamps.map((s) => [s.id, s]));
  const firstAt = stamps.length ? Math.min(...stamps.map((s) => s.at)) : null;
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
      <header className="page-head pp-head">
        <div className="pp-title">
          <h1>{title}</h1>
          <p>{line}</p>
        </div>
        <p className="pp-count">
          <span className="pp-count-n">{earned.length}</span>
          <span className="pp-count-of"> of {STAMP_OBJECTS.length} stamped</span>
        </p>
        <div className="pp-since-wrap">
          {live && (
            <Suspense fallback={null}>
              <VoyagerSince fromMs={firstAt ?? openedAt} stamped={firstAt !== null} />
            </Suspense>
          )}
        </div>
        <form
          className="pp-print"
          onSubmit={(e) => {
            e.preventDefault();
            setPrintedAt(Date.now());
            requestAnimationFrame(() => print());
          }}
        >
          <div className="pp-field">
            <label htmlFor={nameId}>Certificate name</label>
            <Input
              id={nameId}
              name="certificate-name"
              spellCheck={false}
              value={name}
              maxLength={60}
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value);
                setHolder(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={earned.length === 0}>
            Print certificate
          </Button>
        </form>
        <section className="pp-chart" aria-labelledby="pp-chart-title">
          <h2 id="pp-chart-title" className="pp-chart-title">
            Stamps by page
          </h2>
          <div className="pp-chart-frame">
            {live && (
              <Suspense fallback={null}>
                <PassportChart byId={byId} dayText={dayText} />
              </Suspense>
            )}
          </div>
        </section>
      </header>

      {GROUPS.map((g) => {
        const objects = STAMP_OBJECTS.filter((o) => o.group === g.key);
        if (objects.length === 0) return null;
        const got = objects.filter((o) => byId.has(o.id)).length;
        return (
          <section key={g.key} className="pp-group" aria-labelledby={`pp-${g.key}`}>
            <div className="pp-group-head">
              <h2 id={`pp-${g.key}`} className="pp-group-title">
                <a className="press" href={href(objects[0].page)}>
                  {g.title}
                </a>
              </h2>
              <span className="pp-group-count mono">
                {got}/{objects.length}
              </span>
            </div>
            <ul className="pp-grid">
              {objects.map((o) => (
                <li key={o.id}>
                  <Slot object={o} thumb={thumbs[o.id]} stamp={byId.get(o.id)} />
                </li>
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

function Slot({ object, thumb, stamp }: { object: StampObject; thumb?: Thumb; stamp?: Stamp }) {
  return (
    <article className={stamp ? 'pp-slot stamped' : 'pp-slot'} aria-label={stamp ? `${object.name}, stamped ${dayText(stamp.at)}${stamp.detail ? `, ${stamp.detail}` : ''}` : `${object.name}, not stamped yet`}>
      {thumb && (
        <picture className="pp-thumb">
          <source type="image/avif" srcSet={thumb.avif} sizes={thumb.sizes} />
          <source type="image/webp" srcSet={thumb.webp} sizes={thumb.sizes} />
          <img src={thumb.src} width={thumb.width} height={thumb.height} alt={thumb.alt} loading="lazy" decoding="async" />
        </picture>
      )}
      <h3 className="pp-name">{object.name}</h3>
    </article>
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
