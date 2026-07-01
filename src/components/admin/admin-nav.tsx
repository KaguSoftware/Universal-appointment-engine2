"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 text-sm">
      {items.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative block rounded-[0.7rem] px-3 py-2 font-medium transition-all duration-200 ${
              active
                ? "bg-[var(--surface-strong)] text-foreground shadow-[var(--shadow-glass)]"
                : "text-muted hover:bg-[var(--subtle)] hover:text-foreground"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-brand" />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
