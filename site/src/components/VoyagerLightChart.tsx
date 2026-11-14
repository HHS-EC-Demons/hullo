import { useMemo } from 'react';
import LineChart, { type Mark } from '@/components/ui/line-chart';
import history from '../data/probe-history.json';
import { monthYearOf } from '../lib/dates';
import { decimalYear, type History } from '../lib/history';

const V1 = (history as History).probes.voyager1;

function hoursText(h: number): string {
  const whole = Math.floor(h);
  return `${whole} h ${String(Math.floor((h - whole) * 60)).padStart(2, '0')} min`;
}

export default function VoyagerLightChart() {
  const nowYear = decimalYear(Date.now());
  const series = useMemo(() => {
    const points = V1.t.map((t, i) => ({ x: t, y: V1.earth_light_h[i] })).filter((p) => p.x <= nowYear);
    return [{ key: 'voyager1', label: 'Voyager 1', points }];
  }, [Math.floor(nowYear * 12)]);

  const marks: Mark[] = [];

  return (
    <LineChart
      series={series}
      label="Hours of light from Earth to Voyager 1 each month since launch in 1977"
      xTitle="Year"
      yTitle=""
      tickX={(x) => String(Math.round(x))}
      tickY={(y) => `${y} h`}
      readX={monthYearOf}
      readY={hoursText}
      xDomain={[1977, 2027]}
      yDomain={[0, 28]}
      xTickValues={[1980, 1990, 2000, 2010, 2020]}
      yTicks={4}
      refLines={[{ y: 24, label: '' }]}
      marks={marks}
    />
  );
}
