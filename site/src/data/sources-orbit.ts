import type { Source } from './sources';
import { calDate } from '../lib/dates';
import photos from './photos.json';
import lro from './lro.json';
import siteMaps from './orbit-maps.json';
import jezero from './jezero-clock.json';

export const GROUP_TITLE = 'Moon, Mars and Orbit';

const NASA_MEDIA = 'NASA content, generally not subject to US copyright. Credit NASA.';
const HIRISE = 'HiRISE images are in the public domain, with the credit asked for where possible. Credit as printed on each page.';

type Photo = { id: string; credit: string; date: string | null; observation: string | null };
const list = photos as Record<string, Photo>;

function used(prefix: string): string {
  return Object.entries(list)
    .filter(([slug]) => slug.startsWith(prefix))
    .map(([, p]) => `${p.id.toUpperCase().startsWith('AS') ? p.id.toUpperCase() : p.id} by ${p.credit}`)
    .filter((v, i, all) => all.indexOf(v) === i)
    .join(', ');
}

export const ORBIT_SOURCES: Source[] = [
  {
    id: 'ingenuity-flight-log',
    title: 'Ingenuity Flight Log, by the numbers',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/wp-content/uploads/2024/06/ingenuity-helicopter-flight-log.pdf',
    dated: 'PDF posted Jun 2024, read 1 Nov 2026',
    license: NASA_MEDIA,
    used: 'The sol, date, horizontal distance, highest altitude, top ground speed and time in the air of each of the 72 flights, the hover flights listed with 0 m and 0 m/s, the running total, and the totals of about 17.0 km and 128.8 minutes. Read at build time with pypdf.',
    note: 'The Mars page shows a flight the log lists with 0 m and 0 m/s as a hover. Distances, heights and times in the readout and the bars of the All 72 flights chart come from this log, and the paths from the JPL map.',
  },
  {
    id: 'ingenuity-mission',
    title: 'Ingenuity Mars Helicopter',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/',
    dated: 'Page updated 22 Sep 2026, read 1 Nov 2026',
    license: NASA_MEDIA,
    used: 'NASA’s own summary, 128.8 flying minutes covering 17.0 kilometers, which the Mars page shows instead of a sum of the map paths.',
  },
  {
    id: 'ingenuity-flight-72',
    title: 'Flight 72 Status Update',
    publisher: 'NASA Science, written by NASA/JPL',
    url: 'https://science.nasa.gov/blog/flight-72-status-update/',
    dated: '19 Jan 2024',
    license: NASA_MEDIA,
    used: 'Flight 72 was a quick pop-up vertical flight after an unplanned early landing on flight 71.',
  },
  {
    id: 'mars24',
    title: 'Mars24 Sunclock, Algorithm and Worked Examples',
    publisher: 'NASA Goddard Institute for Space Studies',
    url: jezero.algorithm,
    dated: 'Updated 7 Jan 2025, read 2 Nov 2026',
    license: 'NASA GISS page. Equations used, text not copied.',
    used: 'Steps A-2, A-5 and C-2, the Mars Sol Date and Airy Mean Time, with TT minus UTC of 69.184 s, for the Jezero clock on the Mars page.',
    note: 'The site checks its code against both worked examples on this page, Airy Mean Time 23:59:39 on 6 Jan 2000 and 13:09:55 on 3 Jan 2004.',
  },
  {
    id: 'm20-raw-images',
    title: 'Mars 2020 raw image feed',
    publisher: 'NASA JPL',
    url: jezero.link,
    dated: `Image taken ${calDate(jezero.utc)}, read 2 Nov 2026`,
    license: 'NASA/JPL raw image metadata. Facts cited.',
    used: `One record, image ${jezero.image}, taken at ${jezero.utc.replace('T', ' ').slice(0, 19)} UTC on sol ${jezero.sol} at a local mean solar time of ${Math.floor(jezero.lmst_h)}:${String(Math.floor((jezero.lmst_h % 1) * 60)).padStart(2, '0')}. The Jezero clock on the Mars page counts sols and the time of day from this record with Mars24.`,
    note: 'Two more records from the same feed, sol 0 and sol 1000, agree with the clock to within a minute in the site’s tests.',
  },
  {
    id: 'eyes-mars2020',
    title: 'Eyes on Mars 2020',
    publisher: 'NASA JPL',
    url: 'https://eyes.nasa.gov/apps/mars2020/',
    dated: 'Opened 2 Nov 2026',
    license: 'NASA app, shown in a frame from its own address. The page sent no X-Frame-Options or frame-ancestors header on 2 Nov 2026.',
    used: 'The 3D app that opens on the Mars page when the button on the Perseverance selfie is pressed. Nothing from the app loads before that.',
  },
  {
    id: 'mmgis-deep-tiles',
    title: 'Mars 2020 MMGIS color basemap, zoom 17 and 18',
    publisher: 'NASA JPL',
    url: 'https://mars.nasa.gov/maps/location/?mission=M20',
    dated: 'Copied 1 Nov 2026',
    license: 'JPL image use policy, any purpose without prior permission. NASA/JPL-Caltech/University of Arizona/MSSS.',
    used: '701 extra tiles of the M20_HiRISE_RGB_CTX_mosaic_25cm_v7 layer within 100 m of every flight path at zoom 17 and 50 m at zoom 18, re-encoded as WebP, 4.6 MB.',
    note: 'The Mars map shows this HiRISE and CTX color mosaic with north up.',
  },
  {
    id: 'ingenuity-audio',
    title: 'Listen to NASA’s Ingenuity Mars Helicopter in Flight',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/resource/listen-to-nasas-ingenuity-mars-helicopter-in-flight-2/',
    dated: 'Released 7 May 2021, recorded 30 Apr 2021',
    license: `${NASA_MEDIA} Credit NASA/JPL-Caltech/LANL/CNES/CNRS/ISAE-Supaéro.`,
    used: 'The full 150 s MP3 of flight 4 from Perseverance’s SuperCam microphone, 80 m away, mixed to mono at 32 kbps, and its waveform.',
    note: 'NASA boosted the 84 Hz hum of the blades and cut other frequencies, so the hum is easier to hear over the wind.',
  },
  {
    id: 'pia25281',
    title: 'PIA25281, Seismogram and Sonification of InSight’s Big Martian Quake',
    publisher: 'NASA JPL Photojournal',
    url: 'https://photojournal.jpl.nasa.gov/catalog/PIA25281',
    dated: 'Added 17 May 2022, quake on 4 May 2022, sol 1,222',
    license: `${NASA_MEDIA} Credit NASA/JPL-Caltech/CNES.`,
    used: 'The 31 s sound track of the video, the sonified signal of the estimated magnitude 5 quake, mixed to mono at 48 kbps, and its waveform.',
    note: 'NASA turned the seismometer signal into sound. The quake was on sol 1,222.',
  },
  {
    id: 'pia17045',
    title: 'PIA17045, Voyager Captures Sounds of Interstellar Space',
    publisher: 'NASA JPL Photojournal',
    url: 'https://photojournal.jpl.nasa.gov/catalog/PIA17045',
    dated: 'Added 12 Sep 2013, recorded Oct to Nov 2012 and Apr to May 2013',
    license: `${NASA_MEDIA} Credit NASA/JPL-Caltech/University of Iowa.`,
    used: 'The 61 s sound track of Voyager 1’s plasma wave instrument, mixed to mono at 48 kbps, and its waveform.',
    note: 'Voyager 1’s plasma wave instrument picked up vibrations in dense interstellar plasma. The sound plays back the frequency and strength of those waves.',
  },
  {
    id: 'lroc-pds',
    title: 'LROC NAC digital terrain model orthoimages, RDR NAC_DTM',
    publisher: 'LROC Science Operations Center, Arizona State University, at the PDS Imaging Node',
    url: 'https://pds.mcp.nasa.gov/data/store/img/lunar_reconnaissance_orbiter/pds4/lroc/lro-l-lroc-5-rdr/LROLRC_2001/DATA/SDP/NAC_DTM/',
    dated: 'Read 1 Nov 2026',
    license: 'The LROC terms say data products available through the PDS are in the public domain. Credit NASA/GSFC/Arizona State University.',
    used: `Crops around the six Apollo landing sites from ${lro.crops.map((c) => c.product).join(', ')}, located with the label’s map grid and the NSSDCA coordinates, fetched with range requests and stretched to 8 bits.`,
    note: 'Each LRO view on the Orbit page keeps its own 0.5 m or 0.6 m pixels and is never scaled up in the file. The lilac ring is placed by turning the NSSDCA lunar module coordinates into a pixel with the map grid in the product’s own PDS4 label, so it marks the lunar module. The scale bars use the pixel_scale_y in that label, 0.5 m per pixel, or 0.6 m for Apollo 17, and the zoomed inset shows the same pixels at 3 times the size. Apollo site coordinates on the Orbit page are from NSSDCA.',
  },
  {
    id: 'svs-moon-kit',
    title: 'CGI Moon Kit, LROC WAC color map',
    publisher: 'NASA Scientific Visualization Studio',
    url: siteMaps.moon.page,
    dated: 'Released 6 Sep 2019, map file read 2 Nov 2026',
    license: 'The SVS help page says all SVS content is in the public domain unless otherwise noted. Credit NASA’s Scientific Visualization Studio.',
    used: `The Moon map at the top of the Orbit page, cut from ${siteMaps.moon.file_url.split('/').pop()}, 8192 by 4096 px and centered on 0° longitude, between ${Math.round(siteMaps.moon.west)}° and ${Math.round(siteMaps.moon.east)}° longitude and ${Math.round(siteMaps.moon.south)}° and ${Math.round(siteMaps.moon.north)}° latitude.`,
    note: 'The map is built from more than 100,000 LRO Wide Angle Camera images. Each pin sits at its site’s NSSDCA latitude and longitude on this grid.',
  },
  {
    id: 'usgs-mdim21-color',
    title: 'Mars Viking Colorized Global Mosaic 232m, MDIM 2.1',
    publisher: 'USGS Astrogeology Science Center, from NASA Ames',
    url: siteMaps.mars.page,
    dated: 'Published 2 Feb 2009, read 2 Nov 2026',
    license: 'The Astropedia page lists Access Constraints as public domain and Use Constraints as none.',
    used: 'The Mars map at the top of the Orbit page, from the 1 km per pixel JPEG of this mosaic, turned so 240° east sits in the middle and scaled to 2400 px wide.',
    note: 'NASA Ames warped the Viking color mosaic onto the black and white MDIM 2.1, which matches the MOLA control network to about 200 m. Each pin sits at its lander’s published latitude and east longitude on this grid.',
  },
  {
    id: 'lroc-terms',
    title: 'LROC terms of use',
    publisher: 'LROC, Arizona State University',
    url: 'https://lroc.im-ldi.com/about/terms',
    dated: 'Read 28 Oct 2026',
    license: 'Website images are copyrighted, PDS products are public domain.',
    used: 'Why the Orbit page crops LRO views from PDS products and does not copy images from the LROC website.',
  },
  {
    id: 'hirise-usage',
    title: 'HiRISE image usage policy',
    publisher: 'HiRISE, University of Arizona',
    url: 'https://www.uahirise.org/media/usage.php',
    dated: 'Read 28 Oct 2026',
    license: HIRISE,
    used: 'Terms for the HiRISE views of Viking 1 and 2, Spirit, Opportunity, InSight and Phoenix on the Orbit page. PIA26515 prints no credit, so the site shows the credit HiRISE asks for, NASA/JPL/University of Arizona.',
  },
  {
    id: 'orbit-hirise',
    title: 'HiRISE observations and Photojournal figures of Mars landers',
    publisher: 'HiRISE and NASA JPL Photojournal',
    url: 'https://www.uahirise.org/',
    dated: 'Downloaded 1 Nov 2026',
    license: HIRISE,
    used: 'Orbit page. Viking 1, PIA01881 from PSP_001521_2025, and Viking 2, PIA01882 from PSP_001501_2280, both NASA/JPL-Caltech/University of Arizona. Spirit, ESP_021925_1650, and Opportunity, ESP_050177_1780, both NASA/JPL-Caltech/UArizona. InSight, ESP_058005_1845 by NASA/JPL-Caltech/UArizona and PIA26515 by NASA/JPL/University of Arizona. Phoenix, PIA22223 figures 1 and 2 from PSP_009290_2485 and ESP_053451_2485, NASA/JPL-Caltech/Univ. of Arizona. The PDS labels of these observations give the map scales.',
    note: 'Mars landing coordinates on the Orbit page are from NSSDCA, except Spirit and Phoenix, which are from the PDS Geosciences Node. Each lilac ring on a HiRISE view is placed from what NASA or HiRISE published for that image. Viking 1 and 2 use the end of the Lander leader line in NASA’s annotated figure 1, which has the same pixels as the plain overview the view is cut from. Spirit is the brightest spot, as the HiRISE caption says. Opportunity’s lander is the hardware at the center of Eagle crater, as the HiRISE caption says. Phoenix is the top feature, which the PIA22223 caption calls the lander. InSight is the bright spot with two round solar arrays in the full resolution hardware cutout and labeled release, and the same shape in PIA26515. Scale bars use the 0.25 m MAP_SCALE from each observation’s PDS label, corrected east to west for latitude and for any scaling on this site, checked for Viking 1 against the RED browse image and for Phoenix against the about 300 m width in the caption. PIA26515 names no observation, so its bar uses the 100 m bar NASA printed on it. Viking 2, Spirit and Opportunity have no scale bar, because the scale of those cuts could not be checked. The zoomed inset shows the same pixels at 3 times the size.',
  },
  {
    id: 'orbit-photos',
    title: 'Mission photos on the Moon, Mars and Orbit pages',
    publisher: 'NASA Image and Video Library and NASA JPL Photojournal',
    url: 'https://images.nasa.gov/',
    dated: 'Downloaded 1 and 2 Nov 2026',
    license: `${NASA_MEDIA} No logos or insignia are used. Shown unaltered apart from crop and scale.`,
    note: 'The Goddard laser photo is cropped to leave out a person at the station. The Valinor Hills view is a full resolution crop of PIA26237 around Ingenuity, and the lilac ring around Ingenuity is drawn by this site. PIA25881 is enhanced color as NASA released it.',
    used: `Moon page: ${used('moon-')}. Mars page: ${used('mars-')}. Orbit page: ${used('orbit-')
      .split(', ')
      .filter((s) => !/^(ESP|PSP)_|^PIA(01881|01882|26515|22223)/.test(s))
      .join(', ')}.`,
  },
];
