import { useMemo } from 'react';
import LineChart, { type LineSeries } from '@/components/ui/line-chart';
import history from '../data/probe-history.json';
import { monthYearOf } from '../lib/dates';
import { decimalYear } from '../lib/history';

interface Track {
  name: string;
  t: number[];
  sun_au: number[];
}

export default function ProbeDistanceChart({ picked, onPick }: { picked: string; onPick: (key: string) => void }) {
  const nowYear = decimalYear(Date.now());
  const series = useMemo<LineSeries[]>(
    () =>
      Object.entries(history.probes as Record<string, Track>).map(([key, p]) => ({
        key,
        label: p.name,
        points: p.t.map((t, i) => ({ x: t, y: p.sun_au[i] })).filter((pt) => pt.x <= nowYear),
      })),
    [Math.floor(nowYear * 12)],
  );

  return (
    <LineChart
      series={series}
      label="Distance from the Sun of five probes since launch, in astronomical units"
      xTitle="Year"
      yTitle="AU from the Sun"
      tickX={(x) => String(Math.round(x))}
      tickY={(y) => String(y)}
      readX={monthYearOf}
      readY={(y) => `${y.toFixed(1)} AU`}
      xDomain={[1972, 2027]}
      yDomain={[0, 180]}
      yTicks={6}
      picked={picked}
      onPick={onPick}
      endLabels
    />
  );
}
