import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { TenantContext } from "@/lib/tenant/tenant-context";
import { resolveTerminology } from "@/lib/verticals";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const ctx = await TenantContext.require();
  const terms = resolveTerminology(ctx.tenant);

  return (
    <div className="flex min-h-screen gap-6 p-4">
      <aside className="glass sticky top-4 flex h-[calc(100vh-2rem)] w-60 shrink-0 flex-col p-5">
        <div className="mb-8">
          <p className="text-lg font-semibold tracking-tight">
            {ctx.tenant.name}
          </p>
          <span className="badge mt-2">{ctx.tenant.plan} plan</span>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-lg px-3 py-2 font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={`/book/${ctx.tenant.slug}`}
            className="link-muted block rounded-lg px-3 py-2"
          >
            View booking page ↗
          </Link>
        </nav>
        <div className="mt-auto space-y-4 pt-6">
          <form action={signOut}>
            <button className="link-muted text-sm">Sign out</button>
          </form>
          <p className="text-xs text-faint">
            {terms.provider} · {terms.customer}
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 py-4 pr-2">{children}</main>
    </div>
  );
}
