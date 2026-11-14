import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { dailyHours, hmsText, type DeepSpaceData } from '../lib/lighttime';
import { utcDate, utcMonth } from '../lib/client';

interface Props {
  data: DeepSpaceData;
  probe: string;
  name: string;
  now: number | null;
}

const H = 280;
const PAD = { top: 26, right: 16, bottom: 34 };
const DAY = 86400000;
const DOT = 5;
const CHAR_PX = 7.9;

function niceStep(span: number): number {
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2.5 : n < 7.5 ? 5 : 10) * pow;
}

function hoursLabel(h: number): string {
  return `${Number.isInteger(h) ? h : h.toFixed(h * 10 === Math.round(h * 10) ? 1 : 2)} h`;
}


export default function LightTimeChart({ data, probe, name, now }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => {
    const end = Date.parse('2028-01-01T00:00:00Z');
    return dailyHours(data, probe).filter((p) => p.ms <= end);
  }, [data, probe]);

  const w = Math.max(width, 280);
  const t0 = series[0].ms;
  const t1 = series[series.length - 1].ms;
  const lo = Math.min(...series.map((p) => p.hours));
  const hi = Math.max(...series.map((p) => p.hours));
  const step = niceStep(Math.max(hi - lo, 0.2));
  let y0 = Math.floor(lo / step) * step;
  let y1 = Math.ceil(hi / step) * step;
  const showDay = probe === 'voyager1' && 24 >= y0 && 24 <= y1;
  if (y1 - y0 < step * 2) y1 = y0 + step * 2;

  const ticks: number[] = [];
  for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  const left = Math.ceil(Math.max(...ticks.map((v) => hoursLabel(v).length)) * CHAR_PX) + 18;
  const x = (ms: number) => left + ((ms - t0) / (t1 - t0)) * (w - left - PAD.right);
  const y = (h: number) => PAD.top + (1 - (h - y0) / (y1 - y0)) * (H - PAD.top - PAD.bottom);

  const path = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.ms).toFixed(1)},${y(p.hours).toFixed(1)}`).join('');
  const months: number[] = [];
  const every = w - left - PAD.right < 520 ? 6 : 3;
  for (let yr = 2026; yr <= 2027; yr++) for (let m = 0; m < 12; m += every) months.push(Date.UTC(yr, m, 1));
  months.push(Date.UTC(2028, 0, 1));

  const crossIso = data.probes[probe].light_day_utc;
  const crossing = showDay && crossIso ? Date.parse(crossIso) : null;
  const crossLabel = crossing ? utcDate(crossing) : '';
  const nowIndex = now ? Math.round((now - t0) / DAY) : null;
  const nowPoint = nowIndex !== null && nowIndex >= 0 && nowIndex < series.length ? series[nowIndex] : null;
  const active = hover !== null ? series[hover] : null;

  function pick(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const f = (px - left) / (w - left - PAD.right);
    setHover(Math.max(0, Math.min(series.length - 1, Math.round(f * (series.length - 1)))));
  }

  function key(e: KeyboardEvent<SVGSVGElement>) {
    const base = hover ?? nowIndex ?? 0;
    const moves: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, PageDown: -30, PageUp: 30 };
    if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(series.length - 1);
    else if (e.key in moves) setHover(Math.max(0, Math.min(series.length - 1, base + moves[e.key])));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  }

  const tipLeft = active ? Math.min(Math.max(x(active.ms) - 90, 0), w - 180) : 0;

  return (
    <figure className="ltc">
      <figcaption>
        <span className="ltc-title">Light time from Earth to {name}, 2026 and 2027</span>
        <span className="ltc-sub">Earth circles the Sun, so the gap grows and shrinks a little each year.</span>
      </figcaption>
      <div className="ltc-plot" ref={box}>
        {width > 0 && (
          <svg
            width={w}
            height={H}
            role="img"
            aria-label={`Line chart of light time from Earth to ${name} from January 2026 to January 2028, between ${hoursLabel(Number(lo.toFixed(2)))} and ${hoursLabel(Number(hi.toFixed(2)))}. Use the arrow keys to read values.`}
            tabIndex={0}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover((h) => h ?? nowIndex ?? 0)}
            onBlur={() => setHover(null)}
            onKeyDown={key}
          >
            {ticks.map((v) => (
              <g key={v}>
                <line className="ltc-grid" x1={left} x2={w - PAD.right} y1={y(v)} y2={y(v)} />
                <text className="ltc-tick" x={left - 10} y={y(v)} dy="0.32em" textAnchor="end">
                  {hoursLabel(v)}
                </text>
              </g>
            ))}
            {months.map((m) => (
              <text key={m} className="ltc-tick" x={x(m)} y={H - 10} textAnchor="middle">
                {new Date(m).getUTCMonth() === 0 ? new Date(m).getUTCFullYear() : utcMonth(m)}
              </text>
            ))}
            {showDay && (
              <g>
                <line className="ltc-ref" x1={left} x2={w - PAD.right} y1={y(24)} y2={y(24)} />
                <text className="ltc-reflabel" x={w - PAD.right} y={y(24) - 7} textAnchor="end">
                  1 light-day
                </text>
              </g>
            )}
            {active && <line className="ltc-cross" x1={x(active.ms)} x2={x(active.ms)} y1={PAD.top} y2={H - PAD.bottom} />}
            <path className="ltc-line" d={path} />
            {crossing !== null && (
              <g>
                <circle className="ltc-mark" cx={x(crossing)} cy={y(24)} r={DOT} />
                <text className="ltc-marklabel" x={x(crossing)} y={y(24) - 12} textAnchor="middle">
                  {crossLabel}
                </text>
              </g>
            )}
            {nowPoint && (
              <g>
                <circle className="ltc-now" cx={x(nowPoint.ms)} cy={y(nowPoint.hours)} r={DOT} />
                <text className="ltc-nowlabel" x={x(nowPoint.ms)} y={y(nowPoint.hours) + 22} textAnchor="middle">
                  Today
                </text>
              </g>
            )}
            {active && <circle className="ltc-now" cx={x(active.ms)} cy={y(active.hours)} r={DOT} />}
          </svg>
        )}
        {active && (
          <div className="ltc-tip" style={{ left: tipLeft }} aria-live="polite">
            <strong className="mono">{hmsText(active.hours * 3600)}</strong>
            <span>{utcDate(active.ms)}</span>
          </div>
        )}
      </div>
      <details className="ltc-table">
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Date (00:00 UTC)</th>
              <th scope="col">Light time</th>
            </tr>
          </thead>
          <tbody>
            {series
              .filter((p) => new Date(p.ms).getUTCDate() === 1)
              .map((p) => (
                <tr key={p.ms}>
                  <td>{utcDate(p.ms)}</td>
                  <td className="mono">{hmsText(p.hours * 3600)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
