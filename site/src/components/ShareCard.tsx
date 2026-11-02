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
        <span>Sent {stamp.format(msg.sent)} UTC</span>
        <span>Arrives {stamp.format(msg.arrives)} UTC</span>
      </div>
      <p className="shc-foot">
        Distance from JPL Horizons. Not transmitted, kept on one device. {SITE}
      </p>
    </div>
  );
}
