"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, ScanLine, Store, UserCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/check", label: "Check", icon: ScanLine },
  { href: "/history", label: "History", icon: History },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4 gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/check" && pathname.startsWith(href));

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive && "bg-accent text-accent-foreground",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppHomeLink() {
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
      href="/"
    >
      <Home aria-hidden="true" className="size-4" />
      Landing
    </Link>
  );
}
