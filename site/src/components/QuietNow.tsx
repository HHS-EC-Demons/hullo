import { lazy, Suspense, useEffect, useId, useMemo, useState } from 'react';
import type { Lifeline } from '../data/timeline';
import { answeringOn, quietEvents } from '../lib/quiet-count';
import { dayMs, TIMELINE_START } from '../data/timeline';
import { Input } from '@/components/ui/input';
import { localIsoDay } from '../lib/local-date';
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

  const [birthday, setBirthday] = useState('');
  const birthId = useId();
  const events = useMemo(() => quietEvents(lines), [lines]);
  const today = localIsoDay(now);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(birthday) && birthday >= TIMELINE_START && birthday <= today;
  const then = valid ? answeringOn(lines, birthday) : null;
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
      <div className="qn-chart">
        {live && (
          <Suspense fallback={null}>
            <QuietChart events={events} nowMs={now} markMs={valid ? dayMs(birthday) : null} markCount={then} />
          </Suspense>
        )}
      </div>
      <div className="qn-birth">
        <label htmlFor={birthId}>Your birthday</label>
        <Input id={birthId} type="date" min={TIMELINE_START} max={today} value={birthday} onChange={(e) => setBirthday(e.target.value)} className="qn-birth-input" />
        <p className="qn-birth-out" aria-live="polite">
          {then !== null && (
            <>
              <span className="qn-birth-n">{then}</span> answering
            </>
          )}
        </p>
      </div>
    </div>
  );
}
