import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Membership, MembershipRole, Tenant } from "@/lib/types";

/**
 * Resolves the current user's tenant + role for admin/staff surfaces.
 * Encapsulates the "who am I and which tenant am I acting on" question.
 */
export class TenantContext {
  private constructor(
    readonly userId: string,
    readonly tenant: Tenant,
    readonly role: MembershipRole,
  ) {}

  get isAdmin(): boolean {
    return this.role === "admin";
  }

  /**
   * Loads the first tenant the signed-in user belongs to. Redirects to login
   * when unauthenticated and to onboarding when the user has no membership.
   */
  static async require(): Promise<TenantContext> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");

    const { data: membership } = await supabase
      .from("memberships")
      .select("*, tenants(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle<Membership & { tenants: Tenant }>();

    if (!membership) redirect("/onboarding");

    return new TenantContext(user.id, membership.tenants, membership.role);
  }

  requireAdmin(): void {
    if (!this.isAdmin) redirect("/admin");
  }
}
