import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Lifeline } from '../data/timeline';
import { quietEvents } from '../lib/quiet-count';
import { Skeleton } from '@/components/ui/skeleton';
import './quiet-now.css';

const QuietChart = lazy(() => import('./QuietChart'));

interface Props {
  lines: Lifeline[];
  builtMs: number;
}

export default function QuietNow({ lines, builtMs }: Props) {
  const [now, setNow] = useState(builtMs);
  const [live, setLive] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    setLive(true);
  }, []);

  const events = useMemo(() => quietEvents(lines), [lines]);
  const active = lines.filter((l) => l.answers).length;
  const ended = lines.length - active;

  return (
    <div className="qn">
      <p className="qn-count">
        <span className="qn-fig">
          <span className="qn-n on">{active}</span>
          <span className="qn-l">active</span>
        </span>
        <span className="qn-fig">
          <span className="qn-n">{ended}</span>
          <span className="qn-l">ended</span>
        </span>
      </p>
      <div className="qn-chart">
        {live ? (
          <Suspense fallback={<Skeleton className="absolute inset-0" />}>
            <QuietChart events={events} nowMs={now} />
          </Suspense>
        ) : (
          <Skeleton className="absolute inset-0" />
        )}
      </div>
    </div>
  );
}
