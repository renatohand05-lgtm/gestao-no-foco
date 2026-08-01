/**
 * Fase 27 — Copilot Core orchestrator.
 */

import { recordIntelligenceAudit } from "../audit/recorder.ts";
import {
  checkIntelligenceBudget,
  consumeIntelligenceBudget,
  estimateCostUsd,
} from "../cost/guard.ts";
import {
  buildContextSnapshot,
  summarizeSnapshot,
  type ContextMetricInput,
} from "../context/engine.ts";
import { computeConfidence } from "../confidence/engine.ts";
import { getEvidenceByIds } from "../evidence/registry.ts";
import { getIntelligenceFeatureFlags } from "../feature-flags.ts";
import { generateInsightsFromSnapshot } from "../insight/engine.ts";
import {
  safeBlockedResponse,
  validateIntelligenceOutput,
} from "../output/validation.ts";
import { getPromptByIntent } from "../prompt/registry.ts";
import {
  newCorrelationId,
  resolveIntelligenceProvider,
  toProviderInfo,
} from "../provider/gateway.ts";
import {
  draftActionPlanFromRecommendations,
  recommendationsFromInsights,
} from "../recommendation/engine.ts";
import type {
  IntelligenceRequest,
  IntelligenceResponse,
} from "../types.ts";
import { randomUUID } from "node:crypto";

export const COPILOT_SUGGESTIONS = [
  "Explique meu resultado do mês",
  "Como está meu caixa?",
  "Qual é meu maior risco?",
  "O que devo priorizar hoje?",
  "Onde estou perdendo margem?",
  "Quais produtos estão críticos?",
  "Quais clientes precisam de atenção?",
  "Compare minhas filiais",
  "Gere um plano de ação",
  "Mostre oportunidades rápidas",
] as const;

export function hasIntelligencePermission(
  permissions: readonly string[],
  needed: string,
): boolean {
  return permissions.includes(needed) || permissions.includes("inteligencia.visualizar");
}

export async function runExecutiveCopilot(input: {
  request: IntelligenceRequest;
  metrics: ContextMetricInput[];
  slug?: string;
  extraMissingSources?: string[];
  coverageNotes?: string[];
  consistency?: number;
}): Promise<IntelligenceResponse> {
  const started = Date.now();
  const flags = getIntelligenceFeatureFlags();
  const correlationId =
    input.request.correlationId || newCorrelationId(input.request.userId);

  if (!flags.enabled || !flags.executiveCopilot) {
    return unavailableResponse(input.request, correlationId, started, "feature_disabled");
  }

  if (!hasIntelligencePermission(input.request.permissions, "inteligencia.perguntar")) {
    return forbiddenResponse(input.request, correlationId, started);
  }

  const budget = checkIntelligenceBudget({
    tenantId: input.request.tenantId,
    userId: input.request.userId,
  });
  if (!budget.ok) {
    return budgetResponse(input.request, correlationId, started, budget.reason ?? "budget");
  }

  const snapshot = buildContextSnapshot({
    request: input.request,
    metrics: input.metrics,
  });
  const insights = generateInsightsFromSnapshot({
    tenantId: input.request.tenantId,
    module: input.request.module,
    snapshot,
    slug: input.slug,
  });
  const recommendations = recommendationsFromInsights(
    insights,
    input.request.userId,
  );
  const plan = draftActionPlanFromRecommendations(
    recommendations,
    input.request.userId,
    "Plano de ação executivo (rascunho)",
  );

  const resolved = resolveIntelligenceProvider(input.request.requestedMode);
  const prompt = getPromptByIntent(input.request.intent);
  const contextSummary = summarizeSnapshot(snapshot);

  let answer: string;
  let summary: string;
  let limitations: string[] = [];
  let model: string | null = "rules-v27";
  let tokenUsage: IntelligenceResponse["tokenUsage"] = null;
  let mode = resolved.mode;
  let status: IntelligenceResponse["status"] = "ok";

  if (mode === "unavailable") {
    return unavailableResponse(
      input.request,
      correlationId,
      started,
      resolved.fallbackReason ?? "unavailable",
    );
  }

  try {
    const generated = await resolved.provider.generate(
      { ...input.request, correlationId },
      contextSummary,
    );
    answer = generated.answer;
    summary = generated.summary;
    limitations = [
      ...generated.limitations,
      ...(resolved.fallbackReason ? [resolved.fallbackReason] : []),
      ...(prompt ? [`Prompt ${prompt.id}@${prompt.version}`] : []),
    ];
    model = generated.model ?? model;
    tokenUsage = generated.tokenUsage ?? null;
    if (resolved.fallbackReason) status = "fallback_deterministic";
  } catch {
    mode = "deterministic";
    status = "fallback_deterministic";
    answer =
      "Provider indisponível. Exibindo leitura determinística com base no snapshot.";
    summary = "fallback_deterministic";
    limitations = ["Fallback explícito — provider não fingido como ativo."];
  }

  // Anexar prioridades reais dos insights (sem inventar)
  if (insights.length > 0) {
    const top = insights[0];
    answer += ` Prioridade atual: ${top.title} (${top.summary})`;
  } else if (snapshot.missingData.length > 0) {
    status = "partial";
    answer += ` Fontes faltantes: ${snapshot.missingData.join(", ")}.`;
  }

  const evidence = getEvidenceByIds(insights.flatMap((i) => i.evidenceIds));
  const missingSources = [
    ...snapshot.missingData,
    ...(input.extraMissingSources ?? []),
  ];
  let confidence = computeConfidence({
    evidence,
    missingSources,
    sampleSize: evidence.length,
    consistency: input.consistency,
  });

  // Number verification — bloqueia divergências
  const { blockDivergentAnswer } = await import("../verification/numbers.ts");
  const verified = blockDivergentAnswer({ answer, evidence });
  if (verified.blocked) {
    answer = verified.answer;
    limitations = [...limitations, ...verified.limitations];
    status = "error";
    confidence = computeConfidence({
      evidence: [],
      missingSources: ["divergencia_critica"],
      sampleSize: 0,
      consistency: 0,
    });
  }

  if (input.coverageNotes?.length) {
    limitations = [...limitations, ...input.coverageNotes];
  }

  // Modo deterministic oficial — nunca rotular como IA generativa
  if (mode === "deterministic") {
    limitations = [
      ...limitations,
      "Modo Determinístico: análise baseada em dados, regras e métricas da empresa — não é IA generativa.",
      "Provider externo: não configurado.",
    ];
  }

  const response: IntelligenceResponse = {
    id: randomUUID(),
    tenantId: input.request.tenantId,
    mode,
    status,
    answer,
    summary,
    evidence,
    confidence,
    limitations,
    recommendations,
    actions: plan ? [plan] : [],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    provider: toProviderInfo(resolved.provider, mode, model),
    model,
    tokenUsage,
    latencyMs: Date.now() - started,
    auditId: "",
    correlationId,
  };

  const validation = validateIntelligenceOutput(response, input.request.tenantId);
  const finalResponse = validation.ok
    ? response
    : safeBlockedResponse(response, validation.errors);

  const audit = recordIntelligenceAudit({
    correlationId,
    userId: input.request.userId,
    tenantId: input.request.tenantId,
    companyId: input.request.companyId,
    branchId: input.request.branchId,
    module: input.request.module,
    intent: input.request.intent,
    mode: finalResponse.mode,
    providerId: finalResponse.provider.id,
    model: finalResponse.model,
    confidenceLevel: finalResponse.confidence.level,
    limitations: finalResponse.limitations,
    sources: snapshot.sources,
    answer: finalResponse.answer,
    recommendationCount: finalResponse.recommendations.length,
    latencyMs: finalResponse.latencyMs,
    estimatedCost: estimateCostUsd(0),
    fallbackReason: resolved.fallbackReason,
    status: finalResponse.status,
    error: validation.ok ? undefined : validation.errors.join(","),
  });

  consumeIntelligenceBudget({
    tenantId: input.request.tenantId,
    userId: input.request.userId,
  });

  return { ...finalResponse, auditId: audit.auditId };
}

function baseShell(
  request: IntelligenceRequest,
  correlationId: string,
  started: number,
): Omit<
  IntelligenceResponse,
  "status" | "answer" | "summary" | "limitations" | "confidence" | "auditId" | "mode" | "provider"
> {
  return {
    id: randomUUID(),
    tenantId: request.tenantId,
    evidence: [],
    recommendations: [],
    actions: [],
    createdAt: new Date().toISOString(),
    model: null,
    tokenUsage: null,
    latencyMs: Date.now() - started,
    correlationId,
  };
}

function unavailableResponse(
  request: IntelligenceRequest,
  correlationId: string,
  started: number,
  reason: string,
): IntelligenceResponse {
  const shell = baseShell(request, correlationId, started);
  const audit = recordIntelligenceAudit({
    correlationId,
    userId: request.userId,
    tenantId: request.tenantId,
    module: request.module,
    intent: request.intent,
    mode: "unavailable",
    providerId: "none",
    confidenceLevel: "indisponivel",
    limitations: [reason],
    sources: [],
    answer: reason,
    recommendationCount: 0,
    latencyMs: shell.latencyMs,
    status: "unavailable",
  });
  return {
    ...shell,
    mode: "unavailable",
    status: "unavailable",
    answer:
      "Inteligência indisponível neste momento. Nenhuma resposta fictícia foi gerada.",
    summary: reason,
    confidence: {
      level: "indisponivel",
      score: null,
      coverage: 0,
      freshness: 0,
      consistency: 0,
      sampleSize: 0,
      sourceCount: 0,
      missingSources: [reason],
      explanation: reason,
    },
    limitations: [reason],
    provider: {
      id: "none",
      label: "Indisponível",
      kind: "unavailable",
      model: null,
      isExternal: false,
    },
    auditId: audit.auditId,
  };
}

function forbiddenResponse(
  request: IntelligenceRequest,
  correlationId: string,
  started: number,
): IntelligenceResponse {
  const r = unavailableResponse(request, correlationId, started, "permission_denied");
  return { ...r, status: "forbidden", answer: "Permissão negada para consultar inteligência." };
}

function budgetResponse(
  request: IntelligenceRequest,
  correlationId: string,
  started: number,
  reason: string,
): IntelligenceResponse {
  const r = unavailableResponse(request, correlationId, started, reason);
  return {
    ...r,
    status: "budget_exceeded",
    answer: "Limite de uso de inteligência atingido para este período.",
  };
}
