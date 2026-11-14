import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Pic } from '../lib/photos';
import './eyes.css';

export default function EyesEmbed({ src, title, button, poster, alt }: { src: string; title: string; button: string; poster: Pic; alt: string }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  return (
    <div className={`ey-frame${open ? '' : ' ph'}`} style={{ aspectRatio: `${poster.width} / ${poster.height}` }}>
      {open ? (
        <>
          <iframe className="ey-app" src={src} title={title} allow="fullscreen; xr-spatial-tracking" allowFullScreen onLoad={() => setReady(true)} />
          {!ready && <Skeleton className="absolute inset-0 z-[1]" />}
        </>
      ) : (
        <>
          <picture>
            <source type="image/avif" srcSet={poster.avif} sizes={poster.sizes} />
            <source type="image/webp" srcSet={poster.webp} sizes={poster.sizes} />
            <img src={poster.src} width={poster.width} height={poster.height} alt={alt} loading="lazy" decoding="async" />
          </picture>
          <Button type="button" variant="secondary" className="ey-open" onClick={() => setOpen(true)}>
            {button}
          </Button>
        </>
      )}
    </div>
  );
}
