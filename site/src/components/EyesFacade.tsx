import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import './eyes.css';

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
  app: string;
  sizes: string;
  className?: string;
}

export default function EyesFacade({ poster, src, title, label, app, sizes, className }: Props) {
  const [open, setOpen] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  return (
    <figure className={`eyes${className ? ` ${className}` : ''}`}>
      <div className="eyes-stage">
        {open ? (
          <iframe ref={frame} src={src} title={title} allow="fullscreen" allowFullScreen onLoad={() => frame.current?.focus()} />
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
            <Button className="eyes-btn" onClick={() => setOpen(true)}>
              {label}
            </Button>
          </>
        )}
      </div>
      <figcaption className="credit">
        {open ? (
          <span data-credit="">
            <a href={src} rel="noopener" target="_blank">
              {app}
            </a>
            , NASA/JPL-Caltech.
          </span>
        ) : (
          <>
            {poster.caption}. <span data-credit="">{poster.id}, {poster.credit}.</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
