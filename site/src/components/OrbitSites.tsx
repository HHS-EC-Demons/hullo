import { useRef, useState, type CSSProperties } from 'react';
import { ReactCompareSlider, ReactCompareSliderCssVars, ReactCompareSliderHandle } from 'react-compare-slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SoundClip, { type SoundClipProps } from './SoundClip';
import { stamp } from '../lib/passport';
import type { Pic } from '../lib/photos';
import './orbit.css';

export interface ViewProps {
  pic: Pic;
  alt: string;
  when: string;
  by: string;
  caption: string;
  ring?: [number, number];
}

export interface SiteProps {
  id: string;
  name: string;
  where: string;
  apart: string;
  then: ViewProps;
  now: ViewProps;
  pair: boolean;
  stampDetail: string;
  sound?: SoundClipProps & { caption: string };
}

function Picture({ view, eager }: { view: ViewProps; eager?: boolean }) {
  return (
    <picture>
      <source type="image/avif" srcSet={view.pic.avif} sizes={view.pic.sizes} />
      <source type="image/webp" srcSet={view.pic.webp} sizes={view.pic.sizes} />
      <img
        src={view.pic.src}
        width={view.pic.width}
        height={view.pic.height}
        alt={view.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

function View({ view, eager }: { view: ViewProps; eager?: boolean }) {
  return (
    <figure className="os-view">
      <p className="os-when">
        <span className="mono">{view.when}</span> <span className="os-by">{view.by}</span>
      </p>
      <div className="os-frame" style={{ aspectRatio: `${view.pic.width} / ${view.pic.height}` }}>
        <Picture view={view} eager={eager} />
        {view.ring && (
          <span
            className="os-ring"
            aria-hidden="true"
            style={{ left: `${view.ring[0]}%`, top: `${view.ring[1]}%` }}
          />
        )}
      </div>
      <figcaption className="credit">{view.caption}</figcaption>
    </figure>
  );
}

function Pair({ site, onSlide }: { site: SiteProps; onSlide: () => void }) {
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
      <ReactCompareSlider
        className="os-compare"
        style={{ aspectRatio: `${site.then.pic.width} / ${site.then.pic.height}` }}
        itemOne={<Picture view={site.then} />}
        itemTwo={<Picture view={site.now} />}
        keyboardIncrement="5%"
        onlyHandleDraggable={false}
        aria-label={`Slide to compare ${site.name} in ${site.then.when} and ${site.now.when}`}
        handle={
          <ReactCompareSliderHandle
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
        }
      />
      <figcaption className="credit">{site.then.caption} Left is {site.then.when}, right is {site.now.when}. Drag the handle or use the arrow keys.</figcaption>
    </figure>
  );
}

export default function OrbitSites({ label, sites, first }: { label: string; sites: SiteProps[]; first: string }) {
  const [active, setActive] = useState(first);
  const slid = useRef(new Set<string>());

  function open(id: string) {
    setActive(id);
    const site = sites.find((s) => s.id === id);
    if (site) stamp(site.id, site.stampDetail);
  }

  function slide(site: SiteProps) {
    if (slid.current.has(site.id)) return;
    slid.current.add(site.id);
    stamp(site.id, site.stampDetail);
  }

  return (
    <Tabs value={active} onValueChange={open} className="os">
      <TabsList aria-label={label} className="os-list">
        {sites.map((s) => (
          <TabsTrigger key={s.id} value={s.id}>
            {s.name}
          </TabsTrigger>
        ))}
      </TabsList>
      {sites.map((s) => (
        <TabsContent key={s.id} value={s.id} className="os-panel">
          {s.pair ? (
            <Pair site={s} onSlide={() => slide(s)} />
          ) : (
            <div className="os-pair">
              <View view={s.then} eager={s.id === first} />
              <View view={s.now} eager={s.id === first} />
            </div>
          )}
          <p className="os-meta">
            <span className="mono">{s.where}</span>
            <span className="mono">{s.apart}</span>
          </p>
          {s.sound && (
            <div className="os-sound">
              <SoundClip {...s.sound}>{s.sound.caption}</SoundClip>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
