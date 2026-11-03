import { useRef } from 'react';
import { rangeAt, type DeepSpaceData } from '../lib/lighttime';
import { km } from '../lib/client';
import { dropClass, setText, useFrames } from '../lib/frames';

interface Props {
  data: DeepSpaceData | null;
  probe: string;
  name: string;
  headline: 'h1' | 'p';
  error: string | null;
  speed?: boolean;
  distance?: boolean;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export default function LiveLight({ data, probe, name, headline, error, speed = true, distance = true }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLSpanElement>(null);
  const h = useRef<HTMLSpanElement>(null);
  const m = useRef<HTMLSpanElement>(null);
  const s = useRef<HTMLSpanElement>(null);
  const ms = useRef<HTMLSpanElement>(null);
  const tail = useRef<HTMLSpanElement>(null);
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
          const spoken = `${hh} hours and ${mm} minutes`;
          if (big.current && big.current.getAttribute('aria-label') !== spoken) big.current.setAttribute('aria-label', spoken);
          setText(kmN.current, `${km.format(r.rg_km)} km`);
          if (speed) setText(kmL.current, `${Math.abs(r.rr_km_s).toFixed(2)} km/s ${r.rr_km_s >= 0 ? 'farther' : 'closer'}`);
          dropClass(big.current, 'pending');
          dropClass(root.current, 'pending');
        }
      : null,
    [data, probe, speed],
  );

  const Head = headline;

  return (
    <div ref={root} className={error ? 'ps-live' : 'ps-live pending'}>
      <Head className="ps-claim">
        <span className="ps-lead">{name} is</span>
        <span ref={big} className="ps-big mono pending" role="img" aria-label="hours of light">
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
        <span className="ps-lead">of light away right now.</span>
      </Head>
      {(distance || error) && (
        <p className="ps-km">
          <span className="mono ps-km-n" ref={kmN}>
            00,000,000,000 km
          </span>
          {(speed || error) && (
            <span className="ps-km-l" ref={kmL}>
              {error ? 'Distance data did not load. Reload the page to try again.' : '00.00 km/s farther'}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
