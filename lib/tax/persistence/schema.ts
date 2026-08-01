/**
 * Sprint 26.8 — Probe de schema tributário Enterprise.
 */

export const TAX_TABLES = [
  "tax_regimes",
  "tax_types",
  "tax_rules",
  "tax_rule_version_snapshots",
  "tax_obligation_definitions",
  "tax_calculation_traces",
  "tax_simulations_v2",
  "tax_scenarios",
  "tax_audit_events",
] as const;

export type TaxSchemaProbeResult = {
  ready: boolean;
  missing: string[];
  message: string;
};

export type TaxPersistenceClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export async function probeTaxSchema(
  client: TaxPersistenceClient,
): Promise<TaxSchemaProbeResult> {
  const missing: string[] = [];
  for (const t of TAX_TABLES) {
    const { error } = await client.from(t).select("id", { head: true, count: "exact" }).limit(1);
    if (error) missing.push(t);
  }
  if (missing.length) {
    return {
      ready: false,
      missing,
      message:
        "MIGRATION PENDENTE DE APLICAÇÃO MANUAL — 20260817_tax_configuration_phase26_8.sql",
    };
  }
  return {
    ready: true,
    missing: [],
    message: "Schema tributário Enterprise pronto",
  };
}

export function taxSchemaUnavailableError(probe: TaxSchemaProbeResult) {
  return {
    code: "TAX_SCHEMA_UNAVAILABLE" as const,
    message: probe.message,
    missing: probe.missing,
  };
}
