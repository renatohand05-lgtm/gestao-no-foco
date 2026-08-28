"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizedPlatformTenant } from "@/lib/platform/platform-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createInvitation } from "@/lib/equipe/invitations-service";
import { isInvitableRole } from "@/lib/equipe/invite-rules";
import { getCurrentProfile } from "@/lib/auth/session";
import type { TenantSegment } from "@/types";

type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Convida um usuário para a empresa `tenantId`, sem exigir que o chamador
 * seja membro dela — autoriza via platform_partners (dono, ou associado que
 * indicou essa empresa especificamente). Nunca permite convidar como owner.
 */
export async function inviteUserToReferredTenantAction(input: {
  tenantId: string;
  email: string;
  fullName?: string;
  membershipRole: string;
}): Promise<ActionResult<{ inviteUrl: string }>> {
  const authorized = await getAuthorizedPlatformTenant(input.tenantId);
  if (!authorized) {
    return { ok: false, error: "Você não tem acesso a esta empresa." };
  }

  if (!isInvitableRole(input.membershipRole)) {
    return { ok: false, error: "Papel de convite inválido." };
  }

  const profile = await getCurrentProfile();
  if (!profile?.id) {
    return { ok: false, error: "Sessão ausente. Faça login novamente." };
  }

  try {
    const result = await createInvitation({
      tenantId: input.tenantId,
      tenantSlug: authorized.tenant.tenantSlug,
      invitedBy: profile.id,
      data: {
        email: input.email,
        fullName: input.fullName || null,
        membershipRole: input.membershipRole as never,
      },
    });
    revalidatePath("/master/dashboard");
    revalidatePath(`/master/empresas/${input.tenantId}`);
    return { ok: true, data: { inviteUrl: result.inviteUrl } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao criar convite.",
    };
  }
}

/**
 * Atualiza nome/segmento da empresa `tenantId` — mesma autorização de
 * plataforma acima. Nunca mexe em dados financeiros/operacionais.
 */
export async function updateReferredTenantCadastroAction(input: {
  tenantId: string;
  name: string;
  segment: TenantSegment;
}): Promise<ActionResult> {
  const authorized = await getAuthorizedPlatformTenant(input.tenantId);
  if (!authorized) {
    return { ok: false, error: "Você não tem acesso a esta empresa." };
  }

  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Informe um nome válido para a empresa." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ name, segment: input.segment } as never)
    .eq("id", input.tenantId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/master/dashboard");
  revalidatePath(`/master/empresas/${input.tenantId}`);
  return { ok: true, data: null };
}
