import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { AdminNav } from "@/components/admin/admin-nav";
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
    <div className="flex min-h-screen">
      <aside className="glass-strong animate-fade sticky top-0 z-10 m-3 flex h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col rounded-[var(--radius)] p-5">
        <div className="mb-8">
          <p className="text-lg font-semibold tracking-tight">
            {ctx.tenant.name}
          </p>
          <span className="badge mt-2">{ctx.tenant.plan} plan</span>
        </div>
        <AdminNav items={NAV} />
        <Link
          href={`/book/${ctx.tenant.slug}`}
          className="link-muted mt-1 block rounded-[0.7rem] px-3 py-2 text-sm"
        >
          View booking page ↗
        </Link>
        <div className="mt-auto space-y-4 pt-6">
          <form action={signOut}>
            <button className="link-muted text-sm">Sign out</button>
          </form>
          <p className="text-xs text-faint">
            {terms.provider} · {terms.customer}
          </p>
        </div>
      </aside>
      <main className="animate-rise min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
