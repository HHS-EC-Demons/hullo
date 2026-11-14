import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { stampCount } from '../lib/passport';

export interface NavItem {
  key: string;
  href: string;
  label: string;
}

interface Props {
  items: NavItem[];
  passport: NavItem | null;
  extra: { href: string; label: string }[];
  current: string;
  stampTotal: number;
}

export default function NavMenu({ items, passport, extra, current, stampTotal }: Props) {
  const [open, setOpen] = useState(false);
  const [stamps, setStamps] = useState(0);

  useEffect(() => {
    if (open) setStamps(stampCount());
  }, [open]);

  const rows = passport ? [...items, passport] : items;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="press-sm press-nav press-hit nav-menu-btn px-3.5">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="right" closeLabel="Close" className="gap-0 [@media(max-height:30rem)]:w-[92%] [@media(max-height:30rem)]:max-w-2xl">
        <div className="px-5 pt-5 pb-3 [@media(max-height:30rem)]:pt-3.5 [@media(max-height:30rem)]:pb-2">
          <SheetTitle>Chapters</SheetTitle>
          <SheetDescription className="sr-only">Pages of this site.</SheetDescription>
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
                    className="press press-sm press-nav flex w-full items-baseline justify-between gap-4 px-3.5 py-2.5 text-left"
                  >
                    <span className={`text-base text-text ${here ? 'font-extrabold' : 'font-bold'}`}>{item.label}</span>
                    {item === passport && (
                      <span className={`mono min-w-[7ch] text-right text-sm font-normal ${here ? 'text-text' : 'text-muted-foreground'}`}>
                        {stamps} of {stampTotal}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <ul className="mt-auto flex flex-wrap gap-3 px-5 pt-6 pb-8 [@media(max-height:48rem)]:pt-4 [@media(max-height:48rem)]:pb-5">
          {extra.map((e) => (
            <li key={e.href}>
              <a href={e.href} className="press press-sm press-nav press-hit px-3.5">
                {e.label}
              </a>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
