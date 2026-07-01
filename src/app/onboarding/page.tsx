import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VERTICAL_LIST } from "@/lib/verticals";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: existing } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <OnboardingForm verticals={VERTICAL_LIST} />
    </main>
  );
}
