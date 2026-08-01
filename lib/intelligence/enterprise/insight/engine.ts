/**
 * Fase 27 — Insight Engine (regras determinísticas + evidências obrigatórias).
 */

import { computeConfidence } from "../confidence/engine.ts";
import {
  assertEvidencePresent,
  makeMetricEvidence,
} from "../evidence/registry.ts";
import type {
  ContextSnapshot,
  Insight,
  IntelligenceModule,
} from "../types.ts";
import { randomUUID } from "node:crypto";

export type InsightRuleInput = {
  tenantId: string;
  module: IntelligenceModule;
  snapshot: ContextSnapshot;
  slug?: string;
};

/**
 * Gera insights a partir do snapshot — sem inventar métricas ausentes.
 */
export function generateInsightsFromSnapshot(input: InsightRuleInput): Insight[] {
  const insights: Insight[] = [];
  const m = input.snapshot.metrics;
  const slug = input.slug ?? "tenant";

  const pushIf = (
    cond: boolean,
    spec: Omit<Insight, "id" | "confidence" | "evidenceIds" | "status"> & {
      evidence: Array<{ metric: string; value: string | number | null; source: string }>;
      missing?: string[];
    },
  ) => {
    if (!cond) return;
    const evidenceIds = spec.evidence.map((e) =>
      makeMetricEvidence({
        tenantId: input.tenantId,
        module: spec.module,
        source: e.source,
        metric: e.metric,
        value: e.value,
        deepLink: spec.deepLink,
      }).id,
    );
    const gate = assertEvidencePresent(spec.title, evidenceIds);
    if (!gate.ok) return;
    const evidence = evidenceIds.map((id) => ({
      id,
      source: "registry",
      sourceType: "metric" as const,
      module: spec.module,
      calculatedAt: new Date().toISOString(),
      freshness: "fresh" as const,
      reliability: "alta" as const,
      tenantId: input.tenantId,
    }));
    const confidence = computeConfidence({
      evidence,
      missingSources: spec.missing ?? input.snapshot.missingData,
      sampleSize: evidence.length,
    });
    insights.push({
      id: randomUUID(),
      type: spec.type,
      title: spec.title,
      summary: spec.summary,
      severity: spec.severity,
      priority: spec.priority,
      impact: spec.impact,
      confidence,
      evidenceIds,
      origem: spec.origem,
      prazo: spec.prazo,
      deepLink: spec.deepLink,
      suggestedOwnerRole: spec.suggestedOwnerRole,
      status: "active",
      expiresAt: spec.expiresAt,
      module: spec.module,
    });
  };

  const saldo = m.saldoAtual;
  if (typeof saldo === "number") {
    pushIf(saldo >= 0, {
      type: "caixa",
      title: "Caixa com saldo positivo",
      summary: `Saldo consolidado informado: ${saldo}.`,
      severity: "info",
      priority: 40,
      impact: "medio",
      origem: "context-snapshot",
      module: "financeiro",
      deepLink: `/${slug}/financeiro/caixa`,
      evidence: [{ metric: "saldoAtual", value: saldo, source: "cash-intelligence" }],
    });
    pushIf(saldo < 0, {
      type: "risco",
      title: "Caixa com saldo negativo",
      summary: `Saldo consolidado informado está negativo: ${saldo}.`,
      severity: "critica",
      priority: 95,
      impact: "alto",
      origem: "context-snapshot",
      module: "financeiro",
      deepLink: `/${slug}/financeiro/caixa`,
      suggestedOwnerRole: "financeiro",
      evidence: [{ metric: "saldoAtual", value: saldo, source: "cash-intelligence" }],
    });
  }

  const estoqueBaixo = m.estoqueAbaixoMinimo;
  if (typeof estoqueBaixo === "number" && estoqueBaixo > 0) {
    pushIf(true, {
      type: "estoque",
      title: "Itens abaixo do estoque mínimo",
      summary: `${estoqueBaixo} SKU(s) abaixo do mínimo cadastrado.`,
      severity: "alta",
      priority: 80,
      impact: "alto",
      origem: "context-snapshot",
      module: "estoque",
      deepLink: `/${slug}/estoque`,
      suggestedOwnerRole: "estoque",
      evidence: [
        {
          metric: "estoqueAbaixoMinimo",
          value: estoqueBaixo,
          source: "estoque-dashboard",
        },
      ],
    });
  }

  const osAbertas = m.osAbertas;
  if (typeof osAbertas === "number" && osAbertas > 0) {
    pushIf(true, {
      type: "operacao",
      title: "Ordens de serviço em aberto",
      summary: `${osAbertas} OS abertas no snapshot.`,
      severity: "media",
      priority: 60,
      impact: "medio",
      origem: "context-snapshot",
      module: "operacoes",
      deepLink: `/${slug}/ordens`,
      evidence: [{ metric: "osAbertas", value: osAbertas, source: "os-dashboard" }],
    });
  }

  const clientesSemRetorno = m.clientesSemRetorno;
  if (typeof clientesSemRetorno === "number" && clientesSemRetorno > 0) {
    pushIf(true, {
      type: "cliente",
      title: "Clientes sem retorno",
      summary: `${clientesSemRetorno} cliente(s) precisam de atenção de follow-up.`,
      severity: "media",
      priority: 55,
      impact: "medio",
      origem: "context-snapshot",
      module: "crm",
      deepLink: `/${slug}/crm`,
      suggestedOwnerRole: "comercial",
      evidence: [
        {
          metric: "clientesSemRetorno",
          value: clientesSemRetorno,
          source: "crm-dashboard",
        },
      ],
    });
  }

  if (insights.length === 0 && input.snapshot.missingData.length > 0) {
    // Insight honesto de indisponibilidade — sem números inventados
    const evid = makeMetricEvidence({
      tenantId: input.tenantId,
      module: input.module,
      source: "context-engine",
      metric: "coverage",
      value: input.snapshot.coverage,
      reliability: "baixa",
      freshness: "unknown",
    });
    insights.push({
      id: randomUUID(),
      type: "compliance",
      title: "Cobertura insuficiente para insights",
      summary: `Fontes faltantes: ${input.snapshot.missingData.join(", ")}.`,
      severity: "info",
      priority: 10,
      impact: "baixo",
      confidence: computeConfidence({
        evidence: [evid],
        missingSources: input.snapshot.missingData,
      }),
      evidenceIds: [evid.id],
      origem: "context-engine",
      status: "active",
      module: input.module,
    });
  }

  return insights.sort((a, b) => b.priority - a.priority);
}
