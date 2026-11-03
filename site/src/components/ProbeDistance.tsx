import { lazy, useEffect, useState } from 'react';
import ChartFrame from '@/components/ui/chart-frame';
import { getPicked, onPicked, setPicked } from '../lib/picked';

const Chart = lazy(() => import('./ProbeDistanceChart'));

export default function ProbeDistance() {
  const [picked, setLocal] = useState(getPicked);
  useEffect(() => onPicked(setLocal), []);
  return (
    <ChartFrame className="h-[300px] md:h-[380px]">
      <Chart picked={picked} onPick={setPicked} />
    </ChartFrame>
  );
}
