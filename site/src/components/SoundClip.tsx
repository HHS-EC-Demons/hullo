import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { stamp } from '../lib/passport';
import { asset } from '../lib/paths';
import './sound.css';

export interface SoundClipProps {
  src: string;
  peaks: number[];
  duration: number;
  label: string;
  stampId?: string;
  stampDetail?: string;
  children?: ReactNode;
}

function clock(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function css(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function SoundClip({ src, peaks, duration, label, stampId, stampDetail, children }: SoundClipProps) {
  const wave = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const ws = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let live = true;
    let instance: WaveSurfer | null = null;
    import('wavesurfer.js').then(({ default: WS }) => {
      if (!live || !wave.current || !audio.current) return;
      instance = WS.create({
        container: wave.current,
        media: audio.current,
        peaks: [peaks],
        duration,
        height: 64,
        barWidth: 2,
        barGap: 2,
        barRadius: 1,
        barMinHeight: 1,
        normalize: true,
        cursorWidth: 2,
        cursorColor: css('--ink-text', '#eeeaf9'),
        waveColor: css('--edge', '#6f6889'),
        progressColor: css('--lilac', '#b6a6ff'),
        dragToSeek: true,
      });
      instance.on('timeupdate', (t) => {
        if (time.current) time.current.textContent = clock(t);
      });
      instance.on('seeking', (t) => setNow(Math.round(t)));
      instance.on('interaction', (t) => setNow(Math.round(t)));
      instance.on('play', () => {
        setPlaying(true);
        if (stampId) stamp(stampId, stampDetail ?? label);
      });
      instance.on('pause', () => {
        setPlaying(false);
        setNow(Math.round(instance?.getCurrentTime() ?? 0));
      });
      instance.on('finish', () => setPlaying(false));
      ws.current = instance;
      setReady(true);
    });
    return () => {
      live = false;
      instance?.destroy();
      ws.current = null;
    };
  }, [src]);

  function toggle() {
    const w = ws.current;
    if (!w) return;
    void w.playPause();
  }

  function seekBy(delta: number) {
    const w = ws.current;
    if (!w) return;
    const t = Math.min(duration, Math.max(0, w.getCurrentTime() + delta));
    w.setTime(t);
    setNow(Math.round(t));
    if (time.current) time.current.textContent = clock(t);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const w = ws.current;
    if (!w) return;
    const keys: Record<string, () => void> = {
      ArrowRight: () => seekBy(5),
      ArrowUp: () => seekBy(5),
      ArrowLeft: () => seekBy(-5),
      ArrowDown: () => seekBy(-5),
      PageUp: () => seekBy(30),
      PageDown: () => seekBy(-30),
      Home: () => seekBy(-duration),
      End: () => seekBy(duration),
      ' ': toggle,
      Enter: toggle,
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  }

  return (
    <figure className="sc">
      <div className="sc-row">
        <Button
          type="button"
          variant="line"
          className="sc-play"
          onClick={toggle}
          disabled={!ready}
          aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}
        >
          {playing ? 'Pause' : 'Play'}
        </Button>
        <div
          ref={wave}
          className="sc-wave"
          role="slider"
          tabIndex={0}
          aria-label={`${label}, playback position`}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={now}
          aria-valuetext={`${clock(now)} of ${clock(duration)}`}
          onKeyDown={onKey}
        />
        <p className="sc-time mono" aria-hidden="true">
          <span ref={time}>0:00</span>
          <span className="sc-of"> / {clock(duration)}</span>
        </p>
      </div>
      <audio ref={audio} src={asset(src)} preload="none" />
      {children && <figcaption className="credit">{children}</figcaption>}
    </figure>
  );
}
