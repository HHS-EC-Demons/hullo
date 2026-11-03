import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Pic } from '../lib/photos';
import './eyes.css';

export default function EyesEmbed({ src, title, button, poster, alt }: { src: string; title: string; button: string; poster: Pic; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ey-frame" style={{ aspectRatio: `${poster.width} / ${poster.height}` }}>
      {open ? (
        <iframe className="ey-app" src={src} title={title} allow="fullscreen; xr-spatial-tracking" allowFullScreen />
      ) : (
        <>
          <picture>
            <source type="image/avif" srcSet={poster.avif} sizes={poster.sizes} />
            <source type="image/webp" srcSet={poster.webp} sizes={poster.sizes} />
            <img src={poster.src} width={poster.width} height={poster.height} alt={alt} loading="lazy" decoding="async" />
          </picture>
          <Button type="button" variant="primary" size="lg" className="ey-open" onClick={() => setOpen(true)}>
            {button}
          </Button>
        </>
      )}
    </div>
  );
}
