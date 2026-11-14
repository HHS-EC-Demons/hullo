import type { Source } from './sources';

export const GROUP_TITLE = 'Live data, the light-day and the message scale';

export const HOME_SOURCES: Source[] = [
  {
    id: 'dsn-now',
    title: 'DSN Now',
    publisher: 'NASA/JPL-Caltech',
    url: 'https://eyes.nasa.gov/apps/dsn-now/',
    dated: 'Read live in the browser every 8 s from eyes.nasa.gov/dsn/data/dsn.xml, names and dish types from eyes.nasa.gov/dsn/config.xml',
    license: 'Public NASA/JPL feed that any site may read (it sends Access-Control-Allow-Origin *). No license is stated on the feed. Shown live with the credit NASA/JPL-Caltech.',
    used: 'Which dish at Goldstone, Madrid and Canberra is receiving data from, sending commands to or in contact with which spacecraft this minute, the data rate coming down and the round trip light time when the feed gives one.',
  },
  {
    id: 'light-day-time-scale',
    title: 'Why this site and NASA agree on the light-day second',
    publisher: 'Worked out on this site from JPL Horizons, with the Horizons manual',
    url: 'https://ssd.jpl.nasa.gov/horizons/manual.html',
    dated: 'Checked 2 Nov 2026',
    license: 'A calculation from the Horizons data listed above.',
    used: 'This site asks Horizons for its daily table in UT, which is UTC. The table crosses 86,400 s of light time at 10:16:06.996 UTC on 18 Nov 2026, 4 ms before NASA’s 10:16:07 UTC, so the countdown and the live number reach one light-day in the same second. Horizons can also label times in TDB, which runs 69.184 s ahead of UTC. A query for 10:16:07 TDB is about 10:14:57.8 UTC, 69 s earlier, and returns 86,399.994 s.',
  },
  {
    id: 'nssdca-moon-fact-sheet',
    title: 'Moon Fact Sheet',
    publisher: 'NASA NSSDCA',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
    dated: 'Read 2 Nov 2026',
    license: 'NASA NSSDCA page, generally not subject to US copyright. Credit NASA.',
    used: 'The Moon’s mean distance of 384,400 km (semimajor axis 0.3844 million km), which light covers in 1.3 s, the first mark on each message line.',
  },
  {
    id: 'jpl-astro-par',
    title: 'Astrodynamic Parameters',
    publisher: 'NASA JPL Solar System Dynamics',
    url: 'https://ssd.jpl.nasa.gov/astro_par.html',
    dated: 'Read 2 Nov 2026',
    license: 'NASA JPL page. Credit NASA/JPL-Caltech.',
    used: 'The astronomical unit of 149,597,870,700 m and its light time of 499.004783836 s, the Sun mark on each message line.',
  },
];
