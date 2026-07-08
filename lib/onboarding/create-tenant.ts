import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { TenantSegment } from "@/types";

type CreateTenantInput = {
  name: string;
  slug: string;
  segment: TenantSegment;
  userId: string;
};

type CreateTenantResult =
  | { success: true; tenantId: string; slug: string }
  | { success: false; error: { message: string; code?: string } };

export async function createTenantWithOwner(
  supabase: SupabaseClient<Database>,
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const tenantId = crypto.randomUUID();

  const { error: tenantError } = await supabase.from("tenants").insert({
    id: tenantId,
    name: input.name.trim(),
    slug: input.slug,
    segment: input.segment,
  });

  if (tenantError) {
    return {
      success: false,
      error: { message: tenantError.message, code: tenantError.code },
    };
  }

  const { error: memberError } = await supabase.from("tenant_members").insert({
    tenant_id: tenantId,
    user_id: input.userId,
    role: "owner",
  });

  if (memberError) {
    return {
      success: false,
      error: { message: memberError.message, code: memberError.code },
    };
  }

  return { success: true, tenantId, slug: input.slug };
}

export function slugifyTenantName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getTenantSlugConflictMessage() {
  return "Este identificador já está em uso. Escolha outro nome para a empresa.";
}
