export interface ProbeInfo {
  key: string;
  name: string;
  answers: boolean;
  status: string;
  statusDate: string;
  source: string;
  lastContact?: string;
}

export const PROBES: ProbeInfo[] = [
  {
    key: 'voyager1',
    name: 'Voyager 1',
    answers: true,
    status: '2 of 10 instruments on',
    statusDate: '2026-04-17',
    source: 'nasa-voyager-status',
  },
  {
    key: 'voyager2',
    name: 'Voyager 2',
    answers: true,
    status: '3 of 10 instruments on',
    statusDate: '2026-04-17',
    source: 'nasa-voyager-status',
  },
  {
    key: 'newhorizons',
    name: 'New Horizons',
    answers: true,
    status: 'Back from a 321 day hibernation',
    statusDate: '2026-06-23',
    source: 'nasa-new-horizons-wake',
  },
  {
    key: 'pioneer10',
    name: 'Pioneer 10',
    answers: false,
    status: 'Signal last detected',
    statusDate: '2003-01-23',
    source: 'nssdca-pioneer-10',
    lastContact: 'signal was last detected',
  },
  {
    key: 'pioneer11',
    name: 'Pioneer 11',
    answers: false,
    status: 'Science and daily telemetry ceased',
    statusDate: '1995-09-30',
    source: 'nssdca-pioneer-11',
    lastContact: 'science and daily telemetry ceased',
  },
];

export function probeInfo(key: string): ProbeInfo {
  return PROBES.find((p) => p.key === key) ?? PROBES[0];
}
