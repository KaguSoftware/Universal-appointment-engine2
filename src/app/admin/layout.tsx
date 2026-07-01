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
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-gray-50 p-4 dark:bg-gray-900">
        <div className="mb-6">
          <p className="font-semibold">{ctx.tenant.name}</p>
          <p className="text-xs uppercase text-gray-400">
            {ctx.tenant.plan} plan
          </p>
        </div>
        <nav className="space-y-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-2 py-1.5 hover:bg-gray-200 dark:hover:bg-gray-800"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={`/book/${ctx.tenant.slug}`}
            className="block rounded px-2 py-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            View booking page ↗
          </Link>
        </nav>
        <form action={signOut} className="mt-6">
          <button className="text-sm text-gray-500 underline">Sign out</button>
        </form>
        <p className="mt-6 text-xs text-gray-400">
          {terms.provider} · {terms.customer}
        </p>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
