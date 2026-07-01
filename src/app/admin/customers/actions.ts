"use server";

import { revalidatePath } from "next/cache";
import { CustomerRepository } from "@/lib/repositories/customer-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

export async function updateCustomer(formData: FormData): Promise<void> {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  const id = String(formData.get("id"));

  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await new CustomerRepository(supabase, ctx.tenant.id).updateNotesTags(id, {
    notes: String(formData.get("notes") ?? "") || null,
    tags,
  });
  revalidatePath(`/admin/customers/${id}`);
}
