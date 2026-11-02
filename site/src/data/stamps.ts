import { PROBES } from './probes';
import { SILENT } from './silent';

export type StampGroup = 'deep-space' | 'moon' | 'mars' | 'orbit' | 'silent';

export interface StampObject {
  id: string;
  name: string;
  group: StampGroup;
  page: string;
  hint: string;
}

export const GROUPS: { key: StampGroup; title: string }[] = [
  { key: 'deep-space', title: 'Deep space' },
  { key: 'moon', title: 'Moon' },
  { key: 'mars', title: 'Mars' },
  { key: 'orbit', title: 'Orbit' },
  { key: 'silent', title: 'Silent' },
];

const probes: StampObject[] = PROBES.map((p) => ({
  id: p.key,
  name: p.name,
  group: 'deep-space',
  page: 'deep-space/',
  hint: p.answers ? `Pick ${p.name} on Deep space, or send a message.` : `Pick ${p.name} on Deep space.`,
}));

const ORBIT_TOO = new Set(['insight', 'spirit', 'opportunity', 'viking1', 'viking2', 'phoenix']);

const reflectors: StampObject[] = [
  { id: 'a11', name: 'Apollo 11 reflector' },
  { id: 'a14', name: 'Apollo 14 reflector' },
  { id: 'a15', name: 'Apollo 15 reflector' },
  { id: 'l1', name: 'Lunokhod 1 reflector' },
  { id: 'l2', name: 'Lunokhod 2 reflector' },
].map((r) => ({
  ...r,
  group: 'moon' as const,
  page: 'moon/',
  hint: `Fire the laser at the ${r.name} on Moon.`,
}));

const mars: StampObject[] = [
  { id: 'ingenuity', name: 'Ingenuity', group: 'mars', page: 'mars/', hint: 'Pick one of Ingenuity’s flights on Mars.' },
];

const orbit: StampObject[] = ['11', '12', '14', '15', '16', '17'].map((n) => ({
  id: `apollo${n}`,
  name: `Apollo ${n} landing site`,
  group: 'orbit',
  page: 'orbit/',
  hint: `Open the Apollo ${n} site on Orbit.`,
}));

const taken = new Set(probes.map((p) => p.id));

const silent: StampObject[] = SILENT.filter((s) => !taken.has(s.id)).map((s) => ({
  id: s.id,
  name: s.name,
  group: 'silent',
  page: 'silent/',
  hint: ORBIT_TOO.has(s.id)
    ? `Pick ${s.name} on the Silent timeline, or open the ${s.name} site on Orbit.`
    : `Pick ${s.name} on the Silent timeline.`,
}));

export const STAMP_OBJECTS: StampObject[] = [...probes, ...reflectors, ...mars, ...orbit, ...silent];

export const STAMP_TOTAL = STAMP_OBJECTS.length;

export function stampObject(id: string): StampObject | undefined {
  return STAMP_OBJECTS.find((o) => o.id === id);
}
