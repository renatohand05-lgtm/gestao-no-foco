/**
 * Fase 23 — Providers de inteligência executiva.
 */

import type { AnalyticsProvider } from "../core/metric-types.ts";
import { isAnalyticsExternalAiEnabled } from "../analytics-feature-flags.ts";

export const deterministicExecutiveProvider: AnalyticsProvider = {
  id: "exec-intel-deterministic-v1",
  kind: "deterministic",
  label: "Análise baseada em regras, métricas e histórico do tenant.",
  explain({ metrics, comparisons, alerts, context }) {
    const available = metrics.filter((m) => m.availability === "available");
    const unavailable = metrics.filter((m) => m.availability === "unavailable");
    const topPositive = comparisons.filter((c) => c.tone === "positive").slice(0, 3);
    const topNegative = comparisons.filter((c) => c.tone === "negative").slice(0, 3);

    return [
      {
        id: `insight-summary-${context.tenantId}-${context.asOf}`,
        title: "Resumo executivo",
        summary: `${available.length} métricas disponíveis, ${unavailable.length} indisponíveis (sem estimativa). ${alerts.length} alerta(s) abertos.`,
        dataUsed: available.slice(0, 8).map((m) => m.definitionId),
        period: context.filters.period,
        confidence: available.length ? "medium" : "low",
        origin: "deterministic-provider",
        limitations: [
          "Análise baseada em regras, métricas e histórico do tenant.",
          "Não inventa causas sem evidência nos comparativos/alertas.",
        ],
        suggestedQuestions: [
          "Quais despesas mais cresceram vs período anterior?",
          "Quais filiais/centros concentram o faturamento?",
          "Há risco de caixa nos próximos 30 dias?",
        ],
        requiresHumanReview: true,
        autoExecuted: false,
      },
      ...topNegative.map((c) => ({
        id: `insight-var-${c.definitionId}`,
        title: `Variação negativa: ${c.definitionId}`,
        summary: c.explanation,
        dataUsed: [c.definitionId],
        period: context.filters.period,
        confidence: "medium" as const,
        origin: "comparison-engine",
        limitations: ["Tom derivado da polaridade do catálogo."],
        suggestedQuestions: [`Drill-down de ${c.definitionId}?`],
        requiresHumanReview: true as const,
        autoExecuted: false as const,
      })),
      ...topPositive.slice(0, 2).map((c) => ({
        id: `insight-pos-${c.definitionId}`,
        title: `Variação positiva: ${c.definitionId}`,
        summary: c.explanation,
        dataUsed: [c.definitionId],
        period: context.filters.period,
        confidence: "medium" as const,
        origin: "comparison-engine",
        limitations: ["Não atribui causalidade além dos dados."],
        suggestedQuestions: [] as string[],
        requiresHumanReview: true as const,
        autoExecuted: false as const,
      })),
      ...alerts.slice(0, 3).map((a) => ({
        id: `insight-alert-${a.id}`,
        title: a.title,
        summary: `${a.description} Recomendação: ${a.recommendation}`,
        dataUsed: a.relatedMetricIds,
        period: a.period,
        confidence: "medium" as const,
        origin: a.dedupeKey,
        limitations: ["Alerta determinístico — revisão humana obrigatória."],
        suggestedQuestions: ["Abrir drill-down relacionado?"],
        requiresHumanReview: true as const,
        autoExecuted: false as const,
      })),
    ];
  },
};

export const externalExecutiveStubProvider: AnalyticsProvider = {
  id: "exec-intel-external-stub",
  kind: "external",
  label: "IA externa (preparando)",
  explain() {
    return [
      {
        id: "insight-external-off",
        title: "IA externa não configurada",
        summary:
          "Análise baseada em regras, métricas e histórico do tenant.",
        dataUsed: [],
        period: {
          from: "",
          to: "",
          preset: "custom",
          label: "n/d",
        },
        confidence: "none",
        origin: "external-stub",
        limitations: ["Provider externo desabilitado."],
        suggestedQuestions: [],
        requiresHumanReview: true,
        autoExecuted: false,
      },
    ];
  },
};

export const mockExecutiveProvider: AnalyticsProvider = {
  id: "exec-intel-mock",
  kind: "mock",
  label: "Mock de testes",
  explain() {
    return [];
  },
};

export function resolveExecutiveProvider(
  preferred?: AnalyticsProvider,
): AnalyticsProvider {
  if (preferred) return preferred;
  if (isAnalyticsExternalAiEnabled()) {
    return externalExecutiveStubProvider;
  }
  return deterministicExecutiveProvider;
}
