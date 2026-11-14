import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { arrivalAt, hmsText, lightTimeAt, replyAt, type DeepSpaceData } from '../lib/lighttime';
import { longDate, useJson, useNow } from '../lib/client';
import { stamp } from '../lib/passport';
import { PROBES, probeInfo } from '../data/probes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LiveLight from './LiveLight';
import LightDay from './LightDay';
import MessageFlight, { type Message } from './MessageFlight';
import LightTimeChart from './LightTimeChart';
import SkyChart from './SkyChart';
import './probe.css';

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

interface Props {
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
}: Props) {
  const { data, error } = useJson<DeepSpaceData>('data/deep-space.json');
  const minute = useNow(60000);
  const [probe, setProbe] = useState(initial);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [note, setNote] = useState('');
  const uid = useId();
  const info = probeInfo(probe);

  useEffect(() => {
    setMessages(readMessages());
    const sync = (e: StorageEvent) => e.key === STORE && setMessages(readMessages());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const mine = useMemo(() => messages.filter((m) => m.probe === probe).slice(-3).reverse(), [messages, probe]);

  function stampProbe(key: string) {
    if (!data) return;
    const lt = lightTimeAt(data, key, Date.now());
    if (lt !== null) stamp(key, `${hmsText(lt)} of light away`);
  }

  function pick(key: string) {
    setProbe(key);
    setNote('');
    stampProbe(key);
  }

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim().slice(0, MAX_LEN);
    if (!text) {
      setNote('Type a message first.');
      return;
    }
    if (!data) {
      setNote('The distance table is still loading. Try again in a moment.');
      return;
    }
    const sent = Date.now();
    const arrives = arrivalAt(data, probe, sent);
    if (arrives === null) {
      setNote('This site only carries positions for 2026 and 2027.');
      return;
    }
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
    setDraft('');
    setNote('');
    stampProbe(probe);
  }

  const choices = (legend: string, cls: string) => (
    <fieldset className={`choices ${cls}`}>
      <legend>{legend}</legend>
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
      {picker === 'top' && choices('Probe', 'ps-picker')}

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
          <form className="ps-form" onSubmit={send} noValidate>
            {picker === 'form' && choices('Send to', 'ps-to')}
            <label htmlFor={`${uid}-msg`}>Message to {info.name}</label>
            <div className="ps-row">
              <Input
                id={`${uid}-msg`}
                name="message"
                type="text"
                value={draft}
                maxLength={MAX_LEN}
                autoComplete="off"
                spellCheck
                aria-describedby={`${uid}-hint`}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (note) setNote('');
                }}
              />
              <Button type="submit">Send</Button>
            </div>
            <p className="ps-hint" id={`${uid}-hint`} aria-live="polite">
              {note || `Up to ${MAX_LEN} characters. Nothing is transmitted. The message stays on this device.`}
            </p>
          </form>
          {data && <MessageFlight data={data} messages={mine} />}
        </div>
        {aside && <p className="ps-aside">{aside}</p>}
      </div>

      {sky && <SkyChart highlight={probe} now={minute} />}

      {chart && data && <LightTimeChart data={data} probe={probe} name={info.name} now={minute} />}
    </div>
  );
}
