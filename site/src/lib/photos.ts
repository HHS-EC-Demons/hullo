import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import photoMeta from '../data/photos.json';
import lroMeta from '../data/lro.json';
import homeMeta from '../data/home-images.json';
import pageMeta from '../data/page-images.json';
import silentMeta from '../data/silent-images.json';
import probeMeta from '../data/probe-photos.json';

export interface PhotoMeta {
  id: string;
  observation: string | null;
  title: string;
  date: string | null;
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

const files = import.meta.glob<{ default: ImageMetadata }>('../assets/img/*.jpg', { eager: true });
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

type Loose = { id?: string; nasa_id?: string; credit?: string; date?: string | null };

function lineOf(m: Loose | undefined): string | null {
  if (!m) return null;
  const id = m.id ?? m.nasa_id;
  if (!id || !m.credit) return null;
  const year = m.date ? m.date.slice(0, 4) : '';
  return `${year ? `${year}. ` : ''}${id}, ${m.credit}`;
}

export function creditLine(slug: string): string | null {
  const home = (homeMeta as Record<string, Loose>)[slug];
  const page = (pageMeta as Record<string, Loose>)[slug];
  const silent = (silentMeta as (Loose & { object: string })[]).find((m) => `silent-${m.object}` === slug);
  const probe = (probeMeta as (Loose & { slug: string })[]).find((m) => m.slug === slug);
  return lineOf(META[slug]) ?? lineOf(home) ?? lineOf(page) ?? lineOf(silent) ?? lineOf(probe);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dated(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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
