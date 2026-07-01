import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { TenantTheme } from "@/components/theme/tenant-theme";
import { BookingRepository } from "@/lib/booking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveTerminology } from "@/lib/verticals";

export default async function BookLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const tenant = await new BookingRepository(supabase).getTenant(slug);
  if (!tenant) notFound();

  const terms = resolveTerminology(tenant);

  return (
    <TenantTheme tenant={tenant}>
      <div className="mx-auto min-h-screen w-full max-w-xl px-6 py-12">
        <header className="mb-8">
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: "var(--brand)" }}
          >
            {tenant.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Book your {terms.appointment.toLowerCase()}
          </p>
        </header>
        <div className="glass p-6 sm:p-8">{children}</div>
      </div>
    </TenantTheme>
  );
}
