"use server";

/**
 * Sprint 30.2 — Server Actions do módulo Equipe.
 * Toda mutação exige Owner/Admin (assertEquipeAdmin) e revalida a página.
 */

import { revalidatePath } from "next/cache";

import {
  assertEquipeAdmin,
  equipePageAuthError,
  resolveEquipePageAuth,
} from "./page-auth";
import { recordTeamAuditEvent } from "./audit";
import {
  cancelInvitation,
  createInvitation,
  resendInvitation,
} from "./invitations-service";
import { createJobTitle, setJobTitleStatus, updateJobTitle } from "./job-titles-service";
import {
  removeMemberAccess,
  setMemberStatus,
  updateMemberAssignments,
  updateMemberRole,
} from "./members-service";
import { addTeamMember, createTeam, removeTeamMember, setTeamStatus, updateTeam } from "./teams-service";
import type {
  CreateInvitationInput,
  JobTitleStatus,
  MemberStatus,
  MembershipRole,
  TeamStatus,
} from "./types";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; code?: string } };

function equipePath(tenantSlug: string): string {
  return `/${tenantSlug}/configuracoes/equipe`;
}

async function withEquipeAdmin<T>(
  tenantSlug: string,
  run: (auth: Awaited<ReturnType<typeof resolveEquipePageAuth>>) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const auth = await resolveEquipePageAuth(tenantSlug);
    assertEquipeAdmin(auth);
    const data = await run(auth);
    revalidatePath(equipePath(tenantSlug));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: equipePageAuthError(error) };
  }
}

export async function updateMemberRoleAction(
  tenantSlug: string,
  memberId: string,
  role: MembershipRole,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const updated = await updateMemberRole({ tenantId: auth.tenant.id, memberId, role });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "ROLE_GRANTED",
      description: `Papel do membro alterado para ${role}.`,
      targetId: memberId,
    });
    return updated;
  });
}

export async function setMemberStatusAction(
  tenantSlug: string,
  memberId: string,
  status: MemberStatus,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const updated = await setMemberStatus({ tenantId: auth.tenant.id, memberId, status });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "USER_UPDATED",
      description: status === "inactive" ? "Membro inativado." : "Membro reativado.",
      targetId: memberId,
    });
    return updated;
  });
}

export async function updateMemberAssignmentsAction(
  tenantSlug: string,
  memberId: string,
  input: { teamId?: string | null; jobTitleId?: string | null; notes?: string | null },
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const updated = await updateMemberAssignments({
      tenantId: auth.tenant.id,
      memberId,
      ...input,
    });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "USER_UPDATED",
      description: "Equipe/cargo/observações do membro atualizados.",
      targetId: memberId,
    });
    return updated;
  });
}

export async function removeMemberAccessAction(tenantSlug: string, memberId: string) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    await removeMemberAccess({ tenantId: auth.tenant.id, memberId });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "USER_DELETED",
      description: "Acesso do membro removido do tenant.",
      targetId: memberId,
    });
    return { removed: true };
  });
}

export async function createInvitationAction(
  tenantSlug: string,
  input: CreateInvitationInput,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const result = await createInvitation({
      tenantId: auth.tenant.id,
      tenantSlug,
      invitedBy: auth.profile.id,
      data: input,
    });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "USER_CREATED",
      description: `Convite criado para ${input.email}.`,
      targetType: "tenant_invitation",
      targetId: result.invitation.id,
    });
    return result;
  });
}

export async function resendInvitationAction(tenantSlug: string, invitationId: string) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const result = await resendInvitation({
      tenantId: auth.tenant.id,
      tenantSlug,
      invitationId,
    });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "USER_UPDATED",
      description: "Convite reenviado (novo link gerado).",
      targetType: "tenant_invitation",
      targetId: invitationId,
    });
    return result;
  });
}

export async function cancelInvitationAction(tenantSlug: string, invitationId: string) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const result = await cancelInvitation({ tenantId: auth.tenant.id, invitationId });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "USER_UPDATED",
      description: "Convite cancelado.",
      targetType: "tenant_invitation",
      targetId: invitationId,
    });
    return result;
  });
}

export async function createTeamAction(
  tenantSlug: string,
  input: { name: string; description?: string | null; area?: string | null; leaderUserId?: string | null },
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    const team = await createTeam({ tenantId: auth.tenant.id, ...input });
    await recordTeamAuditEvent({
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      event: "CONFIG_CHANGED",
      description: `Equipe "${team.name}" criada.`,
      targetType: "tenant_team",
      targetId: team.id,
    });
    return team;
  });
}

export async function updateTeamAction(
  tenantSlug: string,
  teamId: string,
  input: { name?: string; description?: string | null; area?: string | null; leaderUserId?: string | null },
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    return updateTeam({ tenantId: auth.tenant.id, teamId, ...input });
  });
}

export async function setTeamStatusAction(
  tenantSlug: string,
  teamId: string,
  status: TeamStatus,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    return setTeamStatus({ tenantId: auth.tenant.id, teamId, status });
  });
}

export async function addTeamMemberAction(
  tenantSlug: string,
  teamId: string,
  memberId: string,
  userId: string,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    await addTeamMember({ tenantId: auth.tenant.id, teamId, memberId, userId });
    return { added: true };
  });
}

export async function removeTeamMemberAction(
  tenantSlug: string,
  teamId: string,
  memberId: string,
  userId: string,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    await removeTeamMember({ tenantId: auth.tenant.id, teamId, memberId, userId });
    return { removed: true };
  });
}

export async function createJobTitleAction(
  tenantSlug: string,
  input: {
    name: string;
    description?: string | null;
    level?: number | null;
    teamId?: string | null;
    defaultMembershipRole?: MembershipRole | null;
  },
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    return createJobTitle({ tenantId: auth.tenant.id, ...input });
  });
}

export async function updateJobTitleAction(
  tenantSlug: string,
  jobTitleId: string,
  input: {
    name?: string;
    description?: string | null;
    level?: number | null;
    teamId?: string | null;
    defaultMembershipRole?: MembershipRole | null;
  },
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    return updateJobTitle({ tenantId: auth.tenant.id, jobTitleId, ...input });
  });
}

export async function setJobTitleStatusAction(
  tenantSlug: string,
  jobTitleId: string,
  status: JobTitleStatus,
) {
  return withEquipeAdmin(tenantSlug, async (auth) => {
    return setJobTitleStatus({ tenantId: auth.tenant.id, jobTitleId, status });
  });
}
