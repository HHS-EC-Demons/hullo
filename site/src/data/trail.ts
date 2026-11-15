export interface TrailStop {
  year: number;
  name: string;
  place: string;
  did: string;
  status: string;
  active: boolean;
  slug: string;
  alt: string;
  ratio: string;
  phoneRatio: string;
  focus: string;
  sources: string[];
}

export interface TrailPhoto {
  slug: string;
  alt: string;
}

export const TRAIL_OPEN: TrailPhoto = {
  slug: 'moon-earthrise',
  alt: 'The blue and white Earth, partly in shadow, above the grey cratered horizon of the Moon against a black sky.',
};

/**
 * The landing story, oldest first. Every year, figure and status word is
 * already on a chapter page, and `sources` names the Sources entries behind it.
 */
export const TRAIL: TrailStop[] = [
  {
    year: 1967,
    name: 'Surveyor 3',
    place: 'Moon',
    did: 'Sent 6,326 pictures',
    status: 'Last contact 1967',
    active: false,
    slug: 'silent-hero',
    alt: 'An Apollo 12 astronaut in a white suit beside the spindly Surveyor 3 lander on the Moon, with the Apollo 12 lander on the horizon.',
    ratio: '3 / 2',
    phoneRatio: '4 / 3',
    focus: '45% 50%',
    sources: ['nssdca-surveyor-3'],
  },
  {
    year: 1969,
    name: 'Apollo 11 reflector',
    place: 'Moon',
    did: 'Bounces lasers back to Earth',
    status: 'Active',
    active: true,
    slug: 'moon-a11-reflector',
    alt: 'An astronaut on the grey surface beside the Apollo 11 seismometer, with the small laser reflector behind the seismometer and the lunar module in the distance.',
    ratio: '3 / 2',
    phoneRatio: '4 / 3',
    focus: '50% 42%',
    sources: ['nssdca-lunar-sites', 'ilrs-lunar'],
  },
  {
    year: 1976,
    name: 'Viking 1',
    place: 'Mars',
    did: 'Took the first photo on Mars',
    status: 'Last contact 1982',
    active: false,
    slug: 'orbit-viking1-surface',
    alt: 'The first photo taken on Mars, rocks and sand next to one of the lander’s footpads.',
    ratio: '1400 / 498',
    phoneRatio: '3 / 2',
    focus: '100% 50%',
    sources: ['nssdca-viking-1'],
  },
  {
    year: 1977,
    name: 'Voyager 1',
    place: 'Interstellar space',
    did: 'Spotted volcanoes on Io',
    status: 'Active',
    active: true,
    slug: 'class-voyager1',
    alt: 'A white Titan Centaur rocket rising from its launch tower above a cloud of orange lit smoke.',
    ratio: '3 / 2',
    phoneRatio: '4 / 5',
    focus: '50% 22%',
    sources: ['nssdca-voyager-1', 'nasa-voyager1-mission', 'nasa-io-exploration', 'nasa-voyager-status'],
  },
  {
    year: 2021,
    name: 'Ingenuity',
    place: 'Mars',
    did: 'Planned 5 flights, flew 72',
    status: 'Last flight 2024',
    active: false,
    slug: 'mars-two-years',
    alt: 'Ingenuity, a small helicopter with two long rotor blades on four thin legs, standing on rocky reddish ground.',
    ratio: '2274 / 1360',
    phoneRatio: '4 / 3',
    focus: '45% 50%',
    sources: ['mmgis', 'nasa-ingenuity-six-things', 'ingenuity-flight-72'],
  },
];

export const TRAIL_NOW: TrailPhoto = {
  slug: 'home-dsn-goldstone',
  alt: 'A huge white dish antenna tilted toward the night sky above lit buildings in the desert.',
};

export const TRAIL_PHOTOS: string[] = [TRAIL_OPEN.slug, ...TRAIL.map((s) => s.slug), TRAIL_NOW.slug];

export function yearsLater(from: number, to: number): string {
  const n = to - from;
  return n === 1 ? '1 year later' : `${n} years later`;
}
