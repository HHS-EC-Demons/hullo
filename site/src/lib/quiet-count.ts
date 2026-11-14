import { dayMs, TIMELINE_START, type Lifeline } from '../data/timeline';

export interface QuietEvent {
  ms: number;
  id: string;
  name: string;
  kind: string;
  end: boolean;
  count: number;
}

export interface QuietStep {
  ms: number;
  count: number;
}

const VERB: Record<string, string> = {
  Launched: 'launched',
  'Turned on': 'turned on',
  Placed: 'placed',
};

/**
 * Every launch, switch on, placement, last contact and mission end in
 * `lines`, oldest first, each with the number of objects active just after it.
 */
export function quietEvents(lines: Lifeline[]): QuietEvent[] {
  const raw: Omit<QuietEvent, 'count'>[] = [];
  for (const l of lines) {
    raw.push({ ms: dayMs(l.start), id: l.id, name: l.short, kind: VERB[l.startKind] ?? l.startKind.toLowerCase(), end: false });
    if (l.end) raw.push({ ms: dayMs(l.end), id: l.id, name: l.short, kind: l.endKind.toLowerCase(), end: true });
  }
  raw.sort((a, b) => a.ms - b.ms || (a.end ? 1 : -1));
  let count = 0;
  return raw.map((e) => {
    count += e.end ? -1 : 1;
    return { ...e, count };
  });
}

/** The active count as a step series from the timeline start to `nowMs`. */
export function quietSteps(events: QuietEvent[], nowMs: number): QuietStep[] {
  const out: QuietStep[] = [{ ms: dayMs(TIMELINE_START), count: 0 }];
  for (const e of events) out.push({ ms: e.ms, count: e.count });
  out.push({ ms: Math.max(nowMs, out[out.length - 1].ms), count: events.length ? events[events.length - 1].count : 0 });
  return out;
}

