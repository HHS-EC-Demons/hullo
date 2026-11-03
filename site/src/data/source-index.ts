import { DATASETS, FACTS, type PhotoCredit, type Source } from './sources';
import { STORY_CREDITS } from './photo-credits';

export interface SourceGroup {
  key: string;
  title: string;
  items: Source[];
}

function isSource(x: unknown): x is Source {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.title === 'string' && typeof v.url === 'string';
}

function titleFor(path: string, mod: Record<string, unknown>): string {
  if (typeof mod.GROUP_TITLE === 'string') return mod.GROUP_TITLE;
  const key = path.replace(/^.*sources-/, '').replace(/\.ts$/, '').replace(/-/g, ' ');
  return key.charAt(0).toUpperCase() + key.slice(1);
}

const modules = import.meta.glob<Record<string, unknown>>('./sources-*.ts', { eager: true });

const extra: SourceGroup[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, mod]) => ({
    key: path.replace(/^.*sources-/, '').replace(/\.ts$/, ''),
    title: titleFor(path, mod),
    items: Object.values(mod)
      .filter((v): v is unknown[] => Array.isArray(v))
      .flat()
      .filter(isSource),
  }))
  .filter((g) => g.items.length > 0);

export const SOURCE_GROUPS: SourceGroup[] = [
  { key: 'data', title: 'Data', items: DATASETS },
  { key: 'facts', title: 'Facts and dates', items: FACTS },
  ...extra,
];

const byId = new Map<string, Source>();
for (const g of SOURCE_GROUPS) for (const s of g.items) if (!byId.has(s.id)) byId.set(s.id, s);

export function sourceById(id: string): Source | undefined {
  return byId.get(id);
}

function isCredit(x: unknown): x is PhotoCredit {
  if (!x || typeof x !== 'object') return false;
  const v = x as Record<string, unknown>;
  return typeof v.page === 'string' && typeof v.id === 'string' && typeof v.credit === 'string' && typeof v.url === 'string' && !('title' in v);
}

const PAGE_ORDER = ['Home', 'Deep space', 'Moon', 'Mars', 'Orbit', 'Silent', 'Passport', 'Classroom', '404'];

const credits: PhotoCredit[] = [
  ...Object.values(modules)
    .flatMap((mod) => (Array.isArray(mod.PHOTO_CREDITS) ? mod.PHOTO_CREDITS : []))
    .filter(isCredit),
  ...STORY_CREDITS,
];

/** Photo credits grouped by page in site order, each ID listed once per page. */
export const PHOTO_CREDIT_PAGES: { page: string; credits: PhotoCredit[] }[] = [...new Set(credits.map((c) => c.page))]
  .sort((a, b) => (PAGE_ORDER.indexOf(a) + 1 || 99) - (PAGE_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b))
  .map((page) => {
    const seen = new Set<string>();
    return {
      page,
      credits: credits.filter((c) => c.page === page && !seen.has(c.id) && seen.add(c.id)),
    };
  });
