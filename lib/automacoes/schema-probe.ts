/**
 * Sprint 30.7 — Probe de schema (sem fallback silencioso).
 * Timeout por tabela para não travar a Central.
 */

export const AUTOMATION_TABLES = [
  "automation_rules",
  "automation_executions",
  "automation_approvals",
  "automation_templates",
  "automation_audit",
  "automation_internal_notifications",
] as const;

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

export type AutomationSchemaProbe = {
  ready: boolean;
  missingTables: string[];
  message: string;
};

let probeCache: { at: number; value: AutomationSchemaProbe } | null = null;
const PROBE_TTL_MS = 15_000;
const TABLE_TIMEOUT_MS = 4_000;

export function clearAutomationSchemaProbeCache() {
  probeCache = null;
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("probe_timeout")), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function isMissingTable(error: ProbeError): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export async function probeAutomationSchema(
  client: ProbeClient,
): Promise<AutomationSchemaProbe> {
  if (probeCache && Date.now() - probeCache.at < PROBE_TTL_MS) {
    return probeCache.value;
  }
  const results = await Promise.all(
    AUTOMATION_TABLES.map(async (table) => {
      try {
        const { error } = await withTimeout(
          client.from(table).select("id").limit(1),
          TABLE_TIMEOUT_MS,
        );
        if (error) return table;
        return null;
      } catch {
        return table;
      }
    }),
  );
  const missing = results.filter((t) => t != null) as string[];
  const ready = missing.length === 0;
  const value: AutomationSchemaProbe = {
    ready,
    missingTables: missing,
    message: ready
      ? "Schema de Automações disponível."
      : missing.length === AUTOMATION_TABLES.length
        ? `Tabelas ausentes no schema cache da API (PGRST). No Supabase: Settings → API → Reload schema. Detalhe: ${missing.join(", ")}`
        : `Migration/API incompleta: ${missing.join(", ")}. Modo local seguro ativo.`,
  };
  probeCache = { at: Date.now(), value };
  return value;
}

export { isMissingTable };
