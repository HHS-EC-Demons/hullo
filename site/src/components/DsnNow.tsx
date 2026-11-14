import { useEffect, useRef, useState } from 'react';
import { contacts, DSN_CONFIG, DSN_FEED, dishSize, parseConfig, parseFeed, rateText, type Config, type Contact, type Feed } from '../lib/dsn';
import { lightTimeAt, hmsText, type DeepSpaceData } from '../lib/lighttime';
import { loadJson, utcTime } from '../lib/client';
import './dsn.css';

const POLL_MS = 8000;
const PROBES: Record<string, string> = { VGR1: 'voyager1', VGR2: 'voyager2', NHPC: 'newhorizons' };

function sentence(c: Contact): string {
  const size = c.size ? `${c.size} ` : '';
  return `${c.site}’s ${size}dish ${c.dish} is ${c.verb} ${c.name}.`;
}

export default function DsnNow() {
  const root = useRef<HTMLElement>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [deep, setDeep] = useState<DeepSpaceData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(DSN_CONFIG)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => live && setCfg(parseConfig(t)))
      .catch(() => undefined);
    loadJson<DeepSpaceData>('data/deep-space.json')
      .then((d) => live && setDeep(d))
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
  const story = list.filter((c) => PROBES[c.craft]);

  function roundTrip(c: Contact): string | null {
    if (c.rtlt > 0) return `Round trip light time ${hmsText(c.rtlt)}, from the feed.`;
    const key = PROBES[c.craft];
    const lt = deep && feed ? lightTimeAt(deep, key, feed.time) : null;
    return lt ? `Round trip light time about ${hmsText(2 * lt)}, from this site’s Horizons table.` : null;
  }

  const sites = feed ? feed.sites : [];

  return (
    <section ref={root} className="wrap section dsn" aria-labelledby="dsn-h">
      <h2 id="dsn-h" className="dsn-h">
        NASA’s Deep Space Network this minute
      </h2>
      <p className="dsn-sub">
        Antennas in California, Spain and Australia, from NASA’s DSN Now feed, updated every {POLL_MS / 1000} s while this
        section is on screen.
      </p>

      <div className="dsn-story">
        {!feed && !failed && <p className="dsn-big pending">Loading the feed</p>}
        {!feed && failed && <p className="dsn-big">The DSN Now feed did not load. The next try is in {POLL_MS / 1000} s.</p>}
        {feed && story.length > 0 &&
          story.map((c) => {
            const rt = roundTrip(c);
            return (
              <div key={`${c.dish}-${c.craft}`} className="dsn-hit">
                <p className="dsn-big">Right now {sentence(c)}</p>
                <p className="dsn-detail">
                  {c.rate > 0 && <span className="mono">{rateText(c.rate)} coming down. </span>}
                  {rt}
                </p>
              </div>
            );
          })}
        {feed && story.length === 0 && (
          <p className="dsn-big">
            None of the probes on this site is in contact right now. The list shows what each dish is doing.
          </p>
        )}
      </div>

      {feed && (
        <div className="dsn-grid">
          {sites.map((s) => {
            const dishes = feed.dishes.filter((d) => d.site === s.name);
            return (
              <div key={s.name} className="dsn-site">
                <h3>{cfg?.sites[s.name] ?? s.label}</h3>
                <ul>
                  {dishes.map((d) => {
                    const mine = list.filter((c) => c.dish === (cfg?.dishes[d.name]?.label ?? d.name.replace(/^DSS(\d+)$/, 'DSS $1')));
                    return (
                      <li key={d.name}>
                        <span className="dsn-dish mono">
                          {cfg?.dishes[d.name]?.label ?? d.name}
                          <span className="dsn-size">{dishSize(cfg?.dishes[d.name]?.type ?? '')}</span>
                        </span>
                        <span className="dsn-what">
                          {mine.length
                            ? mine.map((c) => (
                                <span key={c.craft} className={PROBES[c.craft] ? 'dsn-ours' : undefined}>
                                  {c.verb.charAt(0).toUpperCase() + c.verb.slice(1)} {c.name}
                                </span>
                              ))
                            : d.activity || 'No activity listed'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <p className="dsn-time">
        {feed ? (
          <>
            Feed time <span className="mono">{utcTime(feed.time)}</span>. Source{' '}
            <a href="https://eyes.nasa.gov/apps/dsn-now/" rel="noopener">
              DSN Now, NASA/JPL-Caltech
            </a>
            .
          </>
        ) : (
          ' '
        )}
      </p>
    </section>
  );
}
