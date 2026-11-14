import { lazy, memo, Suspense, useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { arrivalAt, hmsText, lightTimeAt, replyAt, type DeepSpaceData } from '../lib/lighttime';
import { useJson, useNow } from '../lib/client';
import { calDate } from '../lib/dates';
import { stamp } from '../lib/passport';
import { onPicked, setPicked } from '../lib/picked';
import { PROBES, probeInfo } from '../data/probes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LiveLightView from './LiveLight';
import LightDayView from './LightDay';
import type { Message } from './MessageFlight';
import SkyChartView from './SkyChart';
import LightLeft from './LightLeft';
import BirthdayToy from './BirthdayToy';
import ChartFrame from '@/components/ui/chart-frame';
import './probe.css';

const loadFlight = () => import('./MessageFlight');
const MessageFlight = lazy(loadFlight);
const LightTimeChart = lazy(() => import('./LightTimeChart'));
const VoyagerLightChart = lazy(() => import('./VoyagerLightChart'));
const LiveLight = memo(LiveLightView);
const LightDay = memo(LightDayView);
const SkyChart = memo(SkyChartView);
const STORE = 'hullo.messages.v1';
const MAX_LEN = 80;

function readMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORE);
    const list = raw ? (JSON.parse(raw) as Message[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && typeof m.text === 'string' && typeof m.arrives === 'number') : [];
  } catch {
    return [];
  }
}

function writeMessages(list: Message[]): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(list.slice(-12)));
  } catch {
    return;
  }
}

interface FormProps {
  uid: string;
  name: string;
  onSend: (text: string) => string | null;
  children?: React.ReactNode;
}

const MessageForm = memo(function MessageForm({ uid, name, onSend, children }: FormProps) {
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim().slice(0, MAX_LEN);
    if (!text) {
      setNote('Type a message first.');
      return;
    }
    const problem = onSend(text);
    if (problem) {
      setNote(problem);
      return;
    }
    setDraft('');
    setNote('');
  }

  return (
    <form className="ps-form" onSubmit={submit} noValidate>
      {children}
      <label htmlFor={`${uid}-msg`}>Message</label>
      <div className="ps-row">
        <Input
          id={`${uid}-msg`}
          name="message"
          type="text"
          value={draft}
          maxLength={MAX_LEN}
          autoComplete="off"
          spellCheck
          aria-label={`Message to ${name}`}
          aria-describedby={`${uid}-hint`}
          onFocus={() => void loadFlight()}
          onChange={(e) => {
            setDraft(e.target.value);
            if (note) setNote('');
          }}
        />
        <Button type="submit">Send</Button>
      </div>
      <p className="ps-hint" id={`${uid}-hint`} aria-live="polite">
        {note || 'Nothing is sent.'}
      </p>
    </form>
  );
});

export interface ProbePhoto {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  id: string;
  credit: string;
  focus?: string;
}

const FRAME_SIZES = '(max-width: 900px) calc(100vw - 32px), min(50vw, 680px)';

function Frame({ photo }: { photo: ProbePhoto }) {
  return (
    <figure className="ps-frame">
      <div className="ps-stage">
        <picture>
          <source type="image/avif" srcSet={photo.avif} sizes={FRAME_SIZES} />
          <source type="image/webp" srcSet={photo.webp} sizes={FRAME_SIZES} />
          <img
            src={photo.src}
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            fetchPriority="high"
            decoding="async"
            style={{ objectPosition: photo.focus ?? '50% 50%' }}
          />
        </picture>
      </div>
      <figcaption className="credit">
        {photo.caption} <span data-credit="">{photo.id}, {photo.credit}.</span>
      </figcaption>
    </figure>
  );
}

interface Props {
  photos?: Record<string, ProbePhoto>;
  home?: boolean;
  title?: string;
  line?: string;
  initial?: string;
  picker?: 'top' | 'form';
  headline?: 'h1' | 'p';
  chart?: boolean;
  status?: boolean;
  sky?: boolean;
  countdown?: boolean;
}

export default function ProbeSignal({
  initial = 'voyager1',
  picker,
  headline = 'p',
  chart = false,
  status = false,
  sky = false,
  countdown = false,
  photos,
  home = false,
  title,
  line,
}: Props) {
  const { data, error } = useJson<DeepSpaceData>('data/deep-space.json');
  const minute = useNow(60000);
  const [probe, setProbe] = useState(initial);
  const [messages, setMessages] = useState<Message[]>([]);
  const [born, setBorn] = useState<number | null>(null);
  const uid = useId();
  const info = probeInfo(probe);

  useEffect(() => {
    setMessages(readMessages());
    const sync = (e: StorageEvent) => e.key === STORE && setMessages(readMessages());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const photo = photos?.[probe];
  const mine = useMemo(() => messages.filter((m) => m.probe === probe).slice(-3).reverse(), [messages, probe]);

  function stampProbe(key: string) {
    if (!data) return;
    const lt = lightTimeAt(data, key, Date.now());
    if (lt !== null) stamp(key, `${hmsText(lt)} of light away`);
  }

  function pick(key: string) {
    setProbe(key);
    setPicked(key);
    stampProbe(key);
  }

  useEffect(() => {
    setPicked(initial);
    return onPicked(setProbe);
  }, [initial]);

  const send = useCallback(
    (text: string): string | null => {
      if (!data) return 'The distance table is still loading. Try again in a moment.';
      const sent = Date.now();
      const arrives = arrivalAt(data, probe, sent);
      if (arrives === null) return 'This site only carries positions for 2026 and 2027.';
      const msg: Message = {
        id: `${sent}-${Math.random().toString(36).slice(2, 7)}`,
        probe,
        text,
        sent,
        arrives,
        reply: replyAt(data, probe, sent),
      };
      const next = [...readMessages(), msg];
      writeMessages(next);
      setMessages(next);
      const lt = lightTimeAt(data, probe, sent);
      if (lt !== null) stamp(probe, `${hmsText(lt)} of light away`);
      return null;
    },
    [data, probe],
  );

  const choices = (legend: string, cls: string) => (
    <fieldset className={`choices ${cls}`} aria-label={legend}>
      {PROBES.map((p) => (
        <label className="choice" key={p.key}>
          <input type="radio" name={`${uid}-probe`} value={p.key} checked={probe === p.key} onChange={() => pick(p.key)} />
          <span>{p.name}</span>
        </label>
      ))}
    </fieldset>
  );

  const form = (
    <div className="ps-main">
      <MessageForm uid={uid} name={info.name} onSend={send}>
        {picker === 'form' && choices('Send to', 'ps-to')}
      </MessageForm>
      {data && mine.length > 0 && (
        <Suspense fallback={null}>
          <MessageFlight data={data} messages={mine} />
        </Suspense>
      )}
    </div>
  );

  const statusLine = status && (
    <p className="ps-status">
      <span className={info.answers ? 'status-on' : 'status-off'}>{info.answers ? 'Still answers' : 'Silent'}</span>
      <span>
        {info.status} ({calDate(info.statusDate)})
      </span>
    </p>
  );

  return (
    <div className="ps">
      {picker === 'top' ? (
        <div className={`ps-hero${photo ? ' has-frame' : ''}`}>
          <div className="ps-hero-text page-head">
            {title && <h1>{title}</h1>}
            {line && <p>{line}</p>}
            {choices('Probe', 'ps-picker')}
            <LiveLight data={data} probe={probe} name={info.name} headline={headline} error={error} />
            {statusLine}
            <LightLeft data={data} probe={probe} name={info.name} />
            {form}
          </div>
          {photo && <Frame photo={photo} />}
        </div>
      ) : (
        <>
          <LiveLight data={data} probe={probe} name={info.name} headline={headline} error={error} speed={!home} distance={!home} />
          {statusLine}
          <div className={`ps-act${home ? ' has-side' : ''}`}>
            <div className="ps-col">
              {countdown && <LightDay data={data} />}
              {form}
            </div>
            {home && (
              <div className="ps-side">
                <BirthdayToy onPick={setBorn} />
                <ChartFrame className="ps-v1">
                  <VoyagerLightChart born={born} />
                </ChartFrame>
              </div>
            )}
          </div>
        </>
      )}

      {sky && <SkyChart highlight={probe} now={minute} />}

      {chart && data && (
        <ChartFrame className="ps-ltc">
          <LightTimeChart data={data} probe={probe} name={info.name} now={minute} />
        </ChartFrame>
      )}
    </div>
  );
}
