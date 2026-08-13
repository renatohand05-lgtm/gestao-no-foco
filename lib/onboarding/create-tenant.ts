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

type RpcRow = {
  out_tenant_id?: string;
  out_slug?: string;
  tenant_id?: string;
  slug?: string;
};

/**
 * Cria empresa + owner via RPC SECURITY DEFINER (Sprint 34.2).
 * Não usa INSERT direto em tenant_members (self-join arbitrário bloqueado).
 * `userId` é validado contra a sessão; a RPC usa auth.uid().
 */
export async function createTenantWithOwner(
  supabase: SupabaseClient<Database>,
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: { message: "Sessão inválida. Faça login novamente." },
    };
  }

  if (user.id !== input.userId) {
    return {
      success: false,
      error: { message: "Usuário da sessão não corresponde ao solicitante." },
    };
  }

  const { data, error } = await supabase.rpc(
    "create_tenant_with_owner" as never,
    {
      p_name: input.name.trim(),
      p_slug: input.slug,
      p_segment: input.segment,
    } as never,
  );

  if (error) {
    return {
      success: false,
      error: { message: error.message, code: error.code },
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as RpcRow | null;
  const tenantId = row?.out_tenant_id ?? row?.tenant_id;
  const slug = row?.out_slug ?? row?.slug ?? input.slug;

  if (!tenantId) {
    return {
      success: false,
      error: { message: "Falha ao criar empresa (resposta vazia)." },
    };
  }

  return { success: true, tenantId, slug };
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
