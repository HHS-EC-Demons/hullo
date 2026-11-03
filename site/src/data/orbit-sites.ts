export interface OrbitView {
  slug: string;
  alt: string;
  by: string;
}

export interface OrbitSite {
  id: string;
  name: string;
  body: 'Moon' | 'Mars';
  landed: string;
  lat: number;
  lon: number;
  coords: string;
  look: string;
  then: OrbitView;
  now: OrbitView;
  pair?: boolean;
  sound?: string;
}

export const ORBIT_SITES: OrbitSite[] = [
  {
    id: 'apollo11',
    name: 'Apollo 11',
    body: 'Moon',
    landed: '1969-07-20',
    lat: 0.67416,
    lon: 23.47314,
    coords: 'NSSDCA',
    look: 'The ring marks the lunar module’s lower half, left in 1969.',
    then: { slug: 'orbit-apollo11-surface', by: 'Apollo 11 crew', alt: 'The lunar module Eagle on the grey surface, with an astronaut unpacking experiments beside the module.' },
    now: { slug: 'orbit-apollo11-lro', by: 'LRO', alt: 'The Apollo 11 site from straight above, a cratered grey plain with the lunar module’s shadow inside the ring.' },
  },
  {
    id: 'apollo12',
    name: 'Apollo 12',
    body: 'Moon',
    landed: '1969-11-19',
    lat: -3.0128,
    lon: -23.4219,
    coords: 'NSSDCA',
    look: 'Dark paths are the crew’s walks around the lunar module.',
    then: { slug: 'orbit-apollo12-surface', by: 'Apollo 12 crew', alt: 'The robot lander Surveyor 3 in front with an astronaut beside Surveyor 3, and the Apollo 12 lunar module in the distance.' },
    now: { slug: 'orbit-apollo12-lro', by: 'LRO', alt: 'The Apollo 12 site from straight above, with dark footpaths around the lunar module inside the ring.' },
  },
  {
    id: 'apollo14',
    name: 'Apollo 14',
    body: 'Moon',
    landed: '1971-02-05',
    lat: -3.64589,
    lon: -17.47194,
    coords: 'NSSDCA',
    look: 'The dark line heading west is the crew’s footpath.',
    then: { slug: 'orbit-apollo14-surface', by: 'Apollo 14 crew', alt: 'The Apollo 14 lunar module on the surface, the flag nearby and the folded laser reflector at the foot of the ladder.' },
    now: { slug: 'orbit-apollo14-lro', by: 'LRO', alt: 'The Apollo 14 site from straight above, a dark trail of footprints running west from the lunar module inside the ring.' },
  },
  {
    id: 'apollo15',
    name: 'Apollo 15',
    body: 'Moon',
    landed: '1971-07-30',
    lat: 26.13239,
    lon: 3.6333,
    coords: 'NSSDCA',
    look: 'Rover tracks and footpaths lead away from the lunar module.',
    then: { slug: 'orbit-apollo15-surface', by: 'Apollo 15 crew', alt: 'The lunar module Falcon on the left and an astronaut at the lunar rover, with mountains behind.' },
    now: { slug: 'orbit-apollo15-lro', by: 'LRO', alt: 'The Apollo 15 site from straight above, rover tracks and footpaths around the lunar module inside the ring.' },
  },
  {
    id: 'apollo16',
    name: 'Apollo 16',
    body: 'Moon',
    landed: '1972-04-21',
    lat: -8.9734,
    lon: 15.5011,
    coords: 'NSSDCA',
    look: 'The lunar module is the bright dot inside the ring.',
    then: { slug: 'orbit-apollo16-surface', by: 'Apollo 16 crew', alt: 'The lunar module Orion standing on bright ground at the Descartes site.' },
    now: { slug: 'orbit-apollo16-lro', by: 'LRO', alt: 'The Apollo 16 site from straight above, a bright lunar module inside the ring and dark trails to the southwest.' },
  },
  {
    id: 'apollo17',
    name: 'Apollo 17',
    body: 'Moon',
    landed: '1972-12-11',
    lat: 20.1911,
    lon: 30.7723,
    coords: 'NSSDCA',
    look: 'Rover tracks lead back to the lunar module.',
    then: { slug: 'orbit-apollo17-surface', by: 'Apollo 17 crew', alt: 'An astronaut beside the flag, with the lunar module on the left and the lunar rover on the right.' },
    now: { slug: 'orbit-apollo17-lro', by: 'LRO', alt: 'The Apollo 17 site from straight above, rover tracks leading to the lunar module inside the ring.' },
  },
  {
    id: 'viking1',
    name: 'Viking 1',
    body: 'Mars',
    landed: '1976-07-20',
    lat: 22.27,
    lon: 312.05,
    coords: 'NSSDCA',
    look: 'Viking Lander 1, about 3 m wide, still sits where it landed.',
    then: { slug: 'orbit-viking1-surface', by: 'Viking Lander 1', alt: 'The first photo taken on Mars, rocks and sand next to one of the lander’s footpads.' },
    now: { slug: 'orbit-viking1-hirise', by: 'HiRISE', alt: 'Viking Lander 1 from orbit, a small spot about 3 m wide on rocky ground.' },
  },
  {
    id: 'viking2',
    name: 'Viking 2',
    body: 'Mars',
    landed: '1976-09-03',
    lat: 47.6673,
    lon: 134.2809,
    coords: 'NSSDCA',
    look: 'Viking Lander 2, about 3 m wide, sits on cracked ground.',
    then: { slug: 'orbit-viking2-surface', by: 'Viking Lander 2', alt: 'Reddish rocky ground under a pink sky, the first color photo from Viking Lander 2.' },
    now: { slug: 'orbit-viking2-hirise', by: 'HiRISE', alt: 'Viking Lander 2 from orbit, a small spot about 3 m wide on pitted ground.' },
  },
  {
    id: 'spirit',
    name: 'Spirit',
    body: 'Mars',
    landed: '2004-01-04',
    lat: -14.5692,
    lon: 175.4729,
    coords: 'PDS Geosciences',
    look: 'Spirit’s solar panels make it the brightest spot here.',
    then: { slug: 'orbit-spirit-surface', by: 'Spirit', alt: 'Spirit’s first color view of Gusev crater, a flat reddish plain with small rocks.' },
    now: { slug: 'orbit-spirit-hirise', by: 'HiRISE', alt: 'Spirit as a bright dot beside the pale oval plateau called Home Plate.' },
  },
  {
    id: 'opportunity',
    name: 'Opportunity',
    body: 'Mars',
    landed: '2004-01-25',
    lat: -1.946,
    lon: 354.473,
    coords: 'NSSDCA',
    look: 'The empty lander sits in the middle of Eagle crater.',
    then: { slug: 'orbit-opportunity-surface', by: 'Opportunity', alt: 'The empty lander that carried Opportunity, seen from the rover’s rear hazard camera.' },
    now: { slug: 'orbit-opportunity-hirise', by: 'HiRISE', alt: 'Eagle crater from orbit, with Opportunity’s lander a bright spot inside the crater and the backshell and parachute to the lower left.' },
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    body: 'Mars',
    landed: '2008-05-25',
    lat: 68.22,
    lon: 234.25,
    coords: 'PDS Geosciences',
    look: 'Slide across to see dust cover the lander by 2017.',
    pair: true,
    then: { slug: 'orbit-phoenix-2008', by: 'HiRISE', alt: 'The Phoenix site from orbit in 2008, three dark patches where the lander, heat shield and backshell landed.' },
    now: { slug: 'orbit-phoenix-2017', by: 'HiRISE', alt: 'The same Phoenix site in 2017, the dark patches mostly covered by pale dust.' },
  },
  {
    id: 'insight',
    name: 'InSight',
    body: 'Mars',
    landed: '2018-11-26',
    lat: 4.495,
    lon: 135.623,
    coords: 'HiRISE image center',
    look: 'Dust covers the dark patch the landing rockets made.',
    sound: 'insight-quake',
    then: { slug: 'orbit-insight-2018', by: 'HiRISE', alt: 'InSight from orbit two weeks after landing, a bright spot inside the dark patch its landing rockets blew clear.' },
    now: { slug: 'orbit-insight-2024', by: 'HiRISE', alt: 'InSight from orbit in October 2024, the dark patch faded and the lander reddish with dust.' },
  },
];
