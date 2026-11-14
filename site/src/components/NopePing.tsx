import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { arrivalAt, type DeepSpaceData } from '../lib/lighttime';
import { loadJson } from '../lib/client';
import { localStamp } from '../lib/dates';

export default function NopePing() {
  const [arrives, setArrives] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  async function ping() {
    try {
      const data = await loadJson<DeepSpaceData>('data/deep-space.json');
      const at = arrivalAt(data, 'voyager1', Date.now());
      setFailed(at === null);
      setArrives(at);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="nope-ping">
      <Button variant="secondary" onClick={ping}>
        Ping
      </Button>
      <p className="nope-ping-out" aria-live="polite">
        {arrives !== null && <>Arrives {localStamp(arrives, { label: false })}</>}
        {failed && 'No data'}
      </p>
    </div>
  );
}
