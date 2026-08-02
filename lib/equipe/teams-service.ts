import "server-only";

/**
 * Sprint 30.2 — Serviço de Equipes (tenant_teams + tenant_team_members).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { Team, TeamStatus } from "./types";

async function resolveClient(): Promise<SupabaseClient<Database>> {
  if (isAdminClientAvailable()) return createAdminClient();
  return createClient();
}

type RawTeamRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  area: string | null;
  status: string;
  leader_user_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function mapTeam(row: RawTeamRow, memberCount: number): Team {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    area: row.area,
    status: row.status as TeamStatus,
    leaderUserId: row.leader_user_id,
    memberCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export async function listTeams(tenantId: string): Promise<Team[]> {
  const client = await resolveClient();
  const { data, error } = await client
    .from("tenant_teams" as never)
    .select(
      "id, tenant_id, name, description, area, status, leader_user_id, created_at, updated_at, archived_at",
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawTeamRow[];

  const { data: memberRows, error: memberError } = await client
    .from("tenant_members")
    .select("team_id")
    .eq("tenant_id", tenantId)
    .not("team_id", "is", null);
  if (memberError) throw new Error(memberError.message);

  const counts = new Map<string, number>();
  for (const row of (memberRows ?? []) as { team_id: string | null }[]) {
    if (!row.team_id) continue;
    counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
  }

  return rows.map((row) => mapTeam(row, counts.get(row.id) ?? 0));
}

export async function createTeam(input: {
  tenantId: string;
  name: string;
  description?: string | null;
  area?: string | null;
  leaderUserId?: string | null;
}): Promise<Team> {
  const name = input.name.trim();
  if (!name) throw new Error("Nome da equipe é obrigatório.");

  const client = await resolveClient();
  const { data, error } = await client
    .from("tenant_teams" as never)
    .insert({
      tenant_id: input.tenantId,
      name,
      description: input.description ?? null,
      area: input.area ?? null,
      leader_user_id: input.leaderUserId ?? null,
      status: "active",
    } as never)
    .select(
      "id, tenant_id, name, description, area, status, leader_user_id, created_at, updated_at, archived_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return mapTeam(data as unknown as RawTeamRow, 0);
}

export async function updateTeam(input: {
  tenantId: string;
  teamId: string;
  name?: string;
  description?: string | null;
  area?: string | null;
  leaderUserId?: string | null;
}): Promise<Team> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description;
  if (input.area !== undefined) payload.area = input.area;
  if (input.leaderUserId !== undefined) payload.leader_user_id = input.leaderUserId;

  const client = await resolveClient();
  const { error } = await client
    .from("tenant_teams" as never)
    .update(payload as never)
    .eq("id", input.teamId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const teams = await listTeams(input.tenantId);
  const updated = teams.find((t) => t.id === input.teamId);
  if (!updated) throw new Error("Equipe não encontrada após atualização.");
  return updated;
}

export async function setTeamStatus(input: {
  tenantId: string;
  teamId: string;
  status: TeamStatus;
}): Promise<Team> {
  const client = await resolveClient();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { status: input.status, updated_at: now };
  payload.archived_at = input.status === "archived" ? now : null;

  const { error } = await client
    .from("tenant_teams" as never)
    .update(payload as never)
    .eq("id", input.teamId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const teams = await listTeams(input.tenantId);
  const updated = teams.find((t) => t.id === input.teamId);
  if (!updated) throw new Error("Equipe não encontrada após atualização.");
  return updated;
}

export async function addTeamMember(input: {
  tenantId: string;
  teamId: string;
  memberId: string;
  userId: string;
}): Promise<void> {
  const client = await resolveClient();

  const { error: upsertError } = await client
    .from("tenant_team_members" as never)
    .upsert(
      { tenant_id: input.tenantId, team_id: input.teamId, user_id: input.userId } as never,
      { onConflict: "team_id,user_id" },
    );
  if (upsertError) throw new Error(upsertError.message);

  const { error } = await client
    .from("tenant_members")
    .update({ team_id: input.teamId } as never)
    .eq("id", input.memberId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);
}

export async function removeTeamMember(input: {
  tenantId: string;
  teamId: string;
  memberId: string;
  userId: string;
}): Promise<void> {
  const client = await resolveClient();

  const { error: deleteError } = await client
    .from("tenant_team_members" as never)
    .delete()
    .eq("tenant_id", input.tenantId)
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId);
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await client
    .from("tenant_members")
    .update({ team_id: null } as never)
    .eq("id", input.memberId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);
}
