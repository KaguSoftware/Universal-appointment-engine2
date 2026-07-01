import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Emails allowed to access the platform super-admin surface. */
export function superadminEmails(): string[] {
  return (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isSuperadminEmail(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  return superadminEmails().includes(email.toLowerCase());
}

/** Redirects non-super-admins away from the /superadmin surface. */
export async function requireSuperadmin(): Promise<{ email: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/superadmin");
  if (!(await isSuperadminEmail(user.email))) redirect("/");
  return { email: user.email! };
}
