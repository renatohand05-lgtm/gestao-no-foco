import "server-only";

/**
 * Sprint 30.2 — Serviço de Cargos (tenant_job_titles).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, isAdminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

import type { JobTitle, JobTitleStatus, MembershipRole } from "./types";

async function resolveClient(): Promise<SupabaseClient<Database>> {
  if (isAdminClientAvailable()) return createAdminClient();
  return createClient();
}

type RawJobTitleRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  level: number | null;
  team_id: string | null;
  default_membership_role: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapJobTitle(row: RawJobTitleRow, memberCount: number): JobTitle {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    level: row.level,
    teamId: row.team_id,
    defaultMembershipRole: (row.default_membership_role as MembershipRole | null) ?? null,
    status: row.status as JobTitleStatus,
    memberCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listJobTitles(tenantId: string): Promise<JobTitle[]> {
  const client = await resolveClient();
  const { data, error } = await client
    .from("tenant_job_titles" as never)
    .select(
      "id, tenant_id, name, description, level, team_id, default_membership_role, status, created_at, updated_at",
    )
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawJobTitleRow[];

  const { data: memberRows, error: memberError } = await client
    .from("tenant_members")
    .select("job_title_id")
    .eq("tenant_id", tenantId)
    .not("job_title_id", "is", null);
  if (memberError) throw new Error(memberError.message);

  const counts = new Map<string, number>();
  for (const row of (memberRows ?? []) as { job_title_id: string | null }[]) {
    if (!row.job_title_id) continue;
    counts.set(row.job_title_id, (counts.get(row.job_title_id) ?? 0) + 1);
  }

  return rows.map((row) => mapJobTitle(row, counts.get(row.id) ?? 0));
}

export async function createJobTitle(input: {
  tenantId: string;
  name: string;
  description?: string | null;
  level?: number | null;
  teamId?: string | null;
  defaultMembershipRole?: MembershipRole | null;
}): Promise<JobTitle> {
  const name = input.name.trim();
  if (!name) throw new Error("Nome do cargo é obrigatório.");

  const client = await resolveClient();
  const { data, error } = await client
    .from("tenant_job_titles" as never)
    .insert({
      tenant_id: input.tenantId,
      name,
      description: input.description ?? null,
      level: input.level ?? null,
      team_id: input.teamId ?? null,
      default_membership_role: input.defaultMembershipRole ?? null,
      status: "active",
    } as never)
    .select(
      "id, tenant_id, name, description, level, team_id, default_membership_role, status, created_at, updated_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return mapJobTitle(data as unknown as RawJobTitleRow, 0);
}

export async function updateJobTitle(input: {
  tenantId: string;
  jobTitleId: string;
  name?: string;
  description?: string | null;
  level?: number | null;
  teamId?: string | null;
  defaultMembershipRole?: MembershipRole | null;
}): Promise<JobTitle> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description;
  if (input.level !== undefined) payload.level = input.level;
  if (input.teamId !== undefined) payload.team_id = input.teamId;
  if (input.defaultMembershipRole !== undefined) {
    payload.default_membership_role = input.defaultMembershipRole;
  }

  const client = await resolveClient();
  const { error } = await client
    .from("tenant_job_titles" as never)
    .update(payload as never)
    .eq("id", input.jobTitleId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const jobTitles = await listJobTitles(input.tenantId);
  const updated = jobTitles.find((j) => j.id === input.jobTitleId);
  if (!updated) throw new Error("Cargo não encontrado após atualização.");
  return updated;
}

export async function setJobTitleStatus(input: {
  tenantId: string;
  jobTitleId: string;
  status: JobTitleStatus;
}): Promise<JobTitle> {
  const client = await resolveClient();
  const { error } = await client
    .from("tenant_job_titles" as never)
    .update({ status: input.status, updated_at: new Date().toISOString() } as never)
    .eq("id", input.jobTitleId)
    .eq("tenant_id", input.tenantId);
  if (error) throw new Error(error.message);

  const jobTitles = await listJobTitles(input.tenantId);
  const updated = jobTitles.find((j) => j.id === input.jobTitleId);
  if (!updated) throw new Error("Cargo não encontrado após atualização.");
  return updated;
}
