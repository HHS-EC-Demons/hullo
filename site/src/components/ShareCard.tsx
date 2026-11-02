import type { Ref } from 'react';
import { hmsText } from '../lib/lighttime';
import { WORDMARK } from '../brand';

export interface CardMessage {
  id: string;
  probe: string;
  name: string;
  text: string;
  sent: number;
  arrives: number;
  silent?: string;
}

const stamp = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

const SITE = 'hhs-ec-demons.github.io/hullo';

export default function ShareCard({ msg, ref }: { msg: CardMessage; ref: Ref<HTMLDivElement> }) {
  const trip = hmsText((msg.arrives - msg.sent) / 1000);
  return (
    <div ref={ref} className="sc">
      <div className="sc-top">
        <span className="sc-word" translate="no">
          {WORDMARK}
        </span>
        <span className="sc-to">Message to {msg.name}</span>
      </div>
      <p className="sc-msg">{msg.text}</p>
      <div className="sc-line">
        <span>Earth</span>
        <span className="sc-rule">
          <span className="sc-pulse" />
        </span>
        <span>{msg.name}</span>
      </div>
      <p className="sc-trip mono">{trip} at the speed of light</p>
      {msg.silent && <p className="sc-silent">{msg.silent}</p>}
      <div className="sc-times mono">
        <span>Sent {stamp.format(msg.sent)} UTC</span>
        <span>Arrives {stamp.format(msg.arrives)} UTC</span>
      </div>
      <p className="sc-foot">
        Distance from JPL Horizons. Not transmitted, kept on one device. {SITE}
      </p>
    </div>
  );
}
