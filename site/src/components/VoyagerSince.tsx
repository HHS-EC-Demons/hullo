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
  const since = stamped ? 'since your first stamp' : 'since you opened this page';

  useFrames(
    root,
    data
      ? (now) => {
          const a = rangeAt(data, 'voyager1', fromMs);
          const b = rangeAt(data, 'voyager1', now);
          if (!a || !b) return;
          const d = b.rg_km - a.rg_km;
          const way = d >= 0 ? 'farther' : 'closer';
          setText(num.current, `${groupInt(Math.abs(d))} km`);
          setText(dir.current, `Voyager 1 ${way}`);
          root.current?.setAttribute('aria-label', `Voyager 1 is ${groupInt(Math.abs(d))} km ${way === 'farther' ? 'farther from' : 'closer to'} Earth ${since}`);
        }
      : null,
    [data, fromMs, since],
    true,
  );

  return (
    <div ref={root} className="pp-since" role="group">
      <span ref={dir} className="pp-since-lead">
        Voyager 1 farther
      </span>
      <span ref={num} className="pp-since-n mono">
        0 km
      </span>
    </div>
  );
}
