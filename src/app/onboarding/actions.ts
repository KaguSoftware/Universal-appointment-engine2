"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantProvisioner } from "@/lib/tenant/tenant-provisioner";
import { VERTICAL_PRESETS } from "@/lib/verticals";

const schema = z.object({
  businessName: z.string().min(2).max(80),
  vertical: z.enum(
    Object.keys(VERTICAL_PRESETS) as [keyof typeof VERTICAL_PRESETS],
  ),
  timezone: z.string().min(1),
});

export interface OnboardingState {
  error?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createTenant(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    businessName: formData.get("businessName"),
    vertical: formData.get("vertical"),
    timezone: formData.get("timezone") || "UTC",
  });
  if (!parsed.success) return { error: "Please check the form fields." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const slug = `${slugify(parsed.data.businessName)}-${user.id.slice(0, 6)}`;

  try {
    await new TenantProvisioner().provision({
      ownerUserId: user.id,
      ownerName: (user.user_metadata.full_name as string) ?? "",
      businessName: parsed.data.businessName,
      slug,
      vertical: parsed.data.vertical,
      timezone: parsed.data.timezone,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create business." };
  }

  redirect("/admin");
}
