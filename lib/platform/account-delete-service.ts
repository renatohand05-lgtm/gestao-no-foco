import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string; tenantsBloqueando?: string[] };

/**
 * Exclusão da própria conta (exigência da Apple — Guideline 5.1.1(v)).
 *
 * Antes de apagar, verifica se o usuário é o ÚNICO owner de alguma empresa —
 * nesse caso bloqueia, porque apagar deixaria a empresa sem dono. A pessoa
 * precisa promover outro membro a owner (ou excluir a empresa) antes.
 *
 * Apagando o usuário em auth.users, profiles e tenant_members somem sozinhos
 * (ON DELETE CASCADE já configurado no banco).
 */
export async function deleteOwnAccount(
  userId: string,
): Promise<DeleteAccountResult> {
  const admin = createAdminClient();

  const { data: memberships, error: membershipsError } = await admin
    .from("tenant_members")
    .select("tenant_id, role, tenants(name)")
    .eq("user_id", userId);

  if (membershipsError) {
    return {
      ok: false,
      error: `Não foi possível verificar suas empresas: ${membershipsError.message}`,
    };
  }

  const tenantsOndeEhOwner = (memberships ?? []).filter(
    (m) => m.role === "owner",
  );

  if (tenantsOndeEhOwner.length > 0) {
    const tenantIds = tenantsOndeEhOwner.map((m) => m.tenant_id);
    const { data: outrosOwners, error: outrosOwnersError } = await admin
      .from("tenant_members")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .eq("role", "owner")
      .neq("user_id", userId);

    if (outrosOwnersError) {
      return {
        ok: false,
        error: `Não foi possível verificar outros donos: ${outrosOwnersError.message}`,
      };
    }

    const tenantsComOutroOwner = new Set(
      (outrosOwners ?? []).map((r) => r.tenant_id),
    );
    const tenantsSemOutroOwner = tenantsOndeEhOwner.filter(
      (m) => !tenantsComOutroOwner.has(m.tenant_id),
    );

    if (tenantsSemOutroOwner.length > 0) {
      const nomes = tenantsSemOutroOwner.map(
        (m) =>
          (m.tenants as unknown as { name: string } | null)?.name ??
          "empresa sem nome",
      );
      return {
        ok: false,
        error:
          "Você é o único proprietário de " +
          (nomes.length === 1 ? "uma empresa" : "algumas empresas") +
          ". Promova outro membro a proprietário (ou exclua a empresa) antes de excluir sua conta.",
        tenantsBloqueando: nomes,
      };
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return {
      ok: false,
      error: `Não foi possível excluir sua conta: ${deleteError.message}`,
    };
  }

  return { ok: true };
}
