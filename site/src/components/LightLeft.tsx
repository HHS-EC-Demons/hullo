import { useRef } from 'react';
import { downlinkAt, lightTimeAt, type DeepSpaceData } from '../lib/lighttime';
import { localStamp } from '../lib/dates';
import { setText, useFrames } from '../lib/frames';

interface Props {
  data: DeepSpaceData | null;
  probe: string;
  name: string;
}

/** When the signal reaching Earth's center now left the probe, by iterating the downlink light time. */
export function departedAt(data: DeepSpaceData, probe: string, now: number): number | null {
  const lt = lightTimeAt(data, probe, now);
  if (lt === null) return null;
  let left = now - lt * 1000;
  for (let i = 0; i < 3; i++) {
    const down = downlinkAt(data, probe, left);
    if (down === null) return null;
    left = now - down * 1000;
  }
  return left;
}

export default function LightLeft({ data, probe, name }: Props) {
  const root = useRef<HTMLParagraphElement>(null);
  const at = useRef<HTMLSpanElement>(null);

  useFrames(
    root,
    data
      ? (now) => {
          const left = departedAt(data, probe, now);
          if (left !== null) setText(at.current, localStamp(left, { seconds: true, now, weekday: false }));
        }
      : null,
    [data, probe],
    true,
  );

  return (
    <p ref={root} className="ps-left">
      <span>Light left at</span>
      <span ref={at} className="ps-left-at mono">
        {' '}
      </span>
    </p>
  );
}
