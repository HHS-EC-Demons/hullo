import { useEffect, useRef } from 'react';
import record from '../data/jezero-clock.json';
import { groupInt } from '../lib/client';
import { marsTime, missionClock } from '../lib/mars24';

export default function JezeroClock() {
  const sol = useRef<HTMLSpanElement>(null);
  const time = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      if (!document.hidden) {
        const c = missionClock(Date.now(), record);
        if (sol.current) sol.current.textContent = groupInt(c.sol);
        if (time.current) time.current.textContent = marsTime(c.lmst_h, true);
      }
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <p className="jc" role="group" aria-label="Sol and local mean solar time on Perseverance’s mission clock at Jezero crater">
      <span className="jc-label">Jezero</span>
      <span className="jc-v mono">
        sol <span ref={sol} className="jc-sol">{' '.repeat(5)}</span>
      </span>
      <span ref={time} className="jc-v jc-time mono">
        {' '.repeat(8)}
      </span>
    </p>
  );
}
