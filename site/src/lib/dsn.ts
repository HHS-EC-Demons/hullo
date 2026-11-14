export const DSN_FEED = 'https://eyes.nasa.gov/dsn/data/dsn.xml';
export const DSN_CONFIG = 'https://eyes.nasa.gov/dsn/config.xml';

export interface Signal {
  active: boolean;
  type: string;
  rate: number;
  band: string;
  craft: string;
}

export interface Dish {
  name: string;
  site: string;
  activity: string;
  up: Signal[];
  down: Signal[];
  targets: { name: string; rtlt: number; downleg: number }[];
}

export interface Feed {
  time: number;
  sites: { name: string; label: string }[];
  dishes: Dish[];
}

export interface Config {
  sites: Record<string, string>;
  dishes: Record<string, { label: string; type: string }>;
  craft: Record<string, string>;
}

export type Verb = 'in contact with' | 'receiving data from' | 'sending commands to';

export interface Contact {
  site: string;
  dish: string;
  size: string;
  craft: string;
  name: string;
  verb: Verb;
  rate: number;
  rtlt: number;
}

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    out[m[1]] = m[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  }
  return out;
}

function signal(a: Record<string, string>): Signal {
  return {
    active: a.active === 'true',
    type: a.signalType ?? '',
    rate: Number(a.dataRate) || 0,
    band: a.band ?? '',
    craft: (a.spacecraft ?? '').toUpperCase(),
  };
}

/** Reads the DSN Now feed. Every dish belongs to the station element before it. */
export function parseFeed(xml: string): Feed {
  const feed: Feed = { time: 0, sites: [], dishes: [] };
  let site = '';
  let dish: Dish | null = null;
  for (const m of xml.matchAll(/<(station|dish|upSignal|downSignal|target)\b([^>]*)>|<timestamp>(\d+)<\/timestamp>/g)) {
    if (m[3]) {
      feed.time = Number(m[3]);
      continue;
    }
    const a = attrs(m[2]);
    if (m[1] === 'station') {
      site = a.name;
      feed.sites.push({ name: a.name, label: a.friendlyName ?? a.name });
      if (!feed.time && a.timeUTC) feed.time = Number(a.timeUTC);
    } else if (m[1] === 'dish') {
      dish = { name: a.name, site, activity: a.activity ?? '', up: [], down: [], targets: [] };
      feed.dishes.push(dish);
    } else if (dish && m[1] === 'upSignal') {
      dish.up.push(signal(a));
    } else if (dish && m[1] === 'downSignal') {
      dish.down.push(signal(a));
    } else if (dish && m[1] === 'target') {
      dish.targets.push({ name: (a.name ?? '').toUpperCase(), rtlt: Number(a.rtlt), downleg: Number(a.downlegRange) });
    }
  }
  return feed;
}

/** Reads site, dish and spacecraft names from the DSN Now config file. */
export function parseConfig(xml: string): Config {
  const cfg: Config = { sites: {}, dishes: {}, craft: {} };
  for (const m of xml.matchAll(/<(site|dish|spacecraft)\b([^>]*)>/g)) {
    const a = attrs(m[2]);
    if (m[1] === 'site' && a.name) cfg.sites[a.name] = a.friendlyName ?? a.name;
    else if (m[1] === 'dish' && a.name) cfg.dishes[a.name] = { label: a.friendlyName ?? a.name, type: a.type ?? '' };
    else if (m[1] === 'spacecraft' && a.name) cfg.craft[a.name.toUpperCase()] = a.friendlyName ?? a.name;
  }
  return cfg;
}

/** Dish size in metres from a config type such as 70M or 34MHEF. */
export function dishSize(type: string): string {
  const m = /^(\d+)M/.exec(type);
  return m ? `${m[1]} m` : '';
}

/** One line per dish and spacecraft with an active link, in feed order. */
export function contacts(feed: Feed, cfg: Config | null): Contact[] {
  const out: Contact[] = [];
  for (const d of feed.dishes) {
    const crafts = new Set<string>();
    for (const s of [...d.up, ...d.down]) if (s.active && s.craft && s.craft !== 'DSN') crafts.add(s.craft);
    for (const craft of crafts) {
      const up = d.up.filter((s) => s.active && s.craft === craft);
      const down = d.down.filter((s) => s.active && s.craft === craft);
      const upData = up.some((s) => s.type === 'data');
      const downData = down.some((s) => s.type === 'data');
      const verb: Verb =
        up.length && down.length ? 'in contact with' : downData ? 'receiving data from' : upData ? 'sending commands to' : 'in contact with';
      const target = d.targets.find((t) => t.name === craft);
      out.push({
        site: cfg?.sites[d.site] ?? feed.sites.find((s) => s.name === d.site)?.label ?? d.site,
        dish: cfg?.dishes[d.name]?.label ?? d.name.replace(/^DSS(\d+)$/, 'DSS $1'),
        size: dishSize(cfg?.dishes[d.name]?.type ?? ''),
        craft,
        name: cfg?.craft[craft] ?? craft,
        verb,
        rate: Math.max(0, ...down.map((s) => s.rate)),
        rtlt: target && target.rtlt > 0 ? target.rtlt : -1,
      });
    }
  }
  return out;
}

export function rateText(bps: number): string {
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(bps >= 1e7 ? 0 : 1)} Mb/s`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(bps >= 1e4 ? 0 : 1)} kb/s`;
  return `${Math.round(bps)} b/s`;
}
