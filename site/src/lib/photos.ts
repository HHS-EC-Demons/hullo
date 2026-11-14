import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import photoMeta from '../data/photos.json';
import lroMeta from '../data/lro.json';

export interface PhotoMeta {
  id: string;
  observation: string | null;
  title: string;
  date: string;
  credit: string;
  page: string;
  width: number;
  height: number;
  cropped: boolean;
}

export interface LroCrop {
  site: string;
  product: string;
  label: string;
  acquired: string;
  scale_m: number;
  center: [number, number];
  width: number;
  height: number;
  lm_px: [number, number];
  file: string;
}

export interface Pic {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  sizes: string;
}

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/img/{orbit,moon,mars}-*.jpg', { eager: true });
const META = photoMeta as Record<string, PhotoMeta>;

export const LRO = lroMeta as { source: string; coordinates: string; credit: string; crops: LroCrop[] };

export function image(slug: string): ImageMetadata {
  const hit = files[`../assets/img/${slug}.jpg`];
  if (!hit) throw new Error(`missing image ${slug}`);
  return hit.default;
}

export function meta(slug: string): PhotoMeta {
  const hit = META[slug];
  if (!hit) throw new Error(`missing photo metadata ${slug}`);
  return hit;
}

export function lro(site: string): LroCrop {
  const hit = LRO.crops.find((c) => c.site === site);
  if (!hit) throw new Error(`missing LRO crop ${site}`);
  return hit;
}

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function dated(iso: string): string {
  return day.format(Date.parse(`${iso.slice(0, 10)}T12:00:00Z`));
}

export async function pic(slug: string, widths: number[], sizes: string): Promise<Pic> {
  const src = image(slug);
  const usable = widths.filter((w) => w <= src.width);
  const list = usable.length ? usable : [src.width];
  const [avif, webp] = await Promise.all([
    getImage({ src, widths: list, format: 'avif', quality: 60 }),
    getImage({ src, widths: list, format: 'webp', quality: 72 }),
  ]);
  return {
    avif: avif.srcSet.attribute,
    webp: webp.srcSet.attribute,
    src: webp.src,
    width: src.width,
    height: src.height,
    sizes,
  };
}
