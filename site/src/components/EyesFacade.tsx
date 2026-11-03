import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import './eyes-facade.css';

export interface Poster {
  avif: string;
  webp: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  id: string;
  credit: string;
  focus?: string;
}

interface Props {
  poster: Poster;
  src: string;
  title: string;
  label: string;
  sizes: string;
  className?: string;
}

export default function EyesFacade({ poster, src, title, label, sizes, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  return (
    <figure className={`eyes${className ? ` ${className}` : ''}`}>
      <div className={`eyes-stage ph${loaded ? ' ph-done' : ''}`}>
        {open ? (
          <iframe ref={frame} src={src} title={title} allow="fullscreen" allowFullScreen onLoad={() => {
              setLoaded(true);
              frame.current?.focus();
            }} />
        ) : (
          <>
            <picture>
              <source type="image/avif" srcSet={poster.avif} sizes={sizes} />
              <source type="image/webp" srcSet={poster.webp} sizes={sizes} />
              <img
                src={poster.src}
                width={poster.width}
                height={poster.height}
                alt={poster.alt}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: poster.focus ?? '50% 50%' }}
              />
            </picture>
            <Button variant="secondary" className="eyes-btn" onClick={() => setOpen(true)}>
              {label}
            </Button>
          </>
        )}
      </div>
    </figure>
  );
}
