"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, UtensilsCrossed, CalendarClock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/admin/today", label: "Today", icon: MapPin },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/history", label: "History", icon: CalendarClock },
];

/** Fixed bottom tab bar. Dark nav surface, active tab in rust. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-800 bg-admin-nav-bg pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors duration-fast ease-default",
                  active
                    ? "text-admin-nav-active"
                    : "text-admin-nav-text/60 hover:text-admin-nav-text"
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
