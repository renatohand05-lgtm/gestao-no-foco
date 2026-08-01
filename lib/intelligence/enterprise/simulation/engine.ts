/**
 * Fase 27 — Simulation engine (cenários reversíveis, não persistidos por padrão).
 */

import { computeConfidence } from "../confidence/engine.ts";
import { makeMetricEvidence } from "../evidence/registry.ts";
import type { SimulationScenario } from "../types.ts";
import { randomUUID } from "node:crypto";

export function simulateCashShock(input: {
  tenantId: string;
  baselineSaldo: number;
  shock: number;
}): SimulationScenario {
  const evid = makeMetricEvidence({
    tenantId: input.tenantId,
    module: "financeiro",
    source: "simulation",
    metric: "baselineSaldo",
    value: input.baselineSaldo,
  });
  const output = input.baselineSaldo + input.shock;
  return {
    id: randomUUID(),
    title: "Choque de caixa (simulação)",
    baseline: { saldo: input.baselineSaldo },
    variables: { shock: input.shock },
    constraints: ["Não altera lançamentos reais", "Reversível", "Não persistido"],
    outputs: { saldoSimulado: output },
    assumptions: ["Choque aplicado linearmente sobre saldo informado"],
    confidence: computeConfidence({ evidence: [evid], sampleSize: 1 }),
    reversible: true,
    persisted: false,
    formulaVersion: "cash-shock-v27",
  };
}
