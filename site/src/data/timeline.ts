import { PROBES } from './probes';
import { SILENT } from './silent';

export interface Lifeline {
  id: string;
  name: string;
  place: string;
  start: string;
  startKind: 'Launched' | 'Turned on' | 'Placed';
  end: string | null;
  endKind: string;
  answers: boolean;
  sources: string[];
}

export interface ReflectorInfo {
  id: string;
  name: string;
  nasa: boolean;
  placed: string;
  source: string;
}

export const TIMELINE_START = '1966-01-01';

const LAUNCHES: Record<string, { start: string; source: string }> = {
  voyager1: { start: '1977-09-05', source: 'nssdca-voyager-1' },
  voyager2: { start: '1977-08-20', source: 'nssdca-voyager-2' },
  newhorizons: { start: '2006-01-19', source: 'nssdca-new-horizons' },
};

/**
 * One line per object for the "When the hardware went quiet" timeline: the silent
 * hardware, the probes that still answer and the NASA laser reflectors,
 * oldest start first.
 */
export function lifelines(reflectors: ReflectorInfo[]): Lifeline[] {
  const silent: Lifeline[] = SILENT.map((s) => ({
    id: s.id,
    name: s.name,
    place: s.place,
    start: s.start,
    startKind: s.startKind,
    end: s.date,
    endKind: s.statusLine,
    answers: false,
    sources: s.sources,
  }));
  const probes: Lifeline[] = PROBES.filter((p) => p.answers && LAUNCHES[p.key]).map((p) => ({
    id: p.key,
    name: p.name,
    place: 'Deep space',
    start: LAUNCHES[p.key].start,
    startKind: 'Launched',
    end: null,
    endKind: 'Still answers',
    answers: true,
    sources: [LAUNCHES[p.key].source, p.source],
  }));
  const mirrors: Lifeline[] = reflectors
    .filter((r) => r.nasa)
    .map((r) => ({
      id: r.id,
      name: `${r.name} reflector`,
      place: 'Moon',
      start: r.placed,
      startKind: 'Placed',
      end: null,
      endKind: 'Still returns laser pulses',
      answers: true,
      sources: [r.source, 'ilrs-lunar'],
    }));
  return [...silent, ...probes, ...mirrors].sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
}

export function dayMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export interface Span {
  years: number;
  months: number;
}

/** Whole calendar years and months from `fromMs` to `toMs`, in UTC. */
export function span(fromMs: number, toMs: number): Span {
  const a = new Date(fromMs);
  const b = new Date(toMs);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

export function spanText({ years, months }: Span): string {
  const y = years === 1 ? '1 year' : `${years} years`;
  const m = months === 1 ? '1 month' : `${months} months`;
  if (years === 0) return months === 0 ? 'less than a month' : m;
  return months === 0 ? y : `${y} ${m}`;
}
