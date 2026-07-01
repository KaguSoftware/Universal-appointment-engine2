import type { ReactNode } from "react";
import type { Tenant } from "@/lib/types";
import { resolveThemeColors } from "@/lib/verticals";

/**
 * Wraps a tenant-scoped subtree and exposes the tenant's brand colors as CSS
 * custom properties (`--brand`, `--brand-accent`) for descendants to consume.
 */
export function TenantTheme({
  tenant,
  children,
}: {
  tenant: Tenant;
  children: ReactNode;
}) {
  const { primary, accent } = resolveThemeColors(tenant);
  return (
    <div
      style={
        {
          "--brand": primary,
          "--brand-accent": accent,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
