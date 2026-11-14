import { useEffect, useRef, useState } from 'react';
import { contacts, DSN_CONFIG, DSN_FEED, parseConfig, parseFeed, type Config, type Contact, type Feed } from '../lib/dsn';
import { utcTime } from '../lib/client';
import './dsn.css';

const POLL_MS = 8000;
const PROBES: Record<string, string> = { VGR1: 'voyager1', VGR2: 'voyager2', NHPC: 'newhorizons' };
const SITES = ['Goldstone', 'Madrid', 'Canberra'];
const SHOWN = 2;
const PHOTO_SIZES = '(max-width: 860px) calc(100vw - 32px), 31vw';

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
}

function label(c: Contact): string {
  return c.name.split(/\s+/).length > 2 ? c.craft : c.name;
}

function crafts(list: Contact[]): Contact[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.craft) ? false : (seen.add(c.craft), true)));
}

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
}

function sentence(c: Contact): string {
  const size = c.size ? `${c.size} ` : '';
  return `${c.site}’s ${size}dish ${c.dish} is ${c.verb} ${c.name}.`;
}

export default function DsnNow({ photos }: Props) {
  const root = useRef<HTMLElement>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(false);

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

  return (
    <section ref={root} className="wrap section dsn" aria-labelledby="dsn-h">
      <h2 id="dsn-h" className="dsn-h">
        Deep Space Network now
      </h2>
      {failed && !feed && <p className="dsn-sub">The live feed did not load.</p>}

      <ul className="dsn-sites">
        {SITES.map((site) => {
          const here = crafts(list.filter((c) => c.site === site)).sort((a, b) => Number(Boolean(PROBES[b.craft])) - Number(Boolean(PROBES[a.craft])));
          const photo = photos[site];
          return (
            <li key={site} className="dsn-site">
              <h3>{site}</h3>
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
              <p className="dsn-now">
                {!feed && '\u2007'}
                {feed && here.length === 0 && <span className="dsn-none">None</span>}
                {here.slice(0, SHOWN).map((c) => (
                  <span key={c.craft} className={PROBES[c.craft] ? 'dsn-craft dsn-ours' : 'dsn-craft'} title={c.name}>
                    {label(c)}
                  </span>
                ))}
                {here.length > SHOWN && <span className="dsn-more mono">+{here.length - SHOWN}</span>}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="dsn-time">
        {feed ? (
          <>
            <span className="mono">{utcTime(feed.time)}</span>{' '}
            <span data-credit="">
              <a href="https://eyes.nasa.gov/apps/dsn-now/" rel="noopener">
                DSN Now, NASA/JPL-Caltech
              </a>
            </span>
          </>
        ) : (
          ' '
        )}
      </p>
    </section>
  );
}
