import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { groupInt } from '../lib/client';
import { calDate } from '../lib/dates';
import { sunGainKm, type History } from '../lib/history';

const LAUNCH_DAY = '1977-09-05';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Out = { kind: 'km'; km: number } | { kind: 'early' } | { kind: 'late' } | null;

export default function BirthdayToy({ onPick }: { onPick?: (ms: number | null) => void }) {
  const id = useId();
  const [day, setDay] = useState('');
  const [out, setOut] = useState<Out>(null);
  const [max, setMax] = useState<string | undefined>(undefined);

  useEffect(() => setMax(today()), []);

  async function change(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDay(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setOut(null);
      onPick?.(null);
      return;
    }
    const born = Date.parse(`${value}T12:00:00Z`);
    const now = Date.now();
    if (value < LAUNCH_DAY) {
      setOut({ kind: 'early' });
      onPick?.(null);
      return;
    }
    if (born > now) {
      setOut({ kind: 'late' });
      onPick?.(null);
      return;
    }
    const history = (await import('../data/probe-history.json')).default as History;
    const km = sunGainKm(history, 'voyager1', born, now);
    setOut(km === null ? null : { kind: 'km', km });
    onPick?.(km === null ? null : born);
  }

  return (
    <div className="bt">
      <label htmlFor={`${id}-day`}>Your birthday</label>
      <Input id={`${id}-day`} name="birthday" autoComplete="bday" type="date" min={LAUNCH_DAY} max={max} value={day} onChange={change} className="bt-in mono" />
      <p className="bt-out" aria-live="polite">
        {out?.kind === 'km' && (
          <>
            <span className="bt-km mono">{groupInt(out.km)} km</span> <span>farther from the Sun since then</span>
          </>
        )}
        {out?.kind === 'early' && <span>Voyager 1 left Earth on {calDate(LAUNCH_DAY)}.</span>}
        {out?.kind === 'late' && <span>Pick a day before today.</span>}
      </p>
    </div>
  );
}
