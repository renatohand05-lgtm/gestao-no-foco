/**
 * Fase 27.4 / 27.5 — Domínios CRM, vendas, ops, supply, brief, NLQ, branches, automation.
 */

import { runExecutiveCopilot } from "../copilot/core.ts";
import type { ContextMetricInput } from "../context/engine.ts";
import { computeConfidence } from "../confidence/engine.ts";
import { makeMetricEvidence } from "../evidence/registry.ts";
import { newCorrelationId } from "../provider/gateway.ts";
import type {
  AutomationDraft,
  IntelligenceIntent,
  IntelligenceModule,
  IntelligenceResponse,
} from "../types.ts";
import { randomUUID } from "node:crypto";

async function domainAsk(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  module: IntelligenceModule;
  intent: IntelligenceIntent;
  question: string;
  metrics: ContextMetricInput[];
}): Promise<IntelligenceResponse> {
  return runExecutiveCopilot({
    request: {
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: input.permissions,
      module: input.module,
      intent: input.intent,
      question: input.question,
      correlationId: newCorrelationId(),
      requestedMode: "deterministic",
    },
    metrics: input.metrics,
    slug: input.slug,
  });
}

export async function analyzeCrm(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  clientesSemRetorno?: number | null;
  pipelineEstagnado?: number | null;
  /** churn só se base confiável */
  churnProvavel?: number | null;
  churnConfiavel?: boolean;
}) {
  const metrics: ContextMetricInput[] = [
    {
      key: "clientesSemRetorno",
      value: input.clientesSemRetorno ?? null,
      source: "crm",
      available: input.clientesSemRetorno != null,
    },
    {
      key: "pipelineEstagnado",
      value: input.pipelineEstagnado ?? null,
      source: "crm",
      available: input.pipelineEstagnado != null,
    },
    {
      key: "churnProvavel",
      value: input.churnProvavel ?? null,
      source: "crm",
      available: Boolean(input.churnConfiavel && input.churnProvavel != null),
    },
  ];
  const res = await domainAsk({
    ...input,
    module: "crm",
    intent: "summarize_crm",
    question: "Resumo da carteira CRM",
    metrics,
  });
  if (!input.churnConfiavel) {
    return {
      ...res,
      limitations: [
        ...res.limitations,
        "Churn não calculado — base insuficiente (não inventado).",
      ],
    };
  }
  return res;
}

export async function analyzeSales(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  faturamento?: number | null;
  ticketAtual?: number | null;
  ticketAnterior?: number | null;
}) {
  const metrics: ContextMetricInput[] = [
    {
      key: "faturamento",
      value: input.faturamento ?? null,
      source: "vendas",
      available: input.faturamento != null,
    },
    {
      key: "ticketAtual",
      value: input.ticketAtual ?? null,
      source: "vendas",
      available: input.ticketAtual != null,
    },
    {
      key: "ticketAnterior",
      value: input.ticketAnterior ?? null,
      source: "vendas",
      available: input.ticketAnterior != null,
    },
  ];
  const res = await domainAsk({
    ...input,
    module: "vendas",
    intent: "analyze_sales",
    question: "Analise minhas vendas",
    metrics,
  });
  if (
    input.ticketAtual != null &&
    input.ticketAnterior != null &&
    input.ticketAnterior !== 0
  ) {
    const delta =
      ((input.ticketAtual - input.ticketAnterior) / Math.abs(input.ticketAnterior)) *
      100;
    return {
      ...res,
      answer: `${res.answer} Ticket médio variou ${delta.toFixed(1)}% vs período anterior (verificável).`,
    };
  }
  return {
    ...res,
    limitations: [
      ...res.limitations,
      "Comparação de ticket indisponível — período anterior ausente.",
    ],
  };
}

export async function analyzeOperations(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  osAbertas?: number | null;
  osAtrasadas?: number | null;
  osParadas?: number | null;
}) {
  return domainAsk({
    ...input,
    module: "operacoes",
    intent: "analyze_operations",
    question: "Como está a operação?",
    metrics: [
      {
        key: "osAbertas",
        value: input.osAbertas ?? null,
        source: "os",
        available: input.osAbertas != null,
      },
      {
        key: "osAtrasadas",
        value: input.osAtrasadas ?? null,
        source: "os",
        available: input.osAtrasadas != null,
      },
      {
        key: "osParadas",
        value: input.osParadas ?? null,
        source: "os",
        available: input.osParadas != null,
      },
    ],
  });
}

export async function analyzeInventory(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  estoqueAbaixoMinimo?: number | null;
  estoqueZerado?: number | null;
  valorParado?: number | null;
}) {
  return domainAsk({
    ...input,
    module: "estoque",
    intent: "analyze_inventory",
    question: "Quais produtos estão críticos?",
    metrics: [
      {
        key: "estoqueAbaixoMinimo",
        value: input.estoqueAbaixoMinimo ?? null,
        source: "estoque",
        available: input.estoqueAbaixoMinimo != null,
      },
      {
        key: "estoqueZerado",
        value: input.estoqueZerado ?? null,
        source: "estoque",
        available: input.estoqueZerado != null,
      },
      {
        key: "valorParado",
        value: input.valorParado ?? null,
        source: "estoque",
        available: input.valorParado != null,
      },
    ],
  });
}

export async function analyzePurchases(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  pedidosAtrasados?: number | null;
  divergencias?: number | null;
}) {
  return domainAsk({
    ...input,
    module: "compras",
    intent: "analyze_purchases",
    question: "Analise compras e fornecedores",
    metrics: [
      {
        key: "pedidosAtrasados",
        value: input.pedidosAtrasados ?? null,
        source: "compras",
        available: input.pedidosAtrasados != null,
      },
      {
        key: "divergencias",
        value: input.divergencias ?? null,
        source: "compras",
        available: input.divergencias != null,
      },
    ],
  });
}

export async function buildDailyExecutiveBrief(input: {
  tenantId: string;
  userId: string;
  userName: string;
  permissions: readonly string[];
  slug: string;
  faturamento?: number | null;
  saldoAtual?: number | null;
  estoqueAbaixoMinimo?: number | null;
  osAbertas?: number | null;
}) {
  const res = await domainAsk({
    ...input,
    module: "inteligencia",
    intent: "daily_brief",
    question: `Briefing diário para ${input.userName}`,
    metrics: [
      {
        key: "faturamento",
        value: input.faturamento ?? null,
        source: "vendas",
        available: input.faturamento != null,
      },
      {
        key: "saldoAtual",
        value: input.saldoAtual ?? null,
        source: "cash",
        available: input.saldoAtual != null,
      },
      {
        key: "estoqueAbaixoMinimo",
        value: input.estoqueAbaixoMinimo ?? null,
        source: "estoque",
        available: input.estoqueAbaixoMinimo != null,
      },
      {
        key: "osAbertas",
        value: input.osAbertas ?? null,
        source: "os",
        available: input.osAbertas != null,
      },
    ],
  });
  return {
    ...res,
    answer: `Bom dia, ${input.userName}. ${res.answer} (visualização na plataforma — sem envio automático).`,
    summary: "daily_brief",
  };
}

export function compareBranches(input: {
  tenantId: string;
  branches: Array<{
    branchId: string;
    label: string;
    faturamento?: number | null;
    cobertura: number;
  }>;
}): {
  ok: boolean;
  reason?: string;
  ranking: Array<{ branchId: string; label: string; faturamento: number }>;
} {
  const valid = input.branches.filter(
    (b) => b.faturamento != null && b.cobertura >= 0.5,
  );
  if (valid.length < 2) {
    return {
      ok: false,
      reason: "Menos de duas filiais com cobertura suficiente — ranking não gerado.",
      ranking: [],
    };
  }
  return {
    ok: true,
    ranking: valid
      .map((b) => ({
        branchId: b.branchId,
        label: b.label,
        faturamento: b.faturamento as number,
      }))
      .sort((a, b) => b.faturamento - a.faturamento),
  };
}

export type NlqResult = {
  intent: IntelligenceIntent;
  safe: boolean;
  reason?: string;
};

export function classifyNaturalLanguageQuery(question: string): NlqResult {
  const q = question.toLowerCase();
  if (/\b(sql|drop\s+table|delete\s+from|truncate)\b/i.test(q)) {
    return {
      intent: "natural_language_query",
      safe: false,
      reason: "SQL livre / comando destrutivo bloqueado.",
    };
  }
  if (/caixa|fluxo/.test(q)) return { intent: "analyze_cash_flow", safe: true };
  if (/dre|margem|ebitda/.test(q)) return { intent: "explain_dre", safe: true };
  if (/estoque|sku|ruptura/.test(q)) return { intent: "analyze_inventory", safe: true };
  if (/os|ordem|atrasad/.test(q)) return { intent: "analyze_operations", safe: true };
  if (/cliente|crm|pipeline/.test(q)) return { intent: "summarize_crm", safe: true };
  if (/filial|compar/.test(q)) return { intent: "compare_branches", safe: true };
  if (/venda|fatur|ticket/.test(q)) return { intent: "analyze_sales", safe: true };
  return { intent: "natural_language_query", safe: true };
}

export async function runNaturalLanguageQuery(input: {
  tenantId: string;
  userId: string;
  permissions: readonly string[];
  slug: string;
  question: string;
  metrics?: ContextMetricInput[];
}): Promise<IntelligenceResponse> {
  const classified = classifyNaturalLanguageQuery(input.question);
  if (!classified.safe) {
    const evid = makeMetricEvidence({
      tenantId: input.tenantId,
      module: "inteligencia",
      source: "nlq-guard",
      metric: "blocked",
      value: 0,
      reliability: "alta",
    });
    return {
      id: randomUUID(),
      tenantId: input.tenantId,
      mode: "unavailable",
      status: "error",
      answer: classified.reason ?? "Consulta bloqueada.",
      summary: "nlq_blocked",
      evidence: [evid],
      confidence: computeConfidence({ evidence: [evid] }),
      limitations: [classified.reason ?? "blocked"],
      recommendations: [],
      actions: [],
      createdAt: new Date().toISOString(),
      provider: {
        id: "nlq-guard",
        label: "NLQ Guard",
        kind: "unavailable",
        model: null,
        isExternal: false,
      },
      model: null,
      tokenUsage: null,
      latencyMs: 0,
      auditId: "nlq-blocked",
      correlationId: newCorrelationId(),
    };
  }
  return domainAsk({
    ...input,
    module: "inteligencia",
    intent: classified.intent,
    question: input.question,
    metrics: input.metrics ?? [],
  });
}

export function createAutomationDraft(input: {
  title: string;
  description: string;
  trigger: string;
  module: IntelligenceModule;
  tenantId: string;
  evidenceMetric?: string;
}): AutomationDraft {
  const evid = makeMetricEvidence({
    tenantId: input.tenantId,
    module: input.module,
    source: "automation-draft",
    metric: input.evidenceMetric ?? "draft",
    value: 1,
    reliability: "media",
  });
  return {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    trigger: input.trigger,
    module: input.module,
    status: "draft",
    evidenceIds: [evid.id],
    confidence: computeConfidence({ evidence: [evid] }),
    createdAt: new Date().toISOString(),
    requiresApproval: true,
    autoExecute: false,
  };
}
