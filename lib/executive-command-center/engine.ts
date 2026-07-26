/**
 * Executive Command Center Engine — Gate 20.7
 * Consolida 20.1–20.6 · sem fetch · sem LLM · sem regras paralelas.
 */

import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "../ai/executive-ai-types.ts";
import type { BusinessHealthResult } from "../dashboard/business-health-engine.ts";
import type { ExecutiveDecisionResult } from "../dashboard/executive-decision-types.ts";
import type { EdcResult } from "../executive-decision-center/types.ts";
import type { ExecutiveTimelineResult } from "../executive-timeline/types.ts";
import type { PredictiveIntelligenceResult } from "../predictive/types.ts";
import { buildCommandActions, buildCommandAlerts } from "./actions.ts";
import {
  aggregateCommandSources,
  buildCommandForecasts,
  buildCommandGoals,
  buildCommandKpis,
} from "./aggregator.ts";
import { buildCommandOpportunities } from "./opportunities.ts";
import { buildCommandPriorities } from "./priorities.ts";
import { buildCommandRisks } from "./risks.ts";
import { resolveCommandExecutiveScore } from "./scoring.ts";
import {
  buildMorningBrief,
  buildSummaryLine,
  type EccHojeKpis,
} from "./summary.ts";
import { ECC_ENGINE_VERSION, type EccResult } from "./types.ts";

export type RunExecutiveCommandCenterInput = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  decision?: ExecutiveDecisionResult | null;
  businessHealth?: BusinessHealthResult;
  timeline?: ExecutiveTimelineResult;
  edc?: EdcResult;
  hoje?: EccHojeKpis | null;
  /** Ex.: "Bom dia." do contexto do dashboard. */
  greetingOverride?: string | null;
};

export function runExecutiveCommandCenter(
  input: RunExecutiveCommandCenterInput,
): EccResult {
  const { bh, eic, edc } = aggregateCommandSources({
    tenantSlug: input.tenantSlug,
    ai: input.ai,
    predictive: input.predictive,
    feeds: input.feeds,
    decision: input.decision,
    businessHealth: input.businessHealth,
    timeline: input.timeline,
    edc: input.edc,
  });

  const score = resolveCommandExecutiveScore({
    edcScore: edc.executiveScore,
    ai: input.ai,
  });

  const priorities = buildCommandPriorities({ eic, edc });
  const risks = buildCommandRisks({
    eic,
    edc,
    predictive: input.predictive,
  });
  const { opportunities, quickWins } = buildCommandOpportunities({ eic, edc });
  const actions = buildCommandActions(edc);
  const alerts = buildCommandAlerts({
    risks,
    edc,
    feedsAtrasadas: input.feeds?.operacao?.atrasadas ?? null,
    pagarVencido: input.feeds?.financeiro?.pagarVencidoValor ?? null,
    estoqueZerados: input.feeds?.estoque?.zerados ?? null,
  });

  const forecasts = buildCommandForecasts(input.predictive);
  const goals = buildCommandGoals({
    feeds: input.feeds,
    hoje: input.hoje,
  });
  const kpis = buildCommandKpis({
    feeds: input.feeds,
    bh,
    predictive: input.predictive,
    hoje: input.hoje,
  });

  const criticalDecisionsCount = edc.queue.filter(
    (d) => d.priority === "critical",
  ).length;
  const pendingDecisionsCount = edc.queue.filter(
    (d) => d.priority === "critical" || d.priority === "high",
  ).length;

  const generatedAt = input.ai.generatedAt || new Date().toISOString();

  const morningBrief = buildMorningBrief({
    score,
    criticalDecisionsCount,
    pendingDecisionsCount,
    risks,
    quickWins,
    generatedAt,
    greetingOverride: input.greetingOverride,
  });

  return {
    score,
    morningBrief,
    priorities,
    risks,
    opportunities,
    quickWins,
    alerts,
    actions,
    kpis,
    cashflowForecast: forecasts.cashflowForecast,
    financialForecast: forecasts.financialForecast,
    operationalForecast: forecasts.operationalForecast,
    goals,
    pendingDecisionsCount,
    criticalDecisionsCount,
    summaryLine: buildSummaryLine({
      score,
      criticalDecisionsCount,
      risksCount: risks.length,
      opportunitiesCount: opportunities.length,
    }),
    generatedAt,
    engineVersion: ECC_ENGINE_VERSION,
    tenantSlug: input.tenantSlug,
  };
}

export const ExecutiveCommandCenterEngine = {
  version: ECC_ENGINE_VERSION,
  run: runExecutiveCommandCenter,
} as const;
