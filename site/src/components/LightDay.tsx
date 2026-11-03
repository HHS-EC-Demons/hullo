import { useRef } from 'react';
import type { DeepSpaceData } from '../lib/lighttime';
import { dropClass, setHidden, setText, useFrames } from '../lib/frames';

export const NASA_LIGHT_DAY_UTC = '2026-11-18T10:16:07Z';

interface Props {
  data: DeepSpaceData | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function setLabel(el: Element | null, text: string): void {
  if (el && el.getAttribute('aria-label') !== text) el.setAttribute('aria-label', text);
}

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
  const count = useRef<HTMLParagraphElement>(null);

  const crossing = data?.probes.voyager1.light_day_utc ? Date.parse(data.probes.voyager1.light_day_utc) : null;

  useFrames(
    root,
    crossing
      ? (now) => {
          const left = secondsToLightDay(crossing, now);
          if (left > 0) {
            const p = countdownParts(left);
            setText(lead.current, 'One light-day in');
            setText(d.current, String(p.d));
            setText(h.current, pad(p.h));
            setText(m.current, pad(p.m));
            setText(s.current, pad(p.s));
            setLabel(count.current, `${p.d} days and ${p.h} hours`);
            setHidden(clock.current, false);
            setHidden(after.current, true);
          } else {
            const days = Math.floor((now - crossing) / 86400000);
            setText(lead.current, 'One light-day reached');
            setText(after.current, days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`);
            setLabel(count.current, after.current?.textContent ?? '');
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
        One light-day in
      </p>
      <p className="ld-count mono" ref={count} role="img" aria-label="a few days">
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
      <p className="ld-note mono">18 Nov 2026, 10:16:07 UTC</p>
    </div>
  );
}
