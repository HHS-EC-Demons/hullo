import { lazy } from 'react';
import ChartFrame from '@/components/ui/chart-frame';
import SkyChart from './SkyChart';
import { probeInfo } from '../data/probes';
import { useJson, useNow } from '../lib/client';
import { usePicked } from '../lib/picked';
import type { DeepSpaceData } from '../lib/lighttime';
import './probe.css';

const LightTimeChart = lazy(() => import('./LightTimeChart'));

export default function ProbeSky({ chart = true }: { chart?: boolean }) {
  const probe = usePicked();
  const minute = useNow(60000);
  const { data } = useJson<DeepSpaceData>('data/deep-space.json');
  return (
    <div className="ps">
      <SkyChart highlight={probe} now={minute} />
      {chart && data && (
        <ChartFrame className="ps-ltc">
          <LightTimeChart data={data} probe={probe} name={probeInfo(probe).name} now={minute} />
        </ChartFrame>
      )}
    </div>
  );
}
