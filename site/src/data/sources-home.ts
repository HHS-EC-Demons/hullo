import type { Source } from './sources';
import probePhotos from './probe-photos.json';
import homeImages from './home-images.json';

const homeList = Object.values(homeImages as Record<string, { id: string; credit: string; caption: string; when: string; kind: string }>)
  .map((m) => `${m.id} (${m.credit}), ${m.caption}, ${m.kind === 'released' ? 'released ' : ''}${m.when}`)
  .join('. ');

export const GROUP_TITLE = 'Live data, the light-day and the message scale';

export const HOME_SOURCES: Source[] = [
  {
    id: 'dsn-now',
    title: 'DSN Now',
    publisher: 'NASA/JPL-Caltech',
    url: 'https://eyes.nasa.gov/apps/dsn-now/',
    dated: 'Read live in the browser every 8 s from eyes.nasa.gov/dsn/data/dsn.xml, names and dish types from eyes.nasa.gov/dsn/config.xml',
    license: 'Public NASA/JPL feed that any site may read (the feed sends Access-Control-Allow-Origin *). No license is stated on the feed. Shown live with the credit NASA/JPL-Caltech.',
    used: 'What the dishes at Goldstone, Madrid and Canberra are doing this minute, and the feed time.',
    note: 'The feed lists every dish with its activity and its signals. For each complex the home page shows one dish with an active signal and the spacecraft on it, plus a count of the other dishes in contact. A complex with no active signal shows its dish numbers and the activity the feed gives them, such as Engineering Sustaining. When a spacecraft name runs past two words the page shows the feed code instead, such as KPLO for the Korea Pathfinder Lunar Orbiter. Voyager 1, Voyager 2 and New Horizons are listed first and marked with a lilac rule. The feed time is shown in the visitor’s own time zone.',
  },
  {
    id: 'light-time-method',
    title: 'How the light time and message times are worked out',
    publisher: 'Worked out on this site from JPL Horizons, with the Horizons manual',
    url: 'https://ssd.jpl.nasa.gov/horizons/manual.html',
    dated: 'Checked 2 Nov 2026',
    license: 'A calculation from the Horizons data listed above.',
    used: 'The live light time on the home and Deep space pages, the light-day countdown, the message arrival and reply times and the clock of when the light reaching Earth now left the probe.',
    note: 'Light time here is the straight-line distance from Earth’s center at this instant, divided by the speed of light. NASA’s one light-day date uses the same convention. Horizons observer tables print a few seconds less, because they give the probe’s position when the light now arriving left the probe. A message takes a few seconds more, because the probe keeps moving while the message travels. The departure clock on Deep space solves for the moment a signal must leave the probe to reach Earth’s center now, using the downlink light time from the same table. Pioneer 10 and 11 positions are extrapolated from old tracking, so a message to either Pioneer is timed to where that probe should be. At the light-day second Voyager 1’s light time reads exactly 24 h. On the message line each equal step is ten times the travel time of the step before.',
  },
  {
    id: 'light-day-time-scale',
    title: 'Why this site and NASA agree on the light-day second',
    publisher: 'Worked out on this site from JPL Horizons, with the Horizons manual',
    url: 'https://ssd.jpl.nasa.gov/horizons/manual.html',
    dated: 'Checked 2 Nov 2026',
    license: 'A calculation from the Horizons data listed above.',
    used: 'This site requests its daily Horizons table in UT, which is UTC. The table crosses 86,400 s of light time at 10:16:06.996 UTC on 18 Nov 2026, 4 ms before NASA’s 10:16:07 UTC, so the countdown and the live number reach one light-day in the same second. Horizons can also label times in TDB, which runs 69.184 s ahead of UTC. A query for 10:16:07 TDB is about 10:14:57.8 UTC, 69 s earlier, and returns 86,399.994 s.',
  },
  {
    id: 'probe-history',
    title: 'Distance of each probe from the Sun and from Earth since launch',
    publisher: 'NASA JPL Solar System Dynamics, Horizons API',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
    dated: 'Fetched 2 Nov 2026 with pipeline/probe_history.py',
    license: 'NASA JPL data. Credit NASA/JPL-Caltech.',
    used: 'The Deep space chart of distance from the Sun, the home chart of hours of light to Voyager 1 since 1977 and the birthday distance.',
    note: 'One geometric vector table per probe every calendar month, from the first time Horizons holds for each trajectory (Voyager 1 from 5 Sep 1977) to 1 Jan 2028, centred on the Sun (500@10) and on Earth (500@399). The charts stop at today. The birthday distance reads the Sun table in a straight line between the two monthly samples on either side of noon UTC on the birthday and of the current moment, and subtracts. The result is how much farther from the Sun Voyager 1 is now, close to the distance flown because Voyager 1 moves almost straight away from the Sun.',
  },
  {
    id: 'eyes-solar-system',
    title: 'Eyes on the Solar System',
    publisher: 'NASA/JPL-Caltech',
    url: 'https://eyes.nasa.gov/apps/solar-system/',
    dated: 'Checked 2 Nov 2026',
    license: 'NASA web app shown in a frame only after a click. The app sends no header that forbids framing. Credit NASA/JPL-Caltech.',
    used: 'The 3D view of the picked probe on Deep space.',
    note: 'The links for Voyager 1 (#/sc_voyager_1), Voyager 2 (#/sc_voyager_2) and New Horizons (#/sc_new_horizons) come from NASA’s own mission pages on science.nasa.gov. The Pioneer 10 (#/sc_pioneer_10) and Pioneer 11 (#/sc_pioneer_11) links were read from the app’s own address after picking each probe in its search. The display options after the question mark are the ones NASA’s New Horizons page uses for its embedded view, and they match the options in the app’s own embed settings.',
  },
  {
    id: 'eyes-dsn',
    title: 'Eyes on the Deep Space Network (DSN Now)',
    publisher: 'NASA/JPL-Caltech',
    url: 'https://eyes.nasa.gov/apps/dsn-now/dsn.html',
    dated: 'Checked 2 Nov 2026',
    license: 'NASA web app shown in a frame only after a click. The app sends no header that forbids framing. Credit NASA/JPL-Caltech.',
    used: 'The live view of every dish beside the DSN section on the home page.',
    note: 'NASA’s Voyager and DSN pages link to eyes.nasa.gov/dsn/dsn.html, which now redirects to the app’s start page. The address used here is the one the app opens after its Enter button.',
  },
  {
    id: 'nasa-images-home',
    title: 'Photos on the home and Deep space pages',
    publisher: 'NASA Image and Video Library',
    url: 'https://images.nasa.gov/',
    dated: 'Full resolution originals fetched by NASA ID on 2 Nov 2026',
    license: 'NASA content, generally not subject to US copyright. Credit as printed on each item page. No logos or insignia are shown.',
    used: homeList + '.',
    note: 'Each photo is scaled to at most 2400 px on its long edge and never enlarged. PIA00022 is cropped to the inside of the mosaic, ARC-1973-AC73-9253 to the dark frame without its grey scan border and KSC-73P-0116 to the spacecraft. The Voyager 2 month comes from the item’s note that the frame was taken 4 days and 20 hours before closest approach, and from NSSDCA’s Neptune flyby date of 25 Aug 1989. NASA’s library holds no frame from Pioneer 11’s own camera that this site could verify, so Deep space shows a photo of Pioneer 11 before launch. The Eyes poster for New Horizons is cropped to leave out a worker’s suit patch, and the Pioneer 10 poster to drop the grey scan border. The Pioneer 11 poster (9139575, NASA, the launch on 5 Apr 1973 Florida time) and the Silent tile on the home page (as12-48-7121, NASA, Surveyor 3 from the Apollo 12 crew on 20 Nov 1969) are the Silent page’s own copies.',
  },
  {
    id: 'nasa-images-probes',
    title: 'Photos of the five probes before launch',
    publisher: 'NASA Image and Video Library',
    url: 'https://images.nasa.gov/',
    dated: 'Fetched by NASA ID on 2 Nov 2026',
    license: 'NASA content, generally not subject to US copyright. Credit as printed on each item page.',
    used: probePhotos.map((p) => `${p.nasa_id} (${p.credit}, ${p.center}), ${p.caption.replace(/\.$/, '')}`).join('. ') + '.',
    note: 'The New Horizons frame is cropped to the spacecraft.',
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
