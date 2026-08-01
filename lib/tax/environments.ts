/**
 * Sprint 26.8 — Ambientes e isolamento do cálculo oficial.
 */

import type { TaxEnvironment, TaxRule } from "./types.ts";

export const TAX_ENVIRONMENTS: readonly TaxEnvironment[] = [
  "configuracao",
  "simulacao",
  "producao",
] as const;

/** Draft/simulação nunca afetam cálculo oficial. */
export function canAffectOfficialCalculation(rule: TaxRule): boolean {
  return (
    rule.status === "published" &&
    rule.environment === "producao" &&
    !rule.deletedAt
  );
}

export function assertSimulationIsolation(mutatesOfficial: boolean): void {
  if (mutatesOfficial) {
    throw new Error(
      "TAX_SIMULATION_ISOLATION: simulação não pode mutar dados oficiais",
    );
  }
}
