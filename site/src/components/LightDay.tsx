import { useEffect, useRef, useState } from 'react';
import type { DeepSpaceData } from '../lib/lighttime';
import { localDate, localTime } from '../lib/client';
import { dropClass, setHidden, setText, useFrames } from '../lib/frames';

export const NASA_LIGHT_DAY_UTC = '2026-11-18T10:16:07Z';

interface Props {
  data: DeepSpaceData | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Whole seconds until the site's own table crosses 86,400 s, rounded up so 0 lands on the crossing. */
export function secondsToLightDay(crossingMs: number, now: number): number {
  return Math.ceil((crossingMs - now) / 1000);
}

export function countdownParts(sec: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, sec);
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

export default function LightDay({ data }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const lead = useRef<HTMLParagraphElement>(null);
  const d = useRef<HTMLSpanElement>(null);
  const h = useRef<HTMLSpanElement>(null);
  const m = useRef<HTMLSpanElement>(null);
  const s = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const after = useRef<HTMLSpanElement>(null);
  const said = useRef<HTMLSpanElement>(null);

  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => setLocal(`${localDate(Date.parse(NASA_LIGHT_DAY_UTC))}, ${localTime(Date.parse(NASA_LIGHT_DAY_UTC))}`), []);

  const crossing = data?.probes.voyager1.light_day_utc ? Date.parse(data.probes.voyager1.light_day_utc) : null;

  useFrames(
    root,
    crossing
      ? (now) => {
          const left = secondsToLightDay(crossing, now);
          if (left > 0) {
            const p = countdownParts(left);
            setText(lead.current, 'Voyager 1 reaches one light-day from Earth in');
            setText(d.current, String(p.d));
            setText(h.current, pad(p.h));
            setText(m.current, pad(p.m));
            setText(s.current, pad(p.s));
            setText(said.current, `${p.d} days and ${p.h} hours`);
            setHidden(clock.current, false);
            setHidden(after.current, true);
          } else {
            const days = Math.floor((now - crossing) / 86400000);
            setText(lead.current, 'Voyager 1 crossed one light-day from Earth');
            setText(after.current, days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`);
            setText(said.current, after.current?.textContent ?? '');
            setHidden(clock.current, true);
            setHidden(after.current, false);
          }
          dropClass(root.current, 'pending');
        }
      : null,
    [crossing],
    true,
  );

  return (
    <div ref={root} className="ld pending">
      <p className="ld-lead" ref={lead}>
        Voyager 1 reaches one light-day from Earth in
      </p>
      <p className="ld-count mono" aria-hidden="true">
        <span ref={clock}>
          <span ref={d}>0</span>
          <span className="u">d</span>
          <span ref={h}>00</span>
          <span className="u">h</span>
          <span ref={m}>00</span>
          <span className="u">min</span>
          <span ref={s}>00</span>
          <span className="u">s</span>
        </span>
        <span ref={after} hidden>
          today
        </span>
      </p>
      <span className="sr-only" ref={said}>
        a few days
      </span>
      <p className="ld-note">
        On <span className="mono">18 Nov 2026, 10:16:07 UTC</span>, the time NASA gives, which is{' '}
        <span className="mono" style={local ? undefined : { visibility: 'hidden' }}>
          {local ?? 'Wed 18 Nov, 00:00:00 UTC+0'}
        </span>{' '}
        where you are. At that second Voyager 1’s light time reads exactly 24 h.
      </p>
    </div>
  );
}
