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
        <Button variant="secondary" className="press-sm press-hit nav-menu-btn px-3.5">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="right" closeLabel="Close" className="gap-0 [@media(max-height:30rem)]:w-[92%] [@media(max-height:30rem)]:max-w-2xl">
        <div className="px-5 pt-5 pb-3 [@media(max-height:30rem)]:pt-3.5 [@media(max-height:30rem)]:pb-2">
          <SheetTitle>Chapters</SheetTitle>
          <SheetDescription className="sr-only">Pages of this site with a live figure for each.</SheetDescription>
        </div>
        <nav aria-label="Chapters" className="px-5">
          <ul className="grid gap-2.5 pb-1 [@media(max-height:30rem)]:grid-cols-2">
            {rows.map((item) => {
              const here = current === item.key;
              return (
                <li key={item.key}>
                  <a
                    href={item.href}
                    aria-current={here ? 'page' : undefined}
                    className="press press-sm grid w-full grid-cols-[1fr_auto] items-baseline justify-items-start gap-x-4 gap-y-0.5 px-3.5 py-2.5 text-left whitespace-normal"
                  >
                    <span className={`text-base text-text ${here ? 'font-extrabold' : 'font-bold'}`}>{item.label}</span>
                    <span className={`mono min-w-[11ch] justify-self-end text-right text-sm font-normal ${here ? 'text-text' : 'text-muted-foreground'}`}>
                      {figureText(item, fig, stamps, stampTotal) || ' '}
                    </span>
                    <span className="col-span-2 text-xs font-normal text-muted-foreground [@media(max-height:48rem)]:sr-only">{item.meaning}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <ul className="mt-auto flex flex-wrap gap-3 px-5 pt-6 pb-8 [@media(max-height:48rem)]:pt-4 [@media(max-height:48rem)]:pb-5">
          {extra.map((e) => (
            <li key={e.href}>
              <a href={e.href} className="press press-sm press-hit px-3.5">
                {e.label}
              </a>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
