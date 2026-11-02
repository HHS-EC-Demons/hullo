import { useEffect, useRef, type RefObject } from 'react';

/**
 * Calls `tick` every animation frame while the page is visible and `el` is on
 * screen, or once a second when the reader prefers reduced motion or `slow`
 * is set. Ticks write to the DOM directly, so React never re-renders per frame.
 */
export function runFrames(el: Element | null, tick: (now: number) => void, slow = false): () => void {
  let onScreen = true;
  let raf = 0;
  let timer = 0;
  let stopped = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const stop = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    raf = 0;
    timer = 0;
  };

  const frame = () => {
    raf = 0;
    if (stopped || !onScreen || document.visibilityState === 'hidden') return;
    tick(Date.now());
    raf = requestAnimationFrame(frame);
  };

  const second = () => {
    timer = 0;
    if (stopped || !onScreen || document.visibilityState === 'hidden') return;
    tick(Date.now());
    timer = window.setTimeout(second, 1000 - (Date.now() % 1000) + 5);
  };

  const start = () => {
    stop();
    if (stopped || !onScreen || document.visibilityState === 'hidden') return;
    if (slow || reduced.matches) second();
    else raf = requestAnimationFrame(frame);
  };

  const io = el
    ? new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        start();
      })
    : null;
  if (el && io) io.observe(el);

  document.addEventListener('visibilitychange', start);
  reduced.addEventListener('change', start);
  tick(Date.now());
  start();

  return () => {
    stopped = true;
    stop();
    io?.disconnect();
    document.removeEventListener('visibilitychange', start);
    reduced.removeEventListener('change', start);
  };
}

/** React wrapper for `runFrames`, restarted whenever `deps` change. */
export function useFrames<T extends Element>(
  ref: RefObject<T | null>,
  tick: ((now: number) => void) | null,
  deps: unknown[],
  slow = false,
): void {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (!tickRef.current) return;
    return runFrames(ref.current, (now) => tickRef.current?.(now), slow);
  }, [...deps, slow]);
}

/** Sets text only when it changed, so idle frames cost no layout. */
export function setText(el: HTMLElement | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}
