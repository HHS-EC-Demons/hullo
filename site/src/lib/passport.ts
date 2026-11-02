export const STAMP_EVENT = 'hullo:stamp';

const STORE = 'hullo.passport.v1';
const HOLDER = 'hullo.passport.holder.v1';
const MAX_DETAIL = 140;
const MAX_HOLDER = 60;

export interface Stamp {
  id: string;
  detail: string;
  at: number;
}

export interface StampEventDetail {
  stamp: Stamp | null;
  fresh: boolean;
  count: number;
}

let lastRaw: string | null | undefined;
let lastList: Stamp[] = [];

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function valid(s: unknown): s is Stamp {
  if (!s || typeof s !== 'object') return false;
  const v = s as Record<string, unknown>;
  return typeof v.id === 'string' && v.id.length > 0 && typeof v.detail === 'string' && typeof v.at === 'number' && Number.isFinite(v.at);
}

function readRaw(): string | null {
  try {
    return storage()?.getItem(STORE) ?? null;
  } catch {
    return null;
  }
}

function parse(raw: string | null): Stamp[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const out: Stamp[] = [];
    for (const s of list) {
      if (!valid(s) || seen.has(s.id)) continue;
      seen.add(s.id);
      out.push({ id: s.id, detail: s.detail.slice(0, MAX_DETAIL), at: s.at });
    }
    return out.sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

function write(list: Stamp[]): boolean {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(STORE, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function announce(detail: StampEventDetail): void {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<StampEventDetail>(STAMP_EVENT, { detail }));
  } catch {
    return;
  }
}

/**
 * Every stamp on this device, oldest first. The same array comes back until
 * the stored stamps change, so it works as a useSyncExternalStore snapshot.
 */
export function getStamps(): Stamp[] {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastList = parse(raw);
  }
  return lastList;
}

/** Server snapshot for useSyncExternalStore, always empty. */
export function getServerStamps(): Stamp[] {
  return EMPTY;
}

const EMPTY: Stamp[] = [];

export function getStamp(id: string): Stamp | null {
  return getStamps().find((s) => s.id === id) ?? null;
}

export function stampCount(): number {
  return getStamps().length;
}

/**
 * Stamps the object `id` with `detail`, the real figure at the moment of the
 * interaction, such as "23 h 57 min 46 s of light away". The first stamp for
 * an object is kept, so later calls return it unchanged. Returns null when
 * the browser keeps no storage.
 */
export function stamp(id: string, detail: string, at: number = Date.now()): Stamp | null {
  if (typeof id !== 'string' || id.trim() === '') return null;
  const key = id.trim();
  const list = getStamps();
  const old = list.find((s) => s.id === key);
  if (old) return old;
  const fresh: Stamp = { id: key, detail: String(detail ?? '').trim().slice(0, MAX_DETAIL), at };
  const next = [...list, fresh];
  if (!write(next)) return null;
  announce({ stamp: fresh, fresh: true, count: getStamps().length });
  return fresh;
}

/** Removes every stamp on this device. */
export function clearStamps(): void {
  try {
    storage()?.removeItem(STORE);
  } catch {
    return;
  }
  announce({ stamp: null, fresh: false, count: 0 });
}

/**
 * Calls `cb` with the stamp count whenever a stamp lands on this page or in
 * another tab. Returns the function that stops listening.
 */
export function onStamp(cb: (count: number) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const local = () => cb(stampCount());
  const other = (e: StorageEvent) => {
    if (e.key === null || e.key === STORE) cb(stampCount());
  };
  window.addEventListener(STAMP_EVENT, local);
  window.addEventListener('storage', other);
  return () => {
    window.removeEventListener(STAMP_EVENT, local);
    window.removeEventListener('storage', other);
  };
}

/** Same as onStamp, shaped for useSyncExternalStore. */
export function subscribeStamps(cb: () => void): () => void {
  return onStamp(() => cb());
}

/** The name typed for the certificate. It stays in this browser only. */
export function getHolder(): string {
  try {
    return (storage()?.getItem(HOLDER) ?? '').slice(0, MAX_HOLDER);
  } catch {
    return '';
  }
}

export function setHolder(name: string): void {
  try {
    const store = storage();
    if (!store) return;
    const clean = name.replace(/\s+/g, ' ').slice(0, MAX_HOLDER);
    if (clean.trim() === '') store.removeItem(HOLDER);
    else store.setItem(HOLDER, clean);
  } catch {
    return;
  }
}
