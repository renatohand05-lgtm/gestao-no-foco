"use server";

/**
 * Sprint 30.2 — Aceite de convite (rota pública /convite/[token]).
 * Separado de actions.ts do admin para não exigir Owner/Admin.
 */

import { getCurrentProfile } from "@/lib/auth/session";

import { recordTeamAuditEvent } from "./audit";
import { acceptInvitation } from "./invitations-service";

export async function acceptInvitationAction(token: string): Promise<
  | { ok: true; data: { tenantSlug: string } }
  | { ok: false; error: { message: string } }
> {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.id || !profile.email) {
      return { ok: false, error: { message: "Sessão ausente." } };
    }

    const result = await acceptInvitation({
      token,
      userId: profile.id,
      userEmail: profile.email,
    });

    await recordTeamAuditEvent({
      tenantId: result.invitation.tenantId,
      userId: profile.id,
      event: "USER_CREATED",
      description: "Convite aceito — acesso concedido ao tenant.",
      targetId: result.invitation.id,
    });

    return { ok: true, data: { tenantSlug: result.tenantSlug } };
  } catch (error) {
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : "Falha ao aceitar convite.",
      },
    };
  }
}
