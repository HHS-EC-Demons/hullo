import { dayMs, TIMELINE_START, type Lifeline } from '../data/timeline';

export interface QuietEvent {
  ms: number;
  id: string;
  name: string;
  kind: string;
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
 * Every launch, switch on, placement and last contact in `lines`, oldest
 * first, each with the number of objects still answering just after it.
 */
export function quietEvents(lines: Lifeline[]): QuietEvent[] {
  const raw: Omit<QuietEvent, 'count'>[] = [];
  for (const l of lines) {
    raw.push({ ms: dayMs(l.start), id: l.id, name: l.name, kind: VERB[l.startKind] ?? l.startKind.toLowerCase() });
    if (l.end) raw.push({ ms: dayMs(l.end), id: l.id, name: l.name, kind: 'went quiet' });
  }
  raw.sort((a, b) => a.ms - b.ms || (a.kind === 'went quiet' ? 1 : -1));
  let count = 0;
  return raw.map((e) => {
    count += e.kind === 'went quiet' ? -1 : 1;
    return { ...e, count };
  });
}

/** The answering count as a step series from the timeline start to `nowMs`. */
export function quietSteps(events: QuietEvent[], nowMs: number): QuietStep[] {
  const out: QuietStep[] = [{ ms: dayMs(TIMELINE_START), count: 0 }];
  for (const e of events) out.push({ ms: e.ms, count: e.count });
  out.push({ ms: Math.max(nowMs, out[out.length - 1].ms), count: events.length ? events[events.length - 1].count : 0 });
  return out;
}

/** How many of `lines` were answering on the day `iso` ("2014-06-01"). */
export function answeringOn(lines: Lifeline[], iso: string): number {
  return lines.filter((l) => l.start <= iso && (l.end === null || l.end > iso)).length;
}
