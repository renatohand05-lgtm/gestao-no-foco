/**
 * Sprint 30.2 — Detecção de schema Equipe (mesmo padrão de
 * lib/intelligence/enterprise/persistence/schema.ts). Sem migration aplicada
 * → indisponível explícito, sem fallback silencioso.
 */

import type { EquipeSchemaProbe } from "./types.ts";

export const EQUIPE_TABLES = [
  "tenant_teams",
  "tenant_team_members",
  "tenant_job_titles",
  "tenant_invitations",
] as const;

export type EquipeTable = (typeof EQUIPE_TABLES)[number];

type ProbeError = { message?: string; code?: string } | null;

type ProbeClient = {
  from: (table: string) => {
    select: (
      cols: string,
      opts?: { head?: boolean; count?: string },
    ) => {
      limit: (n: number) => PromiseLike<{ error: ProbeError }>;
    };
  };
};

function looksLikeMissingRelation(error: ProbeError): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find")
  );
}

function looksLikeMissingColumn(error: ProbeError): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  return (
    code === "42703" ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

async function tableReady(
  client: ProbeClient,
  table: string,
): Promise<boolean> {
  try {
    const { error } = await client
      .from(table)
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (!error) return true;
    return false;
  } catch {
    return false;
  }
}

async function columnReady(
  client: ProbeClient,
  table: string,
  column: string,
): Promise<boolean> {
  try {
    const { error } = await client
      .from(table)
      .select(column, { head: true, count: "exact" })
      .limit(1);
    if (!error) return true;
    if (looksLikeMissingColumn(error) || looksLikeMissingRelation(error)) {
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

export async function probeEquipeSchema(
  client: ProbeClient,
): Promise<EquipeSchemaProbe> {
  const missing: string[] = [];

  const hasTeams = await tableReady(client, "tenant_teams");
  if (!hasTeams) missing.push("tenant_teams");

  const hasTeamMembers = await tableReady(client, "tenant_team_members");
  if (!hasTeamMembers) missing.push("tenant_team_members");

  const hasJobTitles = await tableReady(client, "tenant_job_titles");
  if (!hasJobTitles) missing.push("tenant_job_titles");

  const hasInvitations = await tableReady(client, "tenant_invitations");
  if (!hasInvitations) missing.push("tenant_invitations");

  const hasMemberStatusColumns = await columnReady(
    client,
    "tenant_members",
    "status",
  );
  if (!hasMemberStatusColumns) missing.push("tenant_members.status");

  const ready =
    hasTeams &&
    hasTeamMembers &&
    hasJobTitles &&
    hasInvitations &&
    hasMemberStatusColumns;

  return {
    hasTeams,
    hasTeamMembers,
    hasJobTitles,
    hasInvitations,
    hasMemberStatusColumns,
    ready,
    missing,
    message: ready
      ? "Schema de Equipe disponível."
      : "Recursos avançados de Equipe indisponíveis — aplique a migration 20260820_phase30_2_team_rbac.sql manualmente no Supabase.",
  };
}

export function equipeSchemaUnavailableError(probe: EquipeSchemaProbe) {
  return {
    code: "EQUIPE_SCHEMA_UNAVAILABLE" as const,
    message: probe.message,
    missing: probe.missing,
  };
}
