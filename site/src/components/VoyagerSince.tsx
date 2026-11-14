import { useRef } from 'react';
import { rangeAt, type DeepSpaceData } from '../lib/lighttime';
import { groupInt, useJson } from '../lib/client';
import { setText, useFrames } from '../lib/frames';

interface Props {
  fromMs: number;
  stamped: boolean;
}

export default function VoyagerSince({ fromMs, stamped }: Props) {
  const data = useJson<DeepSpaceData>('data/deep-space.json').data;
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const dir = useRef<HTMLSpanElement>(null);

  useFrames(
    root,
    data
      ? (now) => {
          const a = rangeAt(data, 'voyager1', fromMs);
          const b = rangeAt(data, 'voyager1', now);
          if (!a || !b) return;
          const d = b.rg_km - a.rg_km;
          setText(num.current, `${groupInt(Math.abs(d))} km`);
          setText(dir.current, d >= 0 ? 'farther from Earth' : 'closer to Earth');
        }
      : null,
    [data, fromMs],
    true,
  );

  return (
    <div ref={root} className="pp-since" aria-live="off">
      <p className="pp-since-lead">{stamped ? 'Voyager 1 since your first stamp' : 'Voyager 1 since you opened this page'}</p>
      <p className="pp-since-fig">
        <span ref={num} className="pp-since-n mono">
          0 km
        </span>{' '}
        <span ref={dir}>farther from Earth</span>
      </p>
    </div>
  );
}
