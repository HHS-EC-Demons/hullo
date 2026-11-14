import { useRef } from 'react';
import { rangeAt, type DeepSpaceData } from '../lib/lighttime';
import { km } from '../lib/client';
import { setText, useFrames } from '../lib/frames';

interface Props {
  data: DeepSpaceData | null;
  probe: string;
  name: string;
  headline: 'h1' | 'p';
  error: string | null;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export default function LiveLight({ data, probe, name, headline, error }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLSpanElement>(null);
  const h = useRef<HTMLSpanElement>(null);
  const m = useRef<HTMLSpanElement>(null);
  const s = useRef<HTMLSpanElement>(null);
  const ms = useRef<HTMLSpanElement>(null);
  const tail = useRef<HTMLSpanElement>(null);
  const said = useRef<HTMLSpanElement>(null);
  const kmN = useRef<HTMLSpanElement>(null);
  const kmL = useRef<HTMLSpanElement>(null);

  useFrames(
    root,
    data
      ? (now) => {
          const r = rangeAt(data, probe, now);
          if (!r) return;
          const lt = r.rg_km / data.c_km_s;
          const whole = Math.floor(lt);
          const frac = lt - whole;
          const hh = Math.floor(whole / 3600);
          const mm = Math.floor((whole % 3600) / 60);
          setText(h.current, String(hh));
          setText(m.current, pad(mm));
          setText(s.current, pad(whole % 60));
          setText(ms.current, pad(Math.floor(frac * 1000), 3));
          setText(tail.current, pad(Math.floor(frac * 1e5) % 100));
          setText(said.current, `${hh} hours and ${mm} minutes`);
          setText(kmN.current, `${km.format(r.rg_km)} km`);
          setText(
            kmL.current,
            `from Earth’s center, ${Math.abs(r.rr_km_s).toFixed(2)} km ${r.rr_km_s >= 0 ? 'farther' : 'closer'} each second`,
          );
          big.current?.classList.remove('pending');
          root.current?.classList.remove('pending');
        }
      : null,
    [data, probe],
  );

  const Head = headline;

  return (
    <div ref={root} className={error ? 'ps-live' : 'ps-live pending'}>
      <Head className="ps-claim">
        <span className="ps-lead">{name} is</span>
        <span ref={big} className="ps-big mono pending" aria-hidden="true">
          <span ref={h}>00</span>
          <span className="u">h</span>
          <span ref={m}>00</span>
          <span className="u">min</span>
          <span ref={s}>00</span>
          <span className="frac">
            .<span ref={ms}>000</span>
            <span ref={tail} className="tail">
              00
            </span>
          </span>
          <span className="u last">s</span>
        </span>
        <span className="sr-only" ref={said}>
          many hours
        </span>
        <span className="ps-lead">of light away from you right now.</span>
      </Head>
      <p className="ps-km">
        <span className="mono ps-km-n" ref={kmN}>
          00,000,000,000 km
        </span>
        <span className="ps-km-l" ref={kmL}>
          {error ? 'Distance data did not load. Reload the page to try again.' : 'from Earth’s center, 00.00 km farther each second'}
        </span>
      </p>
    </div>
  );
}
