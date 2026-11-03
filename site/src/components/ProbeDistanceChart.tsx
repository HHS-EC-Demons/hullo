import { useMemo } from 'react';
import LineChart, { type LineSeries } from '@/components/ui/line-chart';
import history from '../data/probe-history.json';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Track {
  name: string;
  t: number[];
  sun_au: number[];
}

function monthYear(t: number): string {
  const year = Math.floor(t + 1e-6);
  const month = Math.min(11, Math.floor((t - year) * 12 + 1e-6));
  return `${MONTHS[month]} ${year}`;
}

export default function ProbeDistanceChart({ picked, onPick }: { picked: string; onPick: (key: string) => void }) {
  const series = useMemo<LineSeries[]>(
    () =>
      Object.entries(history.probes as Record<string, Track>).map(([key, p]) => ({
        key,
        label: p.name,
        points: p.t.map((t, i) => ({ x: t, y: p.sun_au[i] })),
      })),
    [],
  );

  return (
    <LineChart
      series={series}
      label="Distance from the Sun of five probes since launch, in astronomical units"
      xTitle="Year"
      yTitle="AU from the Sun"
      tickX={(x) => String(Math.round(x))}
      tickY={(y) => String(y)}
      readX={monthYear}
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
