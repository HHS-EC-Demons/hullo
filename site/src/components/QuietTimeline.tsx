import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { dayMs, span, spanText, TIMELINE_START, type Lifeline } from '../data/timeline';
import { getStamp, stamp } from '../lib/passport';
import { href } from '../lib/paths';
import { useReducedMotion, utcDate } from '../lib/client';
import './quiet.css';

export interface TimelinePhoto {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  nasaId: string;
  credit: string;
  page: string;
  caption: string;
  when: string;
}

interface Props {
  lines: Lifeline[];
  photos: Record<string, TimelinePhoto>;
  found: Record<string, string>;
  builtMs: number;
  first: string;
}

const QuietPulse = lazy(() => import('./QuietPulse'));

const SIZES = '(max-width: 860px) 120px, 416px';

function year(iso: string): string {
  return iso.slice(0, 4);
}

export default function QuietTimeline({ lines, photos, found, builtMs, first }: Props) {
  const [now, setNow] = useState(builtMs);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [stamped, setStamped] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => setNow(Date.now()), []);

  const x = useMemo(() => scaleLinear().domain([dayMs(TIMELINE_START), now]).range([0, 100]).clamp(true), [now]);
  const ticks = useMemo(() => {
    const out: Date[] = [];
    for (let y = 1970; dayMs(`${y}-01-01`) <= now; y += 10) out.push(new Date(dayMs(`${y}-01-01`)));
    return out;
  }, [now]);

  const shown = lines.find((l) => l.id === (hover ?? picked ?? first)) ?? lines[0];

  function figures(l: Lifeline) {
    const start = dayMs(l.start);
    if (l.answers) return { on: spanText(span(start, now)), off: null };
    const end = dayMs(l.end as string);
    return { on: spanText(span(start, end)), off: spanText(span(end, now)) };
  }

  function pick(l: Lifeline) {
    setPicked(l.id);
    setPulse((n) => n + 1);
    const f = figures(l);
    stamp(l.id, l.answers ? `Answering for ${f.on}` : `Silent for ${f.off}`);
    setStamped(getStamp(l.id) !== null);
  }

  return (
    <div className="qt">
      <div className="qt-sticky">
        <div className="qt-readout" aria-live="polite">
          <Readout line={shown} photo={photos[shown.id]} found={found[shown.id]} figures={figures(shown)} picked={picked !== null} stamped={stamped && shown.id === picked} />
        </div>
        <div className="qt-scale" aria-hidden="true">
          <p className="qt-key">
            <span className="qt-key-item">
              <span className="qt-key-line on" />
              Answering
            </span>
            <span className="qt-key-item">
              <span className="qt-key-line off" />
              Silent
            </span>
          </p>
          <div className="qt-axis">
            {ticks.map((t) => (
              <span key={t.getTime()} className={t.getUTCFullYear() % 20 === 0 ? 'qt-tick-label wide-only' : 'qt-tick-label'} style={{ left: `${x(t)}%` }}>
                {t.getUTCFullYear()}
              </span>
            ))}
            <span className="qt-tick-label today">Today</span>
          </div>
        </div>
      </div>

      <div className="qt-plot">
        <div className="qt-grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t.getTime()} className={t.getUTCFullYear() % 20 === 0 ? 'qt-gridline wide-only' : 'qt-gridline'} style={{ left: `${x(t)}%` }} />
          ))}
        </div>

        <ol className="qt-rows">
          {lines.map((l) => {
            const s = x(dayMs(l.start));
            const e = l.end ? x(dayMs(l.end)) : 100;
            const f = figures(l);
            const label = l.answers
              ? `${l.name}, ${l.startKind.toLowerCase()} ${utcDate(dayMs(l.start))}, still answers after ${f.on}`
              : `${l.name}, ${l.startKind.toLowerCase()} ${utcDate(dayMs(l.start))}, answered for ${f.on}, silent since ${utcDate(dayMs(l.end as string))}`;
            return (
              <li key={l.id}>
                <button
                  type="button"
                  className="qt-row"
                  aria-pressed={picked === l.id}
                  aria-label={label}
                  onClick={() => pick(l)}
                  onPointerEnter={(ev) => ev.pointerType === 'mouse' && setHover(l.id)}
                  onPointerLeave={() => setHover(null)}
                >
                  <span className="qt-name">{l.name}</span>
                  <span className={l.answers ? 'qt-state answers' : 'qt-state'}>
                    {l.answers ? 'Answers' : `Silent since ${year(l.end as string)}`}
                  </span>
                  <span className="qt-track">
                    <span className="qt-on" style={{ left: `${s}%`, width: `${Math.max(e - s, 0.4)}%` }} />
                    {!l.answers && (
                      <>
                        <span className="qt-off" style={{ left: `${e}%`, width: `${100 - e}%` }} />
                        <span className="qt-tick" style={{ left: `${e}%` }} />
                      </>
                    )}
                    {picked === l.id && !reduce && (
                      <span className="qt-run" style={{ left: `${s}%`, width: `${Math.max(e - s, 0.4)}%` }}>
                        <Suspense fallback={null}>
                          <QuietPulse key={pulse} />
                        </Suspense>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

      </div>
    </div>
  );
}

function Readout({ line, photo, found, figures, picked, stamped }: { line: Lifeline; photo?: TimelinePhoto; found?: string; figures: { on: string; off: string | null }; picked: boolean; stamped: boolean }) {
  return (
    <div className="qt-card">
      <figure className="qt-photo">
        {photo && (
          <>
            <picture>
              {photo.avif && <source type="image/avif" srcSet={photo.avif} sizes={SIZES} />}
              {photo.webp && <source type="image/webp" srcSet={photo.webp} sizes={SIZES} />}
              <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" />
            </picture>
            <figcaption className="credit">
              {photo.caption}
              {photo.when ? `, ${photo.when}` : ''}.{' '}
              <span data-credit>
                <a href={photo.page} rel="external noopener">
                  {photo.nasaId}
                </a>
                , {photo.credit}
              </span>
            </figcaption>
          </>
        )}
      </figure>
      <div className="qt-text">
        <h3 className="qt-title">{line.name}</h3>
        <p className="qt-dates">
          {line.startKind} {utcDate(dayMs(line.start))}.{' '}
          {line.end ? `Last heard ${utcDate(dayMs(line.end))}.` : `${line.endKind}.`}
        </p>
        <dl className="qt-figs">
          <div>
            <dt>{line.answers ? 'Answering for' : 'Answered for'}</dt>
            <dd className="mono">{figures.on}</dd>
          </div>
          {figures.off && (
            <div>
              <dt>Silent for</dt>
              <dd className="mono">{figures.off}</dd>
            </div>
          )}
        </dl>
        {found && <p className="qt-found">{found}</p>}
        {stamped ? (
          <p className="qt-stamped">
            Stamped in your <a href={href('passport/')}>passport</a>.
          </p>
        ) : (
          !picked && <p className="qt-stamped">Pick a line to compare. Each pick stamps your passport.</p>
        )}
      </div>
    </div>
  );
}
