import { useEffect, useMemo, useRef, useState } from 'react';
import { useJson } from '../lib/client';
import { decText, hammer, offsetFromCenter, positionsOn, raText, skyDay, type SkyIndex, type SkyMonth, type SkyStars } from '../lib/sky';
import { probeInfo } from '../data/probes';
import { Skeleton } from '@/components/ui/skeleton';
import './sky.css';

interface Props {
  highlight: string;
  now: number | null;
}

const RA0 = 0;
const MAG_BINS = [1, 2, 3, 4, 4.75, 9];
const BIN_R = [2.7, 2.1, 1.6, 1.2, 0.95, 0.75];
const BIN_O = [1, 0.95, 0.85, 0.72, 0.6, 0.5];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function insideEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

export default function SkyChart({ highlight, now }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [near, setNear] = useState(false);
  const { data: index } = useJson<SkyIndex>(near ? 'data/sky/index.json' : null);
  const { data: sky, error } = useJson<SkyStars>(near ? 'data/sky/stars.json' : null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const want = now ? skyDay(now) : null;
  const month = index && want ? (index.months.includes(want.month) ? want.month : want.month < index.months[0] ? index.months[0] : index.months[index.months.length - 1]) : null;
  const { data: table } = useJson<SkyMonth>(month ? `data/sky/${month}.json` : null);
  const day = table && want ? (table.month === want.month ? want.day : want.month < table.month ? 0 : table.days.length - 1) : 0;
  const bodies = (index?.bodies ?? []).filter((b) => b.kind !== 'world');
  const positions = table && index && table.month === month ? positionsOn(table, bodies, day) : [];

  const w = Math.max(width, 300);
  const narrow = w < 640;
  const margin = narrow ? 6 : 14;
  const k = (w - margin * 2) / (4 * Math.SQRT2);
  const h = Math.round(w / 2);
  const cx = w / 2;
  const cy = h / 2;
  const rx = 2 * Math.SQRT2 * k;
  const ry = Math.SQRT2 * k;
  const sz = Math.min(1, Math.max(0.6, w / 1200));
  const px = (ra: number, dec: number): [number, number] => {
    const [x, y] = hammer(ra, dec, RA0);
    return [cx + x * k, cy - y * k];
  };

  const layers = useMemo(() => {
    if (!sky || width === 0) return null;
    const bins = MAG_BINS.map(() => [] as string[]);
    const s = sky.stars;
    for (let i = 0; i < s.length; i += 3) {
      const b = MAG_BINS.findIndex((m) => s[i + 2] < m);
      const [x, y] = px(s[i], s[i + 1]);
      bins[b === -1 ? MAG_BINS.length - 1 : b].push(`M${x.toFixed(1)} ${y.toFixed(1)}h0`);
    }
    const figures: string[] = [];
    for (const line of sky.lines) {
      let d = '';
      let prevLon: number | null = null;
      for (let i = 0; i + 3 < line.length; i += 2) {
        const [ra1, de1, ra2, de2] = [line[i], line[i + 1], line[i + 2], line[i + 3]];
        let dra = ra2 - ra1;
        if (dra > 180) dra -= 360;
        if (dra < -180) dra += 360;
        const steps = Math.max(1, Math.ceil(Math.hypot(dra, de2 - de1) / 2));
        for (let j = i === 0 ? 0 : 1; j <= steps; j++) {
          const ra = ra1 + (dra * j) / steps;
          const de = de1 + ((de2 - de1) * j) / steps;
          const lon = offsetFromCenter(ra, RA0);
          const [x, y] = px(ra, de);
          const jump = prevLon !== null && Math.abs(lon - prevLon) > 180;
          d += `${d === '' || jump ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
          prevLon = lon;
        }
      }
      figures.push(d);
    }
    const grid: string[] = [];
    for (const dec of [-60, -30, 0, 30, 60]) {
      let d = '';
      for (let ra = RA0 - 179.5; ra <= RA0 + 179.5; ra += 3) {
        const [x, y] = px(ra, dec);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      grid.push(d);
    }
    for (const ra of [RA0 + 90, RA0, RA0 - 90]) {
      let d = '';
      for (let dec = -90; dec <= 90; dec += 3) {
        const [x, y] = px(ra, dec);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      grid.push(d);
    }
    return { bins: bins.map((b) => b.join('')), figures: figures.join(''), grid };
  }, [sky, width]);

  const marks = useMemo(() => {
    if (positions.length === 0) return [];
    const placed: Box[] = [];
    const order = [...positions].sort((a, b) => (a.key === highlight ? -1 : b.key === highlight ? 1 : 0));
    for (const p of order) {
      const [x, y] = px(p.ra, p.dec);
      placed.push({ x: x - 8, y: y - 8, w: 16, h: 16 });
    }
    const fs = narrow ? 12 : 14;
    const out = [];
    for (const p of order) {
      const body = bodies.find((b) => b.key === p.key)!;
      const [x, y] = px(p.ra, p.dec);
      const text = narrow ? body.short : body.name;
      const tw = text.length * fs * 0.58 + 4;
      const gap = body.kind === 'world' && body.key === 'moon' ? 12 : 11;
      const options = [
        { x: x + gap, y: y + fs * 0.35, anchor: 'start', b: { x: x + gap, y: y - fs * 0.6, w: tw, h: fs * 1.2 } },
        { x: x - gap, y: y + fs * 0.35, anchor: 'end', b: { x: x - gap - tw, y: y - fs * 0.6, w: tw, h: fs * 1.2 } },
        { x, y: y - gap - 2, anchor: 'middle', b: { x: x - tw / 2, y: y - gap - 2 - fs, w: tw, h: fs * 1.2 } },
        { x, y: y + gap + fs, anchor: 'middle', b: { x: x - tw / 2, y: y + gap, w: tw, h: fs * 1.2 } },
      ];
      const fits = (o: (typeof options)[number]) =>
        o.b.x >= 2 && o.b.x + o.b.w <= w - 2 && o.b.y >= 2 && o.b.y + o.b.h <= h - 2 && !placed.some((q) => overlaps(q, o.b));
      const pick = options.find(fits) ?? options[0];
      placed.push(pick.b);
      out.push({ ...p, body, x, y, text, label: pick, fs });
    }
    return out;
  }, [positions.map((p) => `${p.ra},${p.dec}`).join(';'), highlight, width]);

  const lit = positions.find((p) => p.key === highlight);
  const litName = probeInfo(highlight).name;
  const summary = positions
    .map((p) => {
      const b = bodies.find((x) => x.key === p.key);
      return `${b?.name} in ${index?.constellations[p.con] ?? p.con}`;
    })
    .join(', ');

  const raLabels = [
    { ra: RA0 + 90, text: `${(RA0 / 15 + 6) % 24}h` },
    { ra: RA0, text: `${RA0 / 15}h` },
    { ra: RA0 - 90, text: `${(RA0 / 15 + 18) % 24}h` },
  ];
  const decLabels = [60, 30, -30, -60];

  return (
    <figure className="sky">
      <figcaption className="sky-cap">
        <h2 className="sky-title">In our sky</h2>
      </figcaption>
      <div className="sky-plot" ref={box}>
        {!(width > 0 && layers) && !error && <Skeleton className="absolute inset-0" />}
        {width > 0 && layers && (
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`Star chart of the whole sky in an equal area projection, right ascension growing to the left. ${lit ? `${litName} is in ${index?.constellations[lit.con] ?? lit.con}. ` : ''}${summary}.`}
          >
            <ellipse className="sky-edge" cx={cx} cy={cy} rx={rx} ry={ry} />
            {layers.grid.map((d, i) => (
              <path key={i} className={i === 2 ? 'sky-equator' : 'sky-grid'} d={d} />
            ))}
            <path className="sky-figures" d={layers.figures} />
            {layers.bins.map((d, i) => (
              <path key={i} className="sky-stars" d={d} strokeWidth={BIN_R[i] * 2 * sz} strokeOpacity={BIN_O[i]} />
            ))}
            {raLabels.map((l) => {
              const [x, y] = px(l.ra, 0);
              return (
                <text key={l.text} className="sky-tick" x={x} y={y - 6} textAnchor="middle">
                  {l.text}
                </text>
              );
            })}
            {!narrow &&
              decLabels.map((dec) => {
                const [x, y] = px(RA0, dec);
                return (
                  <text key={dec} className="sky-tick" x={x + 6} y={y - 5}>
                    {decText(dec).replace('.0', '')}
                  </text>
                );
              })}
            {marks.map((m) => {
              const on = m.key === highlight;
              const world = m.body.kind === 'world';
              const r = (world ? (m.key === 'moon' ? 6.5 : 4.5) : 6) * (narrow ? 0.8 : 1);
              return (
                <g key={m.key} className={`sky-mark${on ? ' on' : ''}${world ? ' world' : ' probe'}`}>
                  <title>{`${m.body.name}, in ${index?.constellations[m.con] ?? m.con}, RA ${raText(m.ra)}, Dec ${decText(m.dec)}`}</title>
                  {world ? (
                    <circle className="sky-world" cx={m.x} cy={m.y} r={r} />
                  ) : (
                    <>
                      <circle className="sky-ring" cx={m.x} cy={m.y} r={r} />
                      {on && <circle className="sky-core" cx={m.x} cy={m.y} r={2.2} />}
                    </>
                  )}
                  {insideEllipse(m.label.x, m.label.y, cx, cy, rx + 60, ry + 40) && (
                    <text className="sky-label" x={m.label.x} y={m.label.y} textAnchor={m.label.anchor as 'start'} fontSize={m.fs}>
                      {m.text}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {error && <p className="note">Chart offline</p>}
      </div>
    </figure>
  );
}
