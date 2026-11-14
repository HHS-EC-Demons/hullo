import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Lifeline } from '../data/timeline';
import { quietEvents } from '../lib/quiet-count';
import { localCalDate, localIsoDay } from '../lib/local-date';
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
  const answering = lines.filter((l) => l.answers).length;
  const quiet = lines.length - answering;

  return (
    <div className="qn">
      <p className="qn-count">
        <span className="qn-fig">
          <span className="qn-n on">{answering}</span>
          <span className="qn-l">still answer</span>
        </span>
        <span className="qn-fig">
          <span className="qn-n">{quiet}</span>
          <span className="qn-l">went quiet</span>
        </span>
      </p>
      <p className="qn-date">
        As of <time dateTime={localIsoDay(now)}>{localCalDate(now)}</time>
      </p>
      <div className="qn-chart">{live && <Suspense fallback={null}><QuietChart events={events} nowMs={now} /></Suspense>}</div>
    </div>
  );
}
