import { lazy, memo, Suspense, useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { arrivalAt, hmsText, lightTimeAt, replyAt, type DeepSpaceData } from '../lib/lighttime';
import { longDate, useJson, useNow } from '../lib/client';
import { stamp } from '../lib/passport';
import { PROBES, probeInfo } from '../data/probes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LiveLightView from './LiveLight';
import LightDayView from './LightDay';
import type { Message } from './MessageFlight';
import LightTimeChartView from './LightTimeChart';
import SkyChartView from './SkyChart';
import './probe.css';

const loadFlight = () => import('./MessageFlight');
const MessageFlight = lazy(loadFlight);
const LiveLight = memo(LiveLightView);
const LightDay = memo(LightDayView);
const LightTimeChart = memo(LightTimeChartView);
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
}

const FRAME_SIZES = '(max-width: 900px) calc(100vw - 32px), min(58vw, 760px)';

function Frame({ photo }: { photo: ProbePhoto }) {
  return (
    <figure className="ps-frame">
      <div className="ps-stage">
        <picture>
          <source type="image/avif" srcSet={photo.avif} sizes={FRAME_SIZES} />
          <source type="image/webp" srcSet={photo.webp} sizes={FRAME_SIZES} />
          <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} fetchPriority="high" decoding="async" />
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
  title?: string;
  line?: string;
  initial?: string;
  picker?: 'top' | 'form';
  headline?: 'h1' | 'p';
  chart?: boolean;
  status?: boolean;
  aside?: string;
  sky?: boolean;
  countdown?: boolean;
}

export default function ProbeSignal({
  initial = 'voyager1',
  picker,
  headline = 'p',
  chart = false,
  status = false,
  aside,
  sky = false,
  countdown = false,
  photos,
  title,
  line,
}: Props) {
  const { data, error } = useJson<DeepSpaceData>('data/deep-space.json');
  const minute = useNow(60000);
  const [probe, setProbe] = useState(initial);
  const [messages, setMessages] = useState<Message[]>([]);
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
    stampProbe(key);
  }

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

  return (
    <div className="ps">
      {picker === 'top' && (
        <div className={`ps-hero${photo ? ' has-frame' : ''}`}>
          <div className="ps-hero-text page-head">
            {title && <h1>{title}</h1>}
            {line && <p>{line}</p>}
            {choices('Probe', 'ps-picker')}
          </div>
          {photo && <Frame photo={photo} />}
        </div>
      )}

      <LiveLight data={data} probe={probe} name={info.name} headline={headline} error={error} />

      {status && (
        <p className="ps-status">
          <span className={info.answers ? 'status-on' : 'status-off'}>{info.answers ? 'Still answers' : 'Silent'}</span>
          <span>
            {info.status} ({longDate(Date.parse(`${info.statusDate}T12:00:00Z`))})
          </span>
        </p>
      )}

      {countdown && <LightDay data={data} />}

      <div className={`ps-act${aside ? ' has-aside' : ''}`}>
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
        {aside && <p className="ps-aside">{aside}</p>}
      </div>

      {sky && <SkyChart highlight={probe} now={minute} />}

      {chart && data && <LightTimeChart data={data} probe={probe} name={info.name} now={minute} />}
    </div>
  );
}
