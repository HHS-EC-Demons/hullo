import marsLight from '../../public/data/mars-light.json';

export type StopKey = 'moon' | 'mars' | 'orbit' | 'deep-space' | 'silent';

export interface Stop {
  key: StopKey;
  path: string;
  name: string;
  slug: string;
  focus: string;
  alt: string;
}

export const JOURNEY: Stop[] = [
  {
    key: 'moon',
    path: 'moon/',
    name: 'Moon',
    slug: 'moon-laser-station',
    focus: '50% 0%',
    alt: 'Two green laser beams rising from an observatory into a dark blue night sky toward the bright Moon.',
  },
  {
    key: 'mars',
    path: 'mars/',
    name: 'Mars',
    slug: 'mars-two-years',
    focus: '45% 50%',
    alt: 'Ingenuity, a small helicopter with two long rotor blades on four thin legs, standing on rocky reddish ground.',
  },
  {
    key: 'orbit',
    path: 'orbit/',
    name: 'Orbit',
    slug: 'home-orbit-apollo14',
    focus: '50% 50%',
    alt: 'The Apollo 14 landing site seen from lunar orbit, with the lunar module and the crew’s paths.',
  },
  {
    key: 'deep-space',
    path: 'deep-space/',
    name: 'Deep space',
    slug: 'deep-newhorizons',
    focus: '50% 50%',
    alt: 'Pluto in enhanced color, with its pale heart shaped glacier.',
  },
  {
    key: 'silent',
    path: 'silent/',
    name: 'Silent',
    slug: 'silent-surveyor3',
    focus: '50% 50%',
    alt: 'Surveyor 3 on the slope of its small crater, photographed by the Apollo 12 crew.',
  },
];

const MARS = marsLight as { start: string; step_days: number; minutes: number[] };

export function marsMinutes(ms: number): number | null {
  const day = Math.floor((ms - Date.parse(`${MARS.start}T00:00:00Z`)) / 86400000);
  const v = MARS.minutes[day];
  return v === undefined ? null : v;
}

export function hulloTime(key: StopKey, ms: number): string {
  if (key === 'moon') return '1.3 s';
  if (key === 'mars') {
    const m = marsMinutes(ms);
    return m === null ? 'minutes' : `${Math.round(m)} min`;
  }
  if (key === 'orbit') return 'from above';
  if (key === 'deep-space') return '1 day';
  return 'no reply';
}

export function nextStop(key: StopKey): Stop | null {
  const i = JOURNEY.findIndex((s) => s.key === key);
  return i >= 0 && i < JOURNEY.length - 1 ? JOURNEY[i + 1] : null;
}
