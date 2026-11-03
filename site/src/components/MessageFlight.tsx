import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'motion/react';
import { hmsText, lightTimeAt, type DeepSpaceData } from '../lib/lighttime';
import { calDate, localStamp } from '../lib/dates';
import { setText, useFrames } from '../lib/frames';
import { probeInfo } from '../data/probes';
import { Button } from '@/components/ui/button';
import ShareCard, { type CardMessage } from './ShareCard';

export interface Message {
  id: string;
  probe: string;
  text: string;
  sent: number;
  arrives: number;
  reply?: number | null;
}

export const MOON_LIGHT_S = 384400 / 299792.458;
export const AU_LIGHT_S = 499.004784;
const T0 = 0.2;

/** Position along the track, 0 at Earth and 1 at the probe, ten times the time per equal step. */
export function trackX(t: number, total: number): number {
  if (t <= 0) return 0;
  if (t >= total) return 1;
  return Math.log10(1 + t / T0) / Math.log10(1 + total / T0);
}

function landmarks(data: DeepSpaceData, msg: Message): { label: string; t: number }[] {
  const total = (msg.arrives - msg.sent) / 1000;
  const out = [
    { label: 'Moon', t: MOON_LIGHT_S },
    { label: 'Sun', t: AU_LIGHT_S },
  ];
  if (msg.probe !== 'newhorizons') {
    const nh = lightTimeAt(data, 'newhorizons', msg.sent);
    if (nh && nh < total) out.push({ label: 'New Horizons', t: nh });
  }
  return out;
}

function shortTime(t: number): string {
  if (t < 60) return `${t.toFixed(1)} s`;
  if (t < 3600) return `${Math.round(t / 60)} min`;
  const h = Math.floor(t / 3600);
  return `${h} h ${String(Math.round((t % 3600) / 60)).padStart(2, '0')} min`;
}

const LABEL_TOP = 22;
const LABEL_ROW = 21;
const LABEL_GAP = 14;

/** Places each landmark label under its mark, clamped inside the track, on the first row where it overlaps no other label. */
function placeLabels(track: HTMLElement) {
  const box = track.getBoundingClientRect();
  const width = track.clientWidth;
  const ends: number[] = [];
  track.querySelectorAll<HTMLElement>('.fl-mark').forEach((mark) => {
    const label = mark.querySelector<HTMLElement>('.fl-mark-l');
    if (!label) return;
    const at = mark.getBoundingClientRect().left - box.left;
    const w = label.offsetWidth;
    const left = Math.max(0, Math.min(at - w / 2, width - w));
    let row = ends.findIndex((end) => left >= end + LABEL_GAP);
    if (row < 0) {
      row = ends.length;
      ends.push(0);
    }
    ends[row] = left + w;
    const top = LABEL_TOP + row * LABEL_ROW;
    label.style.left = `${(left - at).toFixed(1)}px`;
    label.style.top = `${top - 4}px`;
    mark.style.height = `${top - 7}px`;
  });
  track.style.paddingBottom = `${LABEL_TOP + Math.max(ends.length, 1) * LABEL_ROW - 10}px`;
}

function When({ ms }: { ms: number }) {
  return <span className="mono">{localStamp(ms, { seconds: true })}</span>;
}

function Flight({ data, msg, first, onShare, sharing, shareLabel }: {
  data: DeepSpaceData;
  msg: Message;
  first: boolean;
  onShare: (m: Message) => void;
  sharing: boolean;
  shareLabel: string;
}) {
  const root = useRef<HTMLLIElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const pulse = useRef<HTMLSpanElement>(null);
  const left = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(() => Date.now() >= msg.arrives);
  const info = probeInfo(msg.probe);
  const total = (msg.arrives - msg.sent) / 1000;
  const marks = landmarks(data, msg);
  const markKey = marks.map((k) => `${k.label}${k.t.toFixed(1)}`).join();

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    let live = true;
    const place = () => live && placeLabels(el);
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place).catch(() => undefined);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [markKey, total]);

  useFrames(
    root,
    done
      ? null
      : (now) => {
          const t = (now - msg.sent) / 1000;
          const x = trackX(t, total);
          if (pulse.current) pulse.current.style.transform = `translateX(${(x * 100).toFixed(3)}%)`;
          setText(left.current, hmsText(Math.max(0, (msg.arrives - now) / 1000)));
          if (now >= msg.arrives) setDone(true);
        },
    [msg.id, done],
  );

  const now = Date.now();
  const silent = !info.answers;

  return (
    <m.li
      ref={root}
      className="fl"
      layout="position"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <p className="fl-text">
        <span className="fl-to">To {info.name}</span>
        <span className="fl-msg">{msg.text}</span>
      </p>

      <div className="fl-track" ref={track} aria-hidden="true">
        <span className="fl-end">Earth</span>
        <span className="fl-line">
          {marks.map((k) => (
            <span key={k.label} className="fl-mark" style={{ left: `${(trackX(k.t, total) * 100).toFixed(2)}%` }}>
              <span className="fl-mark-l">
                {k.label} <span className="mono">{shortTime(k.t)}</span>
              </span>
            </span>
          ))}
          <span className="fl-run" ref={pulse} style={{ transform: `translateX(${done ? 100 : 0}%)` }}>
            <span className="fl-pulse" />
          </span>
        </span>
        <span className="fl-end">{info.name}</span>
      </div>

      <dl className="fl-times">
        <div>
          <dt>{done ? 'Arrived' : 'Arrives'}</dt>
          <dd>
            <When ms={msg.arrives} />
          </dd>
        </div>
        {!done && (
          <div>
            <dt>Still to go</dt>
            <dd>
              <span className="mono" ref={left}>
                {hmsText(Math.max(0, (msg.arrives - now) / 1000))}
              </span>
            </dd>
          </div>
        )}
        {!silent && msg.reply && (
          <div>
            <dt>Reply lands</dt>
            <dd>
              <When ms={msg.reply} />
            </dd>
          </div>
        )}
      </dl>

      {silent && (
        <div className="fl-silent">
          <p className="fl-silent-big">No reply</p>
          <p>
            Mission ended <span className="mono">{calDate(info.statusDate)}</span>
          </p>
        </div>
      )}

      <div className="fl-act">
        <Button variant="quiet" size="sm" onClick={() => onShare(msg)} disabled={sharing}>
          {sharing ? 'Making…' : shareLabel}
        </Button>
      </div>
    </m.li>
  );
}

interface Props {
  data: DeepSpaceData;
  messages: Message[];
}

export default function MessageFlight({ data, messages }: Props) {
  const [card, setCard] = useState<CardMessage | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ready, setReady] = useState<{ id: string; file: File } | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [note, setNote] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const probe = new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' });
      setCanShare(window.matchMedia('(pointer: coarse)').matches && !!navigator.canShare?.({ files: [probe] }));
    } catch {
      setCanShare(false);
    }
  }, []);

  useEffect(() => {
    if (!card || !cardRef.current) return;
    let live = true;
    (async () => {
      try {
        const { toBlob } = await import('html-to-image');
        await document.fonts.ready;
        const blob = await toBlob(cardRef.current as HTMLDivElement, { width: 1200, height: 630, pixelRatio: 1, backgroundColor: '#0d0a18' });
        if (!blob || !live) return;
        const name = `hullo-message-to-${card.probe}.png`;
        if (canShare) {
          setReady({ id: card.id, file: new File([blob], name, { type: 'image/png' }) });
          setNote('Ready');
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          setNote('Saved');
        }
      } catch {
        if (live) setNote('Try again');
      } finally {
        if (live) {
          setBusy(null);
          setCard(null);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [card, canShare]);

  function share(msg: Message) {
    if (ready && ready.id === msg.id) {
      navigator.share({ files: [ready.file], title: `Message to ${probeInfo(msg.probe).name}` }).catch(() => undefined);
      return;
    }
    const info = probeInfo(msg.probe);
    setNote('');
    setReady(null);
    setBusy(msg.id);
    setCard({
      id: msg.id,
      probe: msg.probe,
      name: info.name,
      text: msg.text,
      sent: msg.sent,
      arrives: msg.arrives,
      silent: info.answers ? undefined : `No reply will come. ${info.name}’s ${info.lastContact} on ${calDate(info.statusDate)}.`,
    });
  }

  if (messages.length === 0) return null;

  return (
    <LazyMotion features={domAnimation}>
      <ol className="fl-list" aria-label="Your messages">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <Flight
              key={msg.id}
              data={data}
              msg={msg}
              first={i === 0}
              onShare={share}
              sharing={busy === msg.id}
              shareLabel={ready?.id === msg.id ? 'Share picture' : canShare ? 'Make picture' : 'Save picture'}
            />
          ))}
        </AnimatePresence>
      </ol>
      <p className="fl-note" aria-live="polite">
        {note}
      </p>
      {card && (
        <div className="card-stage" aria-hidden="true">
          <ShareCard ref={cardRef} msg={card} />
        </div>
      )}
    </LazyMotion>
  );
}
