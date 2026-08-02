import "server-only";

/**
 * Sprint 30.2 — Serviço de Convites (tenant_invitations).
 * Token em claro nunca é persistido — apenas token_hash + token_prefix.
 * O link de convite é retornado uma única vez (criação/reenvio) para o
 * chamador admin exibir/copiar; a listagem nunca inclui o token.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import {
  buildInviteUrlPath,
  generateInviteToken,
  hashInviteToken,
  inviteTokenPrefix,
} from "./token";
import type { CreateInvitationInput, CreateInvitationResult, Invitation, MembershipRole } from "./types";

const DEFAULT_VALIDADE_HORAS = 96;

async function resolveClient(): Promise<SupabaseClient<Database>> {
  if (isAdminClientAvailable()) return createAdminClient();
  return createClient();
}

/** Honesto: reflete apenas se há provider de e-mail configurado — não envia e-mail de fato. */
export function emailProviderConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_PROVIDER || process.env.RESEND_API_KEY || process.env.SMTP_HOST,
  );
}

type RawInvitationRow = {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string | null;
  membership_role: string;
  team_id: string | null;
  job_title_id: string | null;
  token_prefix: string;
  status: string;
  expires_at: string;
  message: string | null;
  invited_by: string | null;
  accepted_at: string | null;
  accepted_user_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  resent_at: string | null;
};

const LIST_COLUMNS =
  "id, tenant_id, email, full_name, membership_role, team_id, job_title_id, token_prefix, status, expires_at, message, invited_by, accepted_at, accepted_user_id, cancelled_at, created_at, updated_at, resent_at";

function mapInvitation(row: RawInvitationRow): Invitation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    fullName: row.full_name,
    membershipRole: row.membership_role as MembershipRole,
    teamId: row.team_id,
    jobTitleId: row.job_title_id,
    tokenPrefix: row.token_prefix,
    status: row.status as Invitation["status"],
    expiresAt: row.expires_at,
    message: row.message,
    invitedBy: row.invited_by,
    acceptedAt: row.accepted_at,
    acceptedUserId: row.accepted_user_id,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resentAt: row.resent_at,
  };
}

export async function listInvitations(tenantId: string): Promise<Invitation[]> {
  const client = await resolveClient();
  const { data, error } = await client
    .from("tenant_invitations" as never)
    .select(LIST_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawInvitationRow[]).map(mapInvitation);
}

export async function createInvitation(input: {
  tenantId: string;
  tenantSlug: string;
  invitedBy: string;
  data: CreateInvitationInput;
}): Promise<CreateInvitationResult> {
  const email = input.data.email.trim().toLowerCase();
  if (!email || !email.includes("@") || email.includes(" ")) {
    throw new Error("E-mail inválido.");
  }
  if (input.data.membershipRole === "owner") {
    throw new Error(
      "Não é permitido convidar como Proprietário. Transfira a propriedade por fluxo dedicado.",
    );
  }

  const validadeHoras = input.data.validadeHoras ?? DEFAULT_VALIDADE_HORAS;
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + validadeHoras * 3_600_000).toISOString();

  const client = await resolveClient();

  const { data: pendingDup, error: dupError } = await client
    .from("tenant_invitations" as never)
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("status", "pending")
    .ilike("email", email)
    .maybeSingle();
  if (dupError) throw new Error(dupError.message);
  if (pendingDup) {
    throw new Error("Já existe um convite pendente para este e-mail neste tenant.");
  }

  const { data: existingMember } = await client
    .from("tenant_members")
    .select("id, user_id")
    .eq("tenant_id", input.tenantId);

  if (existingMember?.length) {
    const userIds = existingMember.map((m) => m.user_id);
    const { data: profiles } = await client
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    const already = (profiles ?? []).some(
      (p) => (p.email ?? "").trim().toLowerCase() === email,
    );
    if (already) {
      throw new Error("Este e-mail já é membro deste tenant.");
    }
  }

  const { data, error } = await client
    .from("tenant_invitations" as never)
    .insert({
      tenant_id: input.tenantId,
      email,
      full_name: input.data.fullName ?? null,
      membership_role: input.data.membershipRole,
      team_id: input.data.teamId ?? null,
      job_title_id: input.data.jobTitleId ?? null,
      token_hash: hashInviteToken(token),
      token_prefix: inviteTokenPrefix(token),
      status: "pending",
      expires_at: expiresAt,
      message: input.data.message ?? null,
      invited_by: input.invitedBy,
    } as never)
    .select(LIST_COLUMNS)
    .single();
  if (error) throw new Error(error.message);

  return {
    invitation: mapInvitation(data as unknown as RawInvitationRow),
    inviteUrl: buildInviteUrlPath(input.tenantSlug, token),
    token,
    emailSent: false,
  };
}

export async function resendInvitation(input: {
  tenantId: string;
  tenantSlug: string;
  invitationId: string;
}): Promise<CreateInvitationResult> {
  const client = await resolveClient();
  const { data: existing, error: findError } = await client
    .from("tenant_invitations" as never)
    .select(LIST_COLUMNS)
    .eq("id", input.invitationId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (!existing) throw new Error("Convite não encontrado.");
  const row = existing as unknown as RawInvitationRow;
  if (row.status !== "pending") {
    throw new Error("Apenas convites pendentes podem ser reenviados.");
  }

  const token = generateInviteToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + DEFAULT_VALIDADE_HORAS * 3_600_000).toISOString();

  const { data, error } = await client
    .from("tenant_invitations" as never)
    .update({
      token_hash: hashInviteToken(token),
      token_prefix: inviteTokenPrefix(token),
      expires_at: expiresAt,
      resent_at: now,
      updated_at: now,
    } as never)
    .eq("id", input.invitationId)
    .eq("tenant_id", input.tenantId)
    .select(LIST_COLUMNS)
    .single();
  if (error) throw new Error(error.message);

  return {
    invitation: mapInvitation(data as unknown as RawInvitationRow),
    inviteUrl: buildInviteUrlPath(input.tenantSlug, token),
    token,
    emailSent: false,
  };
}

export async function cancelInvitation(input: {
  tenantId: string;
  invitationId: string;
}): Promise<Invitation> {
  const client = await resolveClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("tenant_invitations" as never)
    .update({ status: "cancelled", cancelled_at: now, updated_at: now } as never)
    .eq("id", input.invitationId)
    .eq("tenant_id", input.tenantId)
    .eq("status", "pending")
    .select(LIST_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Convite não encontrado ou já finalizado.");
  return mapInvitation(data as unknown as RawInvitationRow);
}

export type InvitationPreview = {
  invitation: Invitation;
  tenantName: string;
  tenantSlug: string;
};

/** Preview público autenticado — não inclui token; usa service role (RLS admin-only). */
export async function getInvitationByToken(
  token: string,
): Promise<InvitationPreview | null> {
  if (!token || token.length < 16) return null;
  if (!isAdminClientAvailable()) {
    throw new Error(
      "Aceite de convite indisponível: SUPABASE_SERVICE_ROLE_KEY não configurada.",
    );
  }
  const client = createAdminClient();
  const { data, error } = await client
    .from("tenant_invitations" as never)
    .select(LIST_COLUMNS)
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const invitation = mapInvitation(data as unknown as RawInvitationRow);
  const { data: tenant, error: tenantError } = await client
    .from("tenants")
    .select("id, name, slug")
    .eq("id", invitation.tenantId)
    .maybeSingle();
  if (tenantError) throw new Error(tenantError.message);
  if (!tenant) return null;
  return {
    invitation,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
  };
}

/**
 * Aceita convite: valida e-mail do perfil, cria membership e marca aceito.
 * Requer service role (convidado ainda não é admin do tenant).
 */
export async function acceptInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<{ tenantSlug: string; invitation: Invitation }> {
  const preview = await getInvitationByToken(input.token);
  if (!preview) throw new Error("Convite inválido ou inexistente.");

  const { invitation, tenantSlug } = preview;
  if (invitation.status === "cancelled") {
    throw new Error("Este convite foi cancelado.");
  }
  if (invitation.status === "accepted") {
    throw new Error("Este convite já foi aceito.");
  }
  if (
    invitation.status === "expired" ||
    new Date(invitation.expiresAt).getTime() < Date.now()
  ) {
    if (invitation.status === "pending") {
      const client = createAdminClient();
      await client
        .from("tenant_invitations" as never)
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", invitation.id)
        .eq("tenant_id", invitation.tenantId);
    }
    throw new Error("Este convite expirou.");
  }
  if (invitation.status !== "pending") {
    throw new Error("Convite não está disponível para aceite.");
  }

  const email = input.userEmail.trim().toLowerCase();
  if (!email || email !== invitation.email.trim().toLowerCase()) {
    throw new Error(
      "O e-mail da sua conta não corresponde ao convite. Entre com a conta convidada.",
    );
  }

  const client = createAdminClient();
  const { data: existing } = await client
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", invitation.tenantId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!existing) {
    const insertPayload: Record<string, unknown> = {
      tenant_id: invitation.tenantId,
      user_id: input.userId,
      role: invitation.membershipRole === "owner" ? "member" : invitation.membershipRole,
    };
    if (invitation.teamId) insertPayload.team_id = invitation.teamId;
    if (invitation.jobTitleId) insertPayload.job_title_id = invitation.jobTitleId;

    const { error: memberError } = await client
      .from("tenant_members")
      .insert(insertPayload as never);
    if (memberError) throw new Error(memberError.message);

    if (invitation.teamId) {
      await client.from("tenant_team_members" as never).upsert(
        {
          tenant_id: invitation.tenantId,
          team_id: invitation.teamId,
          user_id: input.userId,
        } as never,
        { onConflict: "team_id,user_id" },
      );
    }
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .from("tenant_invitations" as never)
    .update({
      status: "accepted",
      accepted_at: now,
      accepted_user_id: input.userId,
      updated_at: now,
    } as never)
    .eq("id", invitation.id)
    .eq("tenant_id", invitation.tenantId)
    .eq("status", "pending")
    .select(LIST_COLUMNS)
    .maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error("Não foi possível finalizar o convite.");

  return {
    tenantSlug,
    invitation: mapInvitation(updated as unknown as RawInvitationRow),
  };
}
