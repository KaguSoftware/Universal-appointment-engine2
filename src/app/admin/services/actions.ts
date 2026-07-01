"use server";

import { revalidatePath } from "next/cache";
import { ServiceRepository } from "@/lib/repositories/service-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantContext } from "@/lib/tenant/tenant-context";

async function repo() {
  const ctx = await TenantContext.require();
  const supabase = await createSupabaseServerClient();
  return new ServiceRepository(supabase, ctx.tenant.id);
}

function parse(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "") || null,
    duration_min: Number(formData.get("duration_min") ?? 30),
    buffer_before_min: Number(formData.get("buffer_before_min") ?? 0),
    buffer_after_min: Number(formData.get("buffer_after_min") ?? 0),
    price: Number(formData.get("price") ?? 0),
    active: formData.get("active") === "on",
  };
}

export async function createService(formData: FormData): Promise<void> {
  await (await repo()).create(parse(formData));
  revalidatePath("/admin/services");
}

export async function updateService(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await (await repo()).update(id, parse(formData));
  revalidatePath("/admin/services");
}

export async function deleteService(formData: FormData): Promise<void> {
  await (await repo()).remove(String(formData.get("id")));
  revalidatePath("/admin/services");
}
