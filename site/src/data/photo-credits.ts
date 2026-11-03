import SILENT_PHOTOS from './silent-images.json';
import PAGE_PHOTOS from './page-images.json';
import PHOTOS from './photos.json';
import PROBE_PHOTOS from './probe-photos.json';
import IMAGES from '../../public/data/images.json';
import type { PhotoCredit } from './sources';

interface Library {
  id: string;
  credit: string;
  page: string;
}

const library = PHOTOS as Record<string, Library>;
const pages = PAGE_PHOTOS as Record<string, { nasa_id: string; credit: string; page: string }>;

function fromLibrary(page: string, slug: string): PhotoCredit | null {
  const m = library[slug];
  return m ? { page, id: m.id, credit: m.credit, url: m.page } : null;
}

function fromPages(page: string, slug: string): PhotoCredit | null {
  const m = pages[slug];
  return m ? { page, id: m.nasa_id, credit: m.credit, url: m.page } : null;
}

const a11 = (IMAGES as { slug: string; nasa_id: string; credit: string; page: string }[]).find((p) => p.slug === 'apollo11-reflector');
const reflector11 = (page: string): PhotoCredit | null => (a11 ? { page, id: a11.nasa_id, credit: a11.credit, url: a11.page } : null);
const silentPhotos = (page: string): PhotoCredit[] => SILENT_PHOTOS.map((m) => ({ page, id: m.nasa_id, credit: m.credit, url: m.page }));
const probePhotos = (page: string): PhotoCredit[] => PROBE_PHOTOS.map((p) => ({ page, id: p.nasa_id, credit: p.credit, url: p.page }));

/** Every photo shown on the Silent, Passport, Classroom and 404 pages, by page. */
export const STORY_CREDITS: PhotoCredit[] = [
  fromPages('Silent', 'silent-hero'),
  ...silentPhotos('Silent'),
  reflector11('Silent'),
  fromLibrary('Silent', 'moon-a14-reflector'),
  ...probePhotos('Silent'),
  ...probePhotos('Passport'),
  ...silentPhotos('Passport'),
  reflector11('Passport'),
  fromLibrary('Passport', 'moon-a14-reflector'),
  fromLibrary('Passport', 'moon-a15-reflector'),
  fromPages('Passport', 'passport-l1'),
  fromPages('Passport', 'passport-l2'),
  fromLibrary('Passport', 'mars-selfie'),
  ...['11', '12', '14', '15', '16', '17'].map((n) => fromLibrary('Passport', `orbit-apollo${n}-surface`)),
  fromPages('Classroom', 'class-moon'),
  fromPages('Classroom', 'class-voyager1'),
  fromLibrary('Classroom', 'mars-selfie'),
  fromPages('404', 'nope-dss14'),
].filter((c): c is PhotoCredit => c !== null);
