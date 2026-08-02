import "server-only";

/**
 * Sprint 30.2 — Serviço de Membros (tenant_members + profiles).
 * Usa createAdminClient (service role) quando disponível — após o chamador já
 * ter sido validado como admin em lib/equipe/page-auth.ts — para poder listar
 * peers mesmo sem policy de leitura ampla aplicada ainda. Sem service role
 * configurada, degrada para o client autenticado (RLS própria linha + peers
 * via is_tenant_admin, se a migration já tiver sido aplicada).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import { assertCanChangeRole, assertCanDeactivate, assertCanRemoveAccess } from "./guards";
import type { MemberStatus, MembershipRole, TeamMember } from "./types";

export function isMembersServiceDegraded(): boolean {
  return !isAdminClientAvailable();
}

async function resolveClient(): Promise<SupabaseClient<Database>> {
  if (isAdminClientAvailable()) return createAdminClient();
  return createClient();
}

type RawMemberRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  created_at: string;
  status?: string | null;
  updated_at?: string | null;
  deactivated_at?: string | null;
  team_id?: string | null;
  job_title_id?: string | null;
  notes?: string | null;
};

type RawProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));
}

async function fetchRawMembers(
  client: SupabaseClient<Database>,
  tenantId: string,
): Promise<RawMemberRow[]> {
  const fullSelect =
    "id, tenant_id, user_id, role, status, updated_at, deactivated_at, team_id, job_title_id, notes, created_at";
  const { data, error } = await client
    .from("tenant_members")
    .select(fullSelect)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (!error) return (data ?? []) as unknown as RawMemberRow[];
  if (!isMissingColumnError(error)) throw new Error(error.message);

  const { data: baseData, error: baseError } = await client
    .from("tenant_members")
    .select("id, tenant_id, user_id, role, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (baseError) throw new Error(baseError.message);
  return (baseData ?? []) as unknown as RawMemberRow[];
}

async function fetchProfiles(
  client: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, RawProfileRow>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .in("id", userIds);
  if (error) throw new Error(error.message);
  const map = new Map<string, RawProfileRow>();
  for (const row of (data ?? []) as unknown as RawProfileRow[]) {
    map.set(row.id, row);
  }
  return map;
}

function mapMember(row: RawMemberRow, profile: RawProfileRow | undefined): TeamMember {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role as MembershipRole,
    status: (row.status as MemberStatus | null | undefined) ?? "active",
    teamId: row.team_id ?? null,
    jobTitleId: row.job_title_id ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    deactivatedAt: row.deactivated_at ?? null,
    profile: {
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

export async function listMembers(tenantId: string): Promise<TeamMember[]> {
  const client = await resolveClient();
  const rows = await fetchRawMembers(client, tenantId);
  const profiles = await fetchProfiles(client, rows.map((r) => r.user_id));
  return rows.map((row) => mapMember(row, profiles.get(row.user_id)));
}

export async function getMember(
  tenantId: string,
  memberId: string,
): Promise<TeamMember | null> {
  const members = await listMembers(tenantId);
  return members.find((m) => m.id === memberId) ?? null;
}

export async function updateMemberRole(input: {
  tenantId: string;
  memberId: string;
  role: MembershipRole;
}): Promise<TeamMember> {
  const members = await listMembers(input.tenantId);
  const target = members.find((m) => m.id === input.memberId);
  if (!target) throw new Error("Membro não encontrado.");
  assertCanChangeRole(members, input.memberId, input.role);

  const client = await resolveClient();
  const { error } = await client
    .from("tenant_members")
    .update({ role: input.role } as never)
    .eq("id", input.memberId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const updated = await getMember(input.tenantId, input.memberId);
  if (!updated) throw new Error("Membro não encontrado após atualização.");
  return updated;
}

export async function setMemberStatus(input: {
  tenantId: string;
  memberId: string;
  status: MemberStatus;
}): Promise<TeamMember> {
  const members = await listMembers(input.tenantId);
  const target = members.find((m) => m.id === input.memberId);
  if (!target) throw new Error("Membro não encontrado.");
  if (input.status === "inactive") {
    assertCanDeactivate(members, input.memberId);
  }

  const client = await resolveClient();
  const payload: Record<string, unknown> = { status: input.status };
  payload.deactivated_at = input.status === "inactive" ? new Date().toISOString() : null;

  const { error } = await client
    .from("tenant_members")
    .update(payload as never)
    .eq("id", input.memberId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const updated = await getMember(input.tenantId, input.memberId);
  if (!updated) throw new Error("Membro não encontrado após atualização.");
  return updated;
}

export async function updateMemberAssignments(input: {
  tenantId: string;
  memberId: string;
  teamId?: string | null;
  jobTitleId?: string | null;
  notes?: string | null;
}): Promise<TeamMember> {
  const target = await getMember(input.tenantId, input.memberId);
  if (!target) throw new Error("Membro não encontrado.");

  const payload: Record<string, unknown> = {};
  if (input.teamId !== undefined) payload.team_id = input.teamId;
  if (input.jobTitleId !== undefined) payload.job_title_id = input.jobTitleId;
  if (input.notes !== undefined) payload.notes = input.notes;

  if (Object.keys(payload).length === 0) return target;

  const client = await resolveClient();
  const { error } = await client
    .from("tenant_members")
    .update(payload as never)
    .eq("id", input.memberId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const updated = await getMember(input.tenantId, input.memberId);
  if (!updated) throw new Error("Membro não encontrado após atualização.");
  return updated;
}

/** Remove o vínculo do membro com o tenant (revoga acesso). Protege o último owner. */
export async function removeMemberAccess(input: {
  tenantId: string;
  memberId: string;
}): Promise<void> {
  const members = await listMembers(input.tenantId);
  const target = members.find((m) => m.id === input.memberId);
  if (!target) throw new Error("Membro não encontrado.");
  assertCanRemoveAccess(members, input.memberId);

  const client = await resolveClient();
  const { error } = await client
    .from("tenant_members")
    .delete()
    .eq("id", input.memberId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);
}
