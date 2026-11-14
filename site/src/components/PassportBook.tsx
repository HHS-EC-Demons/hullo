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
}

export default function PassportBook({ site, thumbs }: Props) {
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

      {GROUPS.map((g) => {
        const objects = STAMP_OBJECTS.filter((o) => o.group === g.key);
        if (objects.length === 0) return null;
        const got = objects.filter((o) => byId.has(o.id)).length;
        return (
          <section key={g.key} className="pp-group" aria-labelledby={`pp-${g.key}`}>
            <div className="pp-group-head">
              <h2 id={`pp-${g.key}`} className="pp-group-title">
                {g.title}
              </h2>
              <span className="pp-group-count mono">
                {got} of {objects.length}
              </span>
              <Button asChild variant="secondary" size="sm">
                <a href={href(objects[0].page)}>Open {g.title}</a>
              </Button>
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
    <article className={stamp ? 'pp-slot stamped' : 'pp-slot'}>
      <figure className="pp-thumb">
        {thumb && (
          <picture>
            <source type="image/avif" srcSet={thumb.avif} sizes={thumb.sizes} />
            <source type="image/webp" srcSet={thumb.webp} sizes={thumb.sizes} />
            <img src={thumb.src} width={thumb.width} height={thumb.height} alt={thumb.alt} loading="lazy" decoding="async" />
          </picture>
        )}
        {thumb && (
          <figcaption className="pp-cap">
            {thumb.nasaId}
            {thumb.when ? `, ${thumb.when}` : ''}, {thumb.credit}
          </figcaption>
        )}
      </figure>
      <h3 className="pp-name">{object.name}</h3>
      {stamp ? (
        <div className="pp-stamp" style={{ '--tilt': `${tilt(object.id)}deg` } as CSSProperties}>
          {stamp.detail && <p className="pp-stamp-detail mono">{stamp.detail}</p>}
          <p className="pp-stamp-date mono">
            Stamped <time dateTime={new Date(stamp.at).toISOString()}>{dayText(stamp.at)}</time>
          </p>
        </div>
      ) : (
        <p className="sr-only">Not stamped yet</p>
      )}
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
