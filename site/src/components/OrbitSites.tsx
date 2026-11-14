import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ReactCompareSliderCssVars } from 'react-compare-slider';
import { Handle, HandleRoot, Item, Provider, Root } from 'react-compare-slider/components';
import { useReactCompareSlider } from 'react-compare-slider/hooks';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SoundClip, { type SoundClipProps } from './SoundClip';
import { stamp } from '../lib/passport';
import type { Pic } from '../lib/photos';
import './orbit.css';

export interface Mark {
  ring: [number, number];
  ringSize: number;
  metersPerPx: number;
}

export interface ViewProps {
  pic: Pic;
  alt: string;
  when: string;
  by: string;
  caption: string;
  mark?: Mark;
}

export interface SiteProps {
  id: string;
  name: string;
  tab: string;
  body: 'Moon' | 'Mars';
  where: string;
  apart: string;
  look: string;
  then: ViewProps;
  now: ViewProps;
  pair: boolean;
  stampDetail: string;
  sound?: SoundClipProps & { what: string; date: string; credit: string };
}

export interface MapProps {
  body: 'Moon' | 'Mars';
  pic: Pic;
  alt: string;
  what: string;
  year: number;
  credit: string;
  pins: { id: string; name: string; x: number; y: number }[];
}

const NICE = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const INSET = 0.32;
const ZOOM = 3;

function nice(maxMeters: number): number {
  return [...NICE].reverse().find((n) => n <= maxMeters) ?? NICE[0];
}

function Picture({ pic, alt, eager, sizes }: { pic: Pic; alt: string; eager?: boolean; sizes?: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={pic.avif} sizes={sizes ?? pic.sizes} />
      <source type="image/webp" srcSet={pic.webp} sizes={sizes ?? pic.sizes} />
      <img
        src={pic.src}
        width={pic.width}
        height={pic.height}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

function ScaleBar({ widthPx, metersPerPx, className }: { widthPx: number; metersPerPx: number; className: string }) {
  const span = widthPx * metersPerPx;
  const length = nice(span * 0.26);
  return (
    <span className={`os-scale ${className}`} aria-hidden="true">
      <span className="os-scale-bar" style={{ width: `${((length / span) * 100).toFixed(3)}cqw` }} />
      <span className="os-scale-n mono">{length} m</span>
    </span>
  );
}

function Overlay({ pic, mark }: { pic: Pic; mark: Mark }) {
  const [fx, fy] = mark.ring;
  const side = fx < 0.5 ? 'r' : 'l';
  const vert = fy < 0.5 ? 'b' : 't';
  const scaleSide = vert === 'b' ? (side === 'r' ? 'l' : 'r') : side;
  const imgW = (ZOOM / INSET) * 100;
  const aspect = pic.height / pic.width;
  const insetStyle = {
    width: `${imgW}%`,
    left: `${50 - fx * imgW}%`,
    top: `${50 - fy * imgW * aspect}%`,
  } as CSSProperties;
  return (
    <>
      <span
        className="os-ring"
        aria-hidden="true"
        style={{ left: `${fx * 100}%`, top: `${fy * 100}%`, width: `${mark.ringSize * 100}%` }}
      />
      <span className={`os-inset os-inset-${vert}${side}`} aria-hidden="true">
        <span className="os-inset-img" style={insetStyle}>
          <Picture pic={pic} alt="" sizes={`${Math.round(ZOOM * 100)}vw`} />
        </span>
        <ScaleBar widthPx={(pic.width * INSET) / ZOOM} metersPerPx={mark.metersPerPx} className="os-scale-in" />
      </span>
      <ScaleBar widthPx={pic.width} metersPerPx={mark.metersPerPx} className={`os-scale-main os-scale-${scaleSide}`} />
    </>
  );
}

function View({ view, eager }: { view: ViewProps; eager?: boolean }) {
  return (
    <figure className="os-view">
      <p className="os-when">
        <span className="mono">{view.when}</span> <span className="os-by">{view.by}</span>
      </p>
      <div className="os-frame" style={{ aspectRatio: `${view.pic.width} / ${view.pic.height}` }}>
        <Picture pic={view.pic} alt={view.alt} eager={eager} />
        {view.mark && <Overlay pic={view.pic} mark={view.mark} />}
      </div>
      <figcaption className="credit" data-credit="">
        {view.caption}
      </figcaption>
    </figure>
  );
}

function Pair({ site, onSlide }: { site: SiteProps; onSlide: () => void }) {
  const slider = useReactCompareSlider({ keyboardIncrement: '5%', onlyHandleDraggable: false });
  return (
    <figure className="os-pairfig" onPointerDownCapture={onSlide} onKeyDownCapture={onSlide}>
      <div className="os-whenrow">
        <p className="os-when">
          <span className="mono">{site.then.when}</span> <span className="os-by">{site.then.by}</span>
        </p>
        <p className="os-when os-right">
          <span className="mono">{site.now.when}</span> <span className="os-by">{site.now.by}</span>
        </p>
      </div>
      <Provider {...slider}>
        <Root className="os-compare" style={{ aspectRatio: `${site.then.pic.width} / ${site.then.pic.height}` }}>
          <Item item="itemOne">
            <div className="os-frame os-frame-fill">
              <Picture pic={site.then.pic} alt={site.then.alt} />
              {site.then.mark && <Overlay pic={site.then.pic} mark={site.then.mark} />}
            </div>
          </Item>
          <Item item="itemTwo">
            <div className="os-frame os-frame-fill">
              <Picture pic={site.now.pic} alt={site.now.alt} />
              {site.now.mark && <Overlay pic={site.now.pic} mark={site.now.mark} />}
            </div>
          </Item>
          <HandleRoot aria-label={`Compare ${site.name} on ${site.then.when}, left, and ${site.now.when}, right`}>
            <Handle
              style={{ [ReactCompareSliderCssVars.handleColor]: 'var(--lilac)' } as CSSProperties}
              buttonStyle={{
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                backgroundColor: 'var(--violet)',
                boxShadow: 'none',
                width: 44,
                height: 44,
              }}
              linesStyle={{ boxShadow: 'none' }}
            />
          </HandleRoot>
        </Root>
      </Provider>
      <figcaption className="credit" data-credit="">
        {site.then.caption}
      </figcaption>
    </figure>
  );
}

function SiteMap({ map, active, onPick, eager }: { map: MapProps; active: string; onPick: (id: string) => void; eager?: boolean }) {
  return (
    <figure className={`os-map os-map-${map.body.toLowerCase()}`}>
      <div className="os-map-frame" style={{ aspectRatio: `${map.pic.width} / ${map.pic.height}` }}>
        <Picture pic={map.pic} alt={map.alt} eager={eager} />
        {map.pins.map((p) => (
          <Tooltip key={p.id}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={p.id === active ? 'selected' : 'secondary'}
                className="os-pin"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-label={`Show ${p.name}`}
                aria-pressed={p.id === active}
                onClick={() => onPick(p.id)}
              />
            </TooltipTrigger>
            <TooltipContent side="top">{p.name}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <figcaption className="credit">
        {map.what}, <span className="mono">{map.year}</span>. <span data-credit="">{map.credit}.</span>
      </figcaption>
    </figure>
  );
}

export default function OrbitSites({ sites, maps, first, head }: { sites: SiteProps[]; maps: MapProps[]; first: string; head?: ReactNode }) {
  const [active, setActive] = useState(first);
  const slid = useRef(new Set<string>());
  const site = sites.find((s) => s.id === active) ?? sites[0];

  function open(id: string) {
    setActive(id);
    const hit = sites.find((s) => s.id === id);
    if (hit) stamp(hit.id, hit.stampDetail);
  }

  function slide(s: SiteProps) {
    if (slid.current.has(s.id)) return;
    slid.current.add(s.id);
    stamp(s.id, s.stampDetail);
  }

  return (
    <TooltipProvider>
      <Tabs value={active} onValueChange={open} className="os">
        <div className="wrap os-head">
          <div className="os-intro">{head}</div>
          <div className="os-maps">
            {maps.map((m, i) => (
              <div className="os-mapcol" key={m.body}>
                <SiteMap map={m} active={active} onPick={open} eager={i === 0} />
                <TabsList aria-label={`${m.body} landing sites`} className="os-list">
                  {sites
                    .filter((s) => s.body === m.body)
                    .map((s) => (
                      <TabsTrigger key={s.id} value={s.id} aria-label={s.tab === s.name ? undefined : s.name}>
                        {s.tab}
                      </TabsTrigger>
                    ))}
                </TabsList>
              </div>
            ))}
          </div>
          <div className="os-read" aria-live="polite">
            <p className="os-meta">
              <span className="mono">{site.where}</span>
              <span className="mono">{site.apart}</span>
            </p>
            <p className="os-look">{site.look}</p>
          </div>
        </div>
        {sites.map((s) => (
          <TabsContent key={s.id} value={s.id} className="wrap os-panel">
            {s.pair ? (
              <Pair site={s} onSlide={() => slide(s)} />
            ) : (
              <div className="os-pair">
                <View view={s.then} />
                <View view={s.now} />
              </div>
            )}
            {s.sound && (
              <div className="os-sound">
                <SoundClip {...s.sound}>
                  {s.sound.what}, <span className="mono">{s.sound.date}</span>.{' '}
                  <span data-credit="">{s.sound.credit}.</span>
                </SoundClip>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </TooltipProvider>
  );
}
