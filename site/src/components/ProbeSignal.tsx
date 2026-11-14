import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { arrivalAt, pad2, rangeAt, splitHms, hmsText, type DeepSpaceData } from '../lib/lighttime';
import { km, localDate, localTime, longDate, useJson, useNow } from '../lib/client';
import { PROBES, probeInfo } from '../data/probes';
import LightTimeChart from './LightTimeChart';
import './probe.css';

interface Message {
  id: string;
  probe: string;
  text: string;
  sent: number;
  arrives: number;
}

const STORE = 'hullo.messages.v1';
const MAX_LEN = 80;

function readMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORE);
    const list = raw ? (JSON.parse(raw) as Message[]) : [];
    return Array.isArray(list) ? list.filter((m) => m && typeof m.text === 'string') : [];
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
  picker?: boolean;
  headline?: 'h1' | 'p';
  chart?: boolean;
  status?: boolean;
  aside?: string;
}

export default function ProbeSignal({ initial = 'voyager1', picker = false, headline = 'p', chart = false, status = false, aside }: Props) {
  const { data, error } = useJson<DeepSpaceData>('data/deep-space.json');
  const now = useNow(1000);
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

  const range = data && now ? rangeAt(data, probe, now) : null;
  const lt = range && data ? range.rg_km / data.c_km_s : null;
  const parts = lt !== null ? splitHms(lt) : null;
  const ready = parts !== null;

  const mine = useMemo(() => messages.filter((m) => m.probe === probe).slice(-3).reverse(), [messages, probe]);

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim().slice(0, MAX_LEN);
    if (!text) {
      setNote('Type a message first.');
      return;
    }
    if (!data) return;
    const sent = Date.now();
    const arrives = arrivalAt(data, probe, sent);
    if (arrives === null) {
      setNote('This site only carries positions for 2026 and 2027.');
      return;
    }
    const msg: Message = { id: `${sent}-${Math.random().toString(36).slice(2, 7)}`, probe, text, sent, arrives };
    const next = [...readMessages(), msg];
    writeMessages(next);
    setMessages(next);
    setDraft('');
    setNote('');
  }

  const Head = headline;

  return (
    <div className="ps">
      {picker && (
        <fieldset className="choices ps-picker">
          <legend>Probe</legend>
          {PROBES.map((p) => (
            <label className="choice" key={p.key}>
              <input
                type="radio"
                name={`${uid}-probe`}
                value={p.key}
                checked={probe === p.key}
                onChange={() => setProbe(p.key)}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </fieldset>
      )}

      <Head className="ps-claim">
        <span className="ps-lead">{info.name} is</span>
        <span className={`ps-big mono${ready ? '' : ' pending'}`} aria-hidden={!ready}>
          {parts ? (
            <>
              {parts.h}
              <span className="u">h</span>
              {pad2(parts.m)}
              <span className="u">min</span>
              {pad2(parts.s)}
              <span className="u last">s</span>
            </>
          ) : (
            <>
              00<span className="u">h</span>00<span className="u">min</span>00<span className="u last">s</span>
            </>
          )}
        </span>
        {!ready && <span className="sr-only">{probe === 'voyager1' ? 'about a day' : 'many hours'}</span>}
        <span className="ps-lead">of light away from you right now.</span>
      </Head>

      <p className="ps-km">
        <span className="mono ps-km-n">{range ? `${km.format(range.rg_km)} km` : '\u2007'}</span>
        <span className="ps-km-l">
          {range
            ? `from Earth's center, ${Math.abs(range.rr_km_s).toFixed(2)} km ${range.rr_km_s >= 0 ? 'farther' : 'closer'} each second`
            : error
              ? 'Distance data did not load. Reload the page to try again.'
              : '\u2007'}
        </span>
      </p>

      {status && (
        <p className="ps-status">
          <span className={info.answers ? 'status-on' : 'status-off'}>{info.answers ? 'Still answers' : 'Silent'}</span>
          <span>
            {info.status} ({longDate(Date.parse(`${info.statusDate}T12:00:00Z`))})
          </span>
        </p>
      )}

      <div className={`ps-act${aside ? ' has-aside' : ''}`}>
      <div className="ps-main">
      <form className="ps-form" onSubmit={send} noValidate>
        <label htmlFor={`${uid}-msg`}>Message to {info.name}</label>
        <div className="ps-row">
          <input
            id={`${uid}-msg`}
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
          <button className="btn" type="submit" disabled={!data}>
            Send
          </button>
        </div>
        <p className="ps-hint" id={`${uid}-hint`} aria-live="polite">
          {note ||
            (info.answers
              ? `Up to ${MAX_LEN} characters. Saved only on this device.`
              : `${info.name} no longer answers, but your message still gets there. Saved only on this device.`)}
        </p>
      </form>
      {mine.length > 0 && now && (
        <ol className="trail" aria-label={`Messages to ${info.name}`}>
          {mine.map((m) => {
            const total = m.arrives - m.sent;
            const done = now >= m.arrives;
            const frac = done ? 1 : Math.max(0, Math.min(1, (now - m.sent) / total));
            return (
              <li key={m.id} className="trail-item">
                <p className="trail-text">{m.text}</p>
                <div className="trail-line" aria-hidden="true">
                  <span className="trail-end">Earth</span>
                  <span className="trail-track">
                    <span className="trail-pulse" style={{ left: `${(frac * 100).toFixed(3)}%` }} />
                  </span>
                  <span className="trail-end">{info.name}</span>
                </div>
                <p className="trail-when">
                  {done ? 'Arrived ' : 'Arrives '}
                  <span className="mono">
                    {localDate(m.arrives)}, {localTime(m.arrives)}
                  </span>
                  {!done && (
                    <>
                      , in <span className="mono trail-left">{hmsText((m.arrives - now) / 1000)}</span>
                    </>
                  )}
                  <span className="sr-only">. {Math.round(frac * 100)} percent of the way.</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
      </div>
      {aside && <p className="ps-aside">{aside}</p>}
      </div>

      {chart && data && <LightTimeChart data={data} probe={probe} name={info.name} now={now} />}
    </div>
  );
}
