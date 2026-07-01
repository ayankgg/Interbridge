'use client';

import { ThemeToggle } from '@/components/shared/theme-toggle';
import { NotificationCenter } from './notification-center';
import { UserNav } from './user-nav';
import { MobileNav } from './mobile-nav';
import type { NavItem } from './nav-config';

export function Navbar({ items, homeHref }: { items: NavItem[]; homeHref: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <MobileNav items={items} homeHref={homeHref} />
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationCenter />
        <UserNav />
      </div>
    </header>
  );
}
