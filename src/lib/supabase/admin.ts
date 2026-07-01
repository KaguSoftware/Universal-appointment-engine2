import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client that BYPASSES Row-Level Security. Use only in trusted
 * server contexts (webhooks, super-admin actions, seeding). Never expose to
 * the browser.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
