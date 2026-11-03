import { useEffect, useRef, useState } from 'react';
import { contacts, DSN_CONFIG, DSN_FEED, parseConfig, parseFeed, type Config, type Contact, type Feed } from '../lib/dsn';
import { useNow } from '../lib/client';
import { ago, clock, YOUR_TIME } from '../lib/dates';
import EyesFacade, { type Poster } from './EyesFacade';
import './dsn.css';

const POLL_MS = 8000;
const PROBES: Record<string, string> = { VGR1: 'voyager1', VGR2: 'voyager2', NHPC: 'newhorizons' };
const SITES = ['Goldstone', 'Madrid', 'Canberra'];
const SHOWN = 1;
const PHOTO_SIZES = '(max-width: 640px) 40vw, (max-width: 1023px) 30vw, 20vw';
const EYES_SIZES = '(max-width: 900px) calc(100vw - 32px), 30vw';
const EYES_APP = 'https://eyes.nasa.gov/apps/dsn-now/dsn.html';

export interface SitePhoto {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  credit: string;
}

interface Props {
  photos: Record<string, SitePhoto>;
  poster: Poster;
}

function label(c: Contact): string {
  return c.name.split(/\s+/).length > 2 ? c.craft : c.name;
}

function perDish(list: Contact[]): Contact[] {
  const seen = new Set<string>();
  return list
    .filter((c) => {
      const k = `${c.dish}|${c.craft}`;
      return seen.has(k) ? false : (seen.add(k), true);
    })
    .sort((a, b) => Number(Boolean(PROBES[b.craft])) - Number(Boolean(PROBES[a.craft])));
}

function idle(feed: Feed, cfg: Config | null, site: string, busy: Set<string>): { dishes: string; activity: string } | null {
  const code = Object.entries(cfg?.sites ?? {}).find(([, name]) => name === site)?.[0] ?? feed.sites.find((s) => s.label === site)?.name;
  const rest = feed.dishes.filter((d) => d.site === code && !busy.has(d.name));
  if (!rest.length) return null;
  const counts = new Map<string, number>();
  for (const d of rest) counts.set(d.activity, (counts.get(d.activity) ?? 0) + 1);
  const activity = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const nums = rest.filter((d) => d.activity === activity).map((d) => d.name.replace(/^DSS/, ''));
  return { dishes: `DSS ${nums.join(', ')}`, activity };
}

export default function DsnNow({ photos, poster }: Props) {
  const root = useRef<HTMLElement>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);
  const now = useNow(15000);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let live = true;
    fetch(DSN_CONFIG)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => live && setCfg(parseConfig(t)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let timer = 0;
    let onScreen = false;
    let ctrl: AbortController | null = null;

    const poll = async () => {
      window.clearTimeout(timer);
      if (!onScreen || document.visibilityState === 'hidden') return;
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const r = await fetch(`${DSN_FEED}?r=${Date.now()}`, { signal: ctrl.signal, cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        setFeed(parseFeed(await r.text()));
        setFailed(false);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setFailed(true);
      }
      timer = window.setTimeout(poll, POLL_MS);
    };

    const io = new IntersectionObserver(([entry]) => {
      const was = onScreen;
      onScreen = entry.isIntersecting;
      if (onScreen && !was) poll();
      if (!onScreen) window.clearTimeout(timer);
    });
    if (root.current) io.observe(root.current);
    const vis = () => (document.visibilityState === 'visible' ? poll() : window.clearTimeout(timer));
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
      window.clearTimeout(timer);
      ctrl?.abort();
    };
  }, []);

  const list = feed ? contacts(feed, cfg) : [];
  const ours = list.some((c) => PROBES[c.craft]);

  return (
    <section ref={root} className="wrap section dsn" aria-labelledby="dsn-h">
      <div className="dsn-main">
        <div className="dsn-head">
          <h2 id="dsn-h" className="dsn-h">
            Deep Space Network
          </h2>
          <p className="dsn-time">
            {feed ? (
              <>
                updated <span className="mono">{clock(feed.time)}</span> {YOUR_TIME}, <span className="mono">{ago(feed.time, now ?? feed.time)}</span>
              </>
            ) : failed ? (
              'The live feed did not load.'
            ) : (
              ' '
            )}
          </p>
          <p className="dsn-none">{feed && !ours ? 'None of Hullo’s probes right now.' : ' '}</p>
        </div>

        <ul className="dsn-sites">
          {SITES.map((site) => {
            const links = perDish(list.filter((c) => c.site === site));
            const busy = new Set(links.map((c) => c.dish.replace(/\s+/g, '')));
            const rest = feed && links.length === 0 ? idle(feed, cfg, site, busy) : null;
            const photo = photos[site];
            return (
              <li key={site} className="dsn-site">
                {photo && (
                  <figure className="dsn-photo">
                    <div className="dsn-frame">
                      {near && (
                        <picture>
                          <source type="image/avif" srcSet={photo.avif} sizes={PHOTO_SIZES} />
                          <source type="image/webp" srcSet={photo.webp} sizes={PHOTO_SIZES} />
                          <img src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async" />
                        </picture>
                      )}
                    </div>
                    <figcaption className="credit">
                      {photo.caption}. <span data-credit="">{photo.credit}</span>
                    </figcaption>
                  </figure>
                )}
                <div className="dsn-text">
                  <h3>{site}</h3>
                  <ul className="dsn-dishes">
                    {!feed && <li>{' '}</li>}
                    {links.slice(0, SHOWN).map((c) => (
                      <li key={`${c.dish}${c.craft}`} className={PROBES[c.craft] ? 'dsn-dish dsn-ours' : 'dsn-dish'} title={`${c.dish} is ${c.verb} ${c.name}`}>
                        <span className="mono">{c.dish}</span> → <span className="dsn-craft">{label(c)}</span>
                      </li>
                    ))}
                    {links.length > SHOWN && <li className="dsn-more mono">+{links.length - SHOWN}</li>}
                    {rest && (
                      <li className="dsn-dish dsn-idle">
                        <span className="mono">{rest.dishes}</span> <span>{rest.activity}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <EyesFacade
        className="dsn-eyes"
        poster={poster}
        src={EYES_APP}
        title="NASA Eyes on the Deep Space Network, live view of every dish"
        label="Open DSN Now"
        app="DSN Now"
        sizes={EYES_SIZES}
      />
    </section>
  );
}
