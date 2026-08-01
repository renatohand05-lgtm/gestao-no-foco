/**
 * Sprint 27.6.1 — Schema detection for intelligence persistence.
 * Sem migration aplicada → unavailable explícito (sem fallback memória).
 */

export const INTELLIGENCE_TABLES = [
  "intelligence_sessions",
  "intelligence_messages",
  "intelligence_evidence",
  "intelligence_audit_events",
  "intelligence_feedback",
  "intelligence_action_plans",
  "intelligence_automation_drafts",
] as const;

export type IntelligenceTable = (typeof INTELLIGENCE_TABLES)[number];

export type SchemaProbeResult = {
  ready: boolean;
  missing: string[];
  message: string;
};

type ProbeClient = {
  from: (table: string) => {
    select: (
      cols: string,
      opts?: { head?: boolean; count?: string },
    ) => {
      limit: (n: number) => PromiseLike<{
        error: { message?: string; code?: string } | null;
      }>;
    };
  };
};

function looksLikeMissingRelation(error: {
  message?: string;
  code?: string;
} | null): boolean {
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

export async function probeIntelligenceSchema(
  client: ProbeClient,
): Promise<SchemaProbeResult> {
  const missing: string[] = [];
  let okCount = 0;
  for (const table of INTELLIGENCE_TABLES) {
    try {
      const { error } = await client
        .from(table)
        .select("id", { head: true, count: "exact" })
        .limit(1);
      if (!error) {
        okCount += 1;
        continue;
      }
      // Qualquer erro (missing ou outro) impede ready — só lista missing tipado
      if (looksLikeMissingRelation(error)) {
        missing.push(table);
      } else {
        missing.push(`${table} (probe_error)`);
      }
    } catch {
      missing.push(table);
    }
  }
  if (okCount !== INTELLIGENCE_TABLES.length || missing.length > 0) {
    return {
      ready: false,
      missing,
      message:
        "Persistência de Inteligência indisponível — aplique a migration 20260816_intelligence_persistence_phase27_6_1.sql manualmente no Supabase.",
    };
  }
  return {
    ready: true,
    missing: [],
    message: "Schema de Inteligência disponível.",
  };
}

export function persistenceUnavailableError(probe: SchemaProbeResult) {
  return {
    code: "INTELLIGENCE_SCHEMA_UNAVAILABLE" as const,
    message: probe.message,
    missing: probe.missing,
  };
}
