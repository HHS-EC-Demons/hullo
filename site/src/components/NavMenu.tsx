import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getFigures, shortHms, subscribeFigures, type NavFigures } from '../lib/nav-live';
import { stampCount } from '../lib/passport';

export interface NavItem {
  key: string;
  href: string;
  label: string;
  live?: 'v1' | 'moon' | 'stamps';
  figure?: string;
  meaning: string;
}

interface Props {
  items: NavItem[];
  passport: NavItem | null;
  extra: { href: string; label: string }[];
  current: string;
  stampTotal: number;
}

function figureText(item: NavItem, f: NavFigures, stamps: number, total: number): string {
  if (item.live === 'v1') return f.v1LightS === null ? '' : shortHms(f.v1LightS);
  if (item.live === 'moon') return f.moonEchoS === null ? '' : `${f.moonEchoS.toFixed(2)} s echo`;
  if (item.live === 'stamps') return `${stamps} of ${total}`;
  return item.figure ?? '';
}

export default function NavMenu({ items, passport, extra, current, stampTotal }: Props) {
  const [open, setOpen] = useState(false);
  const [fig, setFig] = useState<NavFigures>(getFigures);
  const [stamps, setStamps] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStamps(stampCount());
    return subscribeFigures(setFig);
  }, [open]);

  const rows = passport ? [...items, passport] : items;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="quiet" size="sm" className="nav-menu-btn">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="right" closeLabel="Close" className="gap-0 overflow-y-auto">
        <div className="px-5 pt-5 pb-3">
          <SheetTitle>Chapters</SheetTitle>
          <SheetDescription className="sr-only">Pages of this site with a live figure for each.</SheetDescription>
        </div>
        <nav aria-label="Chapters">
          <ul className="border-t border-rule">
            {rows.map((item) => {
              const here = current === item.key;
              return (
                <li key={item.key} className="border-b border-rule">
                  <a
                    href={item.href}
                    aria-current={here ? 'page' : undefined}
                    className={`grid min-h-16 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 px-5 py-3 no-underline ${here ? 'shadow-[inset_3px_0_0_var(--lilac)]' : ''}`}
                  >
                    <span className={`text-lg ${here ? 'font-bold text-text' : 'font-semibold text-text'}`}>{item.label}</span>
                    <span className="mono min-w-[11ch] text-right text-sm text-text">
                      {figureText(item, fig, stamps, stampTotal) || ' '}
                    </span>
                    <span className="col-span-2 text-xs text-muted-foreground">{item.meaning}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <ul className="mt-auto flex flex-wrap gap-x-6 px-5 pt-6 pb-8">
          {extra.map((e) => (
            <li key={e.href}>
              <a href={e.href} className="inline-flex min-h-11 items-center text-sm">
                {e.label}
              </a>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
