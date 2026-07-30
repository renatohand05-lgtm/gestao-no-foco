/**
 * Sprint 26.7 — Camada de IA Tributária.
 * Determinística por padrão; IA externa apenas se flag + provider injetado.
 * Nunca executa ações automaticamente.
 */

import { isTaxExternalAiEnabled } from "./tax-feature-flags.ts";
import type {
  ExecutiveTaxDashboard,
  TaxAiRecommendation,
  TaxAlert,
  TaxComputationResult,
  TaxSimulationComparison,
} from "./types.ts";

export type TaxAiProvider = {
  id: string;
  label: string;
  recommend: (ctx: TaxAiContext) => TaxAiRecommendation[];
};

export type TaxAiContext = {
  dashboard: ExecutiveTaxDashboard;
  assessments: TaxComputationResult[];
  alerts: TaxAlert[];
  simulations?: TaxSimulationComparison[];
};

/** Provider determinístico — explica cálculos e sugere cenários. */
export const deterministicTaxAiProvider: TaxAiProvider = {
  id: "tax-ai-deterministic-v1",
  label: "IA Tributária determinística (Gestão no Foco)",
  recommend(ctx) {
    const out: TaxAiRecommendation[] = [];

    for (const a of ctx.assessments.slice(0, 5)) {
      out.push({
        id: `ai-explain-${a.entityId}-${a.period}`,
        title: `Explicação da apuração ${a.regimeCode} · ${a.period}`,
        explanation: a.components
          .map((c) => c.explanation)
          .join(" "),
        origin: `rule:${a.ruleVersionId}`,
        confidence: a.confidence,
        requiresHumanReview: true,
        autoExecuted: false,
        suggestedScenarios: ["regime_change", "revenue_growth"],
      });
    }

    if (ctx.dashboard.reformImpact.regimesInScope.length) {
      out.push({
        id: "ai-reform",
        title: "Impacto da Reforma Tributária",
        explanation: `${ctx.dashboard.reformImpact.summary} ${ctx.dashboard.reformImpact.explanation} Fontes: ${ctx.dashboard.reformImpact.parameterSources.join(", ") || "—"}.`,
        origin: "tax-ai/reform",
        confidence: ctx.dashboard.reformImpact.confidence,
        requiresHumanReview: true,
        autoExecuted: false,
        suggestedScenarios: ["regime_change"],
      });
    }

    for (const opp of ctx.dashboard.opportunities.slice(0, 3)) {
      out.push({
        id: `ai-opp-${opp.id}`,
        title: opp.title,
        explanation: opp.explanation,
        origin: opp.origin,
        confidence: opp.confidence,
        requiresHumanReview: true,
        autoExecuted: false,
        suggestedScenarios: ["product_mix", "regime_change"],
      });
    }

    for (const alert of ctx.alerts.filter((a) => a.severity !== "info").slice(0, 3)) {
      out.push({
        id: `ai-risk-${alert.id}`,
        title: `Risco: ${alert.title}`,
        explanation: alert.message,
        origin: alert.origin,
        confidence: alert.confidence,
        requiresHumanReview: true,
        autoExecuted: false,
        relatedAlertIds: [alert.id],
      });
    }

    for (const sim of (ctx.simulations ?? []).slice(0, 2)) {
      out.push({
        id: `ai-sim-${sim.kind}`,
        title: `Cenário sugerido: ${sim.label}`,
        explanation: `${sim.explanation} Delta ${sim.delta}. Confiança ${sim.confidence}.`,
        origin: `simulation:${sim.kind}`,
        confidence: sim.confidence,
        requiresHumanReview: true,
        autoExecuted: false,
        suggestedScenarios: [sim.kind],
      });
    }

    return out.map((r) => ({
      ...r,
      requiresHumanReview: true as const,
      autoExecuted: false as const,
    }));
  },
};

/** Stub de IA externa — nunca chamado como ativo sem flag. */
export const externalTaxAiStubProvider: TaxAiProvider = {
  id: "tax-ai-external-stub",
  label: "IA Tributária externa (preparando)",
  recommend() {
    return [
      {
        id: "ai-external-unavailable",
        title: "IA externa indisponível",
        explanation:
          "Conector de IA externa está em status preparing. Use o provider determinístico.",
        origin: "tax-ai/external-stub",
        confidence: "low",
        requiresHumanReview: true,
        autoExecuted: false,
      },
    ];
  },
};

export function buildTaxAiRecommendations(
  ctx: TaxAiContext,
  provider: TaxAiProvider = deterministicTaxAiProvider,
): TaxAiRecommendation[] {
  const active =
    provider.id.startsWith("tax-ai-external") && !isTaxExternalAiEnabled()
      ? deterministicTaxAiProvider
      : provider;
  return active.recommend(ctx).map((r) => ({
    ...r,
    requiresHumanReview: true,
    autoExecuted: false,
  }));
}
