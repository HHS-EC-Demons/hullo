import type { Ref } from 'react';
import { hmsText } from '../lib/lighttime';
import { WORDMARK } from '../brand';
import { calDate, clock } from '../lib/dates';

export interface CardMessage {
  id: string;
  probe: string;
  name: string;
  text: string;
  sent: number;
  arrives: number;
  silent?: string;
}

function stamp(ms: number): string {
  const d = new Date(ms);
  return `${clock(ms)} ${calDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)}`;
}

const SITE = 'hhs-ec-demons.github.io/hullo';

export default function ShareCard({ msg, ref }: { msg: CardMessage; ref: Ref<HTMLDivElement> }) {
  const trip = hmsText((msg.arrives - msg.sent) / 1000);
  return (
    <div ref={ref} className="shc">
      <div className="shc-top">
        <span className="shc-word" translate="no">
          {WORDMARK}
        </span>
        <span className="shc-to">Message to {msg.name}</span>
      </div>
      <p className="shc-msg">{msg.text}</p>
      <div className="shc-line">
        <span>Earth</span>
        <span className="shc-rule">
          <span className="shc-pulse" />
        </span>
        <span>{msg.name}</span>
      </div>
      <p className="shc-trip mono">{trip} at the speed of light</p>
      {msg.silent && <p className="shc-silent">{msg.silent}</p>}
      <div className="shc-times mono">
        <span>Sent {stamp(msg.sent)}</span>
        <span>Arrives {stamp(msg.arrives)}</span>
      </div>
      <p className="shc-foot">
        Times in the sender’s time zone. Distance from JPL Horizons. Not transmitted, kept on one device. {SITE}
      </p>
    </div>
  );
}
