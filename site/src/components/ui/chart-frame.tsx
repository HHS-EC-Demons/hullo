import { Suspense, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function ChartFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('hl-chart-frame', className)}>
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}
