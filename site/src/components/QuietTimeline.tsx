import { useEffect, useMemo, useState } from 'react';
import { scaleUtc } from 'd3-scale';
import { motion, useReducedMotion } from 'motion/react';
import { dayMs, span, spanText, TIMELINE_START, type Lifeline } from '../data/timeline';
import { getStamp, stamp } from '../lib/passport';
import { href } from '../lib/paths';
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
}

interface Props {
  lines: Lifeline[];
  photos: Record<string, TimelinePhoto>;
  builtMs: number;
  first: string;
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const SIZES = '(max-width: 640px) 128px, 288px';

function year(iso: string): string {
  return iso.slice(0, 4);
}

export default function QuietTimeline({ lines, photos, builtMs, first }: Props) {
  const [now, setNow] = useState(builtMs);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [stamped, setStamped] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => setNow(Date.now()), []);

  const x = useMemo(() => scaleUtc().domain([dayMs(TIMELINE_START), now]).range([0, 100]).clamp(true), [now]);
  const ticks = useMemo(() => x.ticks(8).filter((d) => d.getUTCFullYear() % 10 === 0), [x]);

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
          <Readout line={shown} photo={photos[shown.id]} figures={figures(shown)} picked={picked !== null} stamped={stamped && shown.id === picked} />
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
              ? `${l.name}, ${l.startKind.toLowerCase()} ${dateFmt.format(dayMs(l.start))}, still answers after ${f.on}`
              : `${l.name}, ${l.startKind.toLowerCase()} ${dateFmt.format(dayMs(l.start))}, answered for ${f.on}, silent since ${dateFmt.format(dayMs(l.end as string))}`;
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
                        <motion.span
                          key={pulse}
                          className="qt-pulse"
                          initial={{ x: '-100%', opacity: 1 }}
                          animate={{ x: ['-100%', '0%', '0%'], opacity: [1, 1, 0] }}
                          transition={{ duration: 1.5, times: [0, 0.78, 1], ease: 'easeInOut' }}
                        />
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

function Readout({ line, photo, figures, picked, stamped }: { line: Lifeline; photo?: TimelinePhoto; figures: { on: string; off: string | null }; picked: boolean; stamped: boolean }) {
  return (
    <div className={photo ? 'qt-card' : 'qt-card no-photo'}>
      {photo && (
        <figure className="qt-photo">
          <picture>
            {photo.avif && <source type="image/avif" srcSet={photo.avif} sizes={SIZES} />}
            {photo.webp && <source type="image/webp" srcSet={photo.webp} sizes={SIZES} />}
            <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} decoding="async" />
          </picture>
          <figcaption className="credit">
            <a href={photo.page} rel="external noopener">
              {photo.nasaId}
            </a>
            , {photo.credit}
          </figcaption>
        </figure>
      )}
      <div className="qt-text">
        <h3 className="qt-title">{line.name}</h3>
        <p className="qt-dates">
          {line.startKind} {dateFmt.format(dayMs(line.start))}.{' '}
          {line.end ? `Last heard ${dateFmt.format(dayMs(line.end))}.` : `${line.endKind}.`}
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
        {stamped ? (
          <p className="qt-stamped">
            Stamped in your <a href={href('passport/')}>passport</a>.
          </p>
        ) : (
          !picked && <p className="qt-stamped">Pick any line below to compare. Each pick stamps your passport.</p>
        )}
      </div>
    </div>
  );
}
