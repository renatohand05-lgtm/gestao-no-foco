/**
 * Fase 27.3 — Domínios financeiros (DRE / caixa / plano) — sem inventar.
 */

import { runExecutiveCopilot } from "../copilot/core.ts";
import type { ContextMetricInput } from "../context/engine.ts";
import type {
  IntelligenceRequest,
  IntelligenceResponse,
} from "../types.ts";
import { newCorrelationId } from "../provider/gateway.ts";

export type DreExplanationInput = {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  period?: IntelligenceRequest["period"];
  /** Métricas DRE reais — null/undefined = indisponível */
  receita?: number | null;
  custos?: number | null;
  despesas?: number | null;
  margemContribuicao?: number | null;
  ebitda?: number | null;
  lucroLiquido?: number | null;
  companyId?: string | null;
  branchId?: string | null;
};

export async function explainDre(
  input: DreExplanationInput,
): Promise<IntelligenceResponse> {
  const metrics: ContextMetricInput[] = [
    {
      key: "receita",
      value: input.receita ?? null,
      source: "dre",
      available: input.receita != null,
    },
    {
      key: "custos",
      value: input.custos ?? null,
      source: "dre",
      available: input.custos != null,
    },
    {
      key: "despesas",
      value: input.despesas ?? null,
      source: "dre",
      available: input.despesas != null,
    },
    {
      key: "margemContribuicao",
      value: input.margemContribuicao ?? null,
      source: "dre",
      available: input.margemContribuicao != null,
    },
    {
      key: "ebitda",
      value: input.ebitda ?? null,
      source: "dre",
      available: input.ebitda != null,
    },
    {
      key: "lucroLiquido",
      value: input.lucroLiquido ?? null,
      source: "dre",
      available: input.lucroLiquido != null,
    },
  ];

  const request: IntelligenceRequest = {
    tenantId: input.tenantId,
    companyId: input.companyId,
    branchId: input.branchId,
    userId: input.userId,
    permissions: input.permissions,
    module: "financeiro",
    intent: "explain_dre",
    question: "Explique meu DRE do período",
    period: input.period,
    correlationId: newCorrelationId(),
    requestedMode: "deterministic",
  };

  const res = await runExecutiveCopilot({
    request,
    metrics,
    slug: input.slug,
  });

  const parts: string[] = ["Explicação DRE (modo deterministic)."];
  if (input.receita != null) parts.push(`Receita informada: ${input.receita}.`);
  else parts.push("Receita indisponível na fonte.");
  if (input.margemContribuicao != null) {
    parts.push(
      `Margem de contribuição (não confundir com lucro líquido): ${input.margemContribuicao}.`,
    );
  }
  if (input.ebitda != null) parts.push(`EBITDA informado: ${input.ebitda}.`);
  if (input.lucroLiquido == null) {
    parts.push("Lucro líquido indisponível — não estimado.");
  } else {
    parts.push(`Lucro líquido informado: ${input.lucroLiquido}.`);
  }

  return {
    ...res,
    answer: parts.join(" "),
    summary: "explain_dre",
  };
}

export async function analyzeCashFlow(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  saldoAtual?: number | null;
  proj7?: number | null;
  proj15?: number | null;
  proj30?: number | null;
  vencidos?: number | null;
  companyId?: string | null;
  branchId?: string | null;
}): Promise<IntelligenceResponse> {
  const metrics: ContextMetricInput[] = [
    {
      key: "saldoAtual",
      value: input.saldoAtual ?? null,
      source: "cash-intelligence",
      available: input.saldoAtual != null,
    },
    {
      key: "proj7",
      value: input.proj7 ?? null,
      source: "cash-intelligence",
      available: input.proj7 != null,
    },
    {
      key: "proj15",
      value: input.proj15 ?? null,
      source: "cash-intelligence",
      available: input.proj15 != null,
    },
    {
      key: "proj30",
      value: input.proj30 ?? null,
      source: "cash-intelligence",
      available: input.proj30 != null,
    },
    {
      key: "vencidos",
      value: input.vencidos ?? null,
      source: "cash-intelligence",
      available: input.vencidos != null,
    },
  ];

  const request: IntelligenceRequest = {
    tenantId: input.tenantId,
    companyId: input.companyId,
    branchId: input.branchId,
    userId: input.userId,
    permissions: input.permissions,
    module: "financeiro",
    intent: "analyze_cash_flow",
    question: "Como está meu caixa?",
    correlationId: newCorrelationId(),
    requestedMode: "deterministic",
  };

  const res = await runExecutiveCopilot({
    request,
    metrics,
    slug: input.slug,
  });

  const lines = ["Análise de fluxo de caixa (deterministic)."];
  if (input.saldoAtual != null) lines.push(`Saldo atual: ${input.saldoAtual}.`);
  else lines.push("Saldo atual indisponível.");
  if (input.proj7 == null && input.proj15 == null && input.proj30 == null) {
    lines.push("Projeções indisponíveis — horizonte limitado; sem projeção falsa.");
  } else {
    if (input.proj7 != null) lines.push(`Projeção 7d: ${input.proj7}.`);
    if (input.proj15 != null) lines.push(`Projeção 15d: ${input.proj15}.`);
    if (input.proj30 != null) lines.push(`Projeção 30d: ${input.proj30}.`);
  }
  if (input.vencidos != null) lines.push(`Vencidos: ${input.vencidos}.`);

  return { ...res, answer: lines.join(" "), summary: "analyze_cash_flow" };
}
