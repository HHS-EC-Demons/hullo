import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function ChartFrame({ className, children }: { className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return (
    <div ref={box} className={cn('hl-chart-frame', className)}>
      {near && <Suspense fallback={null}>{children}</Suspense>}
    </div>
  );
}
