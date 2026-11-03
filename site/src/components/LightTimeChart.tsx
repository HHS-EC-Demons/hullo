import { useMemo } from 'react';
import LineChart, { type Mark, type RefLine } from '@/components/ui/line-chart';
import { dailyHours, hmsText, type DeepSpaceData } from '../lib/lighttime';
import { calDate, MONTHS } from '../lib/dates';

interface Props {
  data: DeepSpaceData;
  probe: string;
  name: string;
  now: number | null;
}

const DAY = 86400000;
const Y0 = Date.UTC(2026, 0, 1);
const Y1 = Date.UTC(2027, 0, 1);
const Y2 = Date.UTC(2028, 0, 1);
const TICKS = [2026, 2026.25, 2026.5, 2026.75, 2027, 2027.25, 2027.5, 2027.75, 2028];

function toYear(ms: number): number {
  return ms < Y1 ? 2026 + (ms - Y0) / (Y1 - Y0) : 2027 + (ms - Y1) / (Y2 - Y1);
}

function fromYear(x: number): number {
  const ms = x < 2027 ? Y0 + (x - 2026) * (Y1 - Y0) : Y1 + (x - 2027) * (Y2 - Y1);
  return Math.round(ms / DAY) * DAY;
}

function hoursTick(h: number): string {
  return `${Number(h.toFixed(2))} h`;
}

export default function LightTimeChart({ data, probe, name, now }: Props) {
  const series = useMemo(() => dailyHours(data, probe).filter((p) => p.ms <= Y2), [data, probe]);

  const lo = Math.min(...series.map((p) => p.hours));
  const hi = Math.max(...series.map((p) => p.hours));
  const y0 = Math.floor(lo * 4) / 4;
  const y1 = Math.max(Math.ceil(hi * 4) / 4, y0 + 0.5);

  const crossIso = data.probes[probe].light_day_utc;
  const crossing = probe === 'voyager1' && crossIso ? Date.parse(crossIso) : null;
  const refLines: RefLine[] = crossing !== null ? [{ y: 24, label: 'One light-day' }] : [];
  const marks: Mark[] = [];
  if (crossing !== null) marks.push({ x: toYear(crossing), y: 24, label: calDate(crossing) });
  if (now !== null) {
    const i = Math.round((now - Y0) / DAY);
    if (i >= 0 && i < series.length) marks.push({ x: toYear(series[i].ms), y: series[i].hours, label: 'Today', below: true });
  }

  return (
    <figure className="ltc">
      <figcaption>
        <span className="ltc-title">Hours of light to {name}, 2026 to 2027</span>
      </figcaption>
      <div className="ltc-plot">
        <LineChart
          series={[{ key: probe, label: name, points: series.map((p) => ({ x: toYear(p.ms), y: p.hours })) }]}
          label={`Light time from Earth to ${name} each day from January 2026 to January 2028, in hours`}
          xTitle="Date"
          yTitle="Hours of light"
          tickX={(x) => (Number.isInteger(x) ? String(x) : MONTHS[Math.round((x % 1) * 12)])}
          tickY={hoursTick}
          readX={(x) => calDate(fromYear(x))}
          readY={(h) => hmsText(h * 3600)}
          xDomain={[2026, 2028]}
          yDomain={[y0, y1]}
          xTickValues={TICKS}
          yTicks={5}
          refLines={refLines}
          marks={marks}
        />
      </div>
      <details className="ltc-table">
        <summary>Show table</summary>
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
                  <td>{calDate(p.ms)}</td>
                  <td className="mono">{hmsText(p.hours * 3600)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
