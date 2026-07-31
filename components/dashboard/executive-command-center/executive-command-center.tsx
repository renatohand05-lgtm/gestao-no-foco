"use client";

import { useMemo } from "react";

import { ExecutiveActionCenter } from "@/components/dashboard/executive-command-center/executive-action-center";
import { ExecutiveAlertCenter } from "@/components/dashboard/executive-command-center/executive-alert-center";
import { ExecutiveForecastPanel } from "@/components/dashboard/executive-command-center/executive-forecast-panel";
import { ExecutiveGoalsPanel } from "@/components/dashboard/executive-command-center/executive-goals-panel";
import { ExecutiveHeader } from "@/components/dashboard/executive-command-center/executive-header";
import { ExecutiveKpis } from "@/components/dashboard/executive-command-center/executive-kpis";
import { ExecutiveOpportunityPanel } from "@/components/dashboard/executive-command-center/executive-opportunity-panel";
import { ExecutivePriorityList } from "@/components/dashboard/executive-command-center/executive-priority-list";
import { ExecutiveRiskPanel } from "@/components/dashboard/executive-command-center/executive-risk-panel";
import { ExecutiveSection } from "@/components/executive";
import type { BusinessHealthResult } from "@/lib/dashboard/business-health-engine";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import {
  runExecutiveCommandCenter,
  type EccHojeKpis,
} from "@/lib/executive-command-center";
import type { EdcResult } from "@/lib/executive-decision-center";
import type { ExecutiveTimelineResult } from "@/lib/executive-timeline";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import { gofGrid, gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "@/lib/ai/executive-ai-types";

type Props = {
  tenantSlug: string;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  decision?: ExecutiveDecisionResult | null;
  hoje?: EccHojeKpis | null;
  businessHealth?: BusinessHealthResult;
  timeline?: ExecutiveTimelineResult;
  edc?: EdcResult;
};

/**
 * Executive Command Center — experiência principal do topo (RC1).
 * Resumo consolidado · detalhes nos módulos abaixo.
 */
export function ExecutiveCommandCenter({
  tenantSlug,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  ai,
  predictive,
  feeds = null,
  decision = null,
  hoje = null,
  businessHealth,
  timeline,
  edc,
}: Props) {
  const data = useMemo(
    () =>
      runExecutiveCommandCenter({
        tenantSlug,
        ai,
        predictive,
        feeds,
        decision,
        hoje,
        greetingOverride: greeting.includes(".")
          ? greeting
          : `${greeting}.`,
        businessHealth,
        timeline,
        edc,
      }),
    [
      tenantSlug,
      ai,
      predictive,
      feeds,
      decision,
      hoje,
      greeting,
      businessHealth,
      timeline,
      edc,
    ],
  );

  const highlightKpis = data.kpis.filter((k) => k.available);

  return (
    <div
      data-dashboard-block="executive-command-center"
      data-ecc-engine={data.engineVersion}
      data-ecc-hero="consolidated"
      data-command-center-compact="1"
      data-sprint="26.1"
      className={cn("space-y-3 min-w-0", gofMotion.fade)}
    >
      <ExecutiveSection
        title="Command Center"
        description="Resumo acionável · evidências nos módulos abaixo"
        panel
        className="space-y-3"
      >
        <ExecutiveHeader
          greeting={greeting}
          tenantName={tenantName}
          dateLabel={dateLabel}
          updatedAtLabel={updatedAtLabel}
          score={data.score}
          brief={data.morningBrief}
          summaryLine={data.summaryLine}
          criticalDecisionsCount={data.criticalDecisionsCount}
          pendingDecisionsCount={data.pendingDecisionsCount}
          highlightKpis={highlightKpis}
          topRisk={data.risks[0] ?? null}
          topOpportunity={
            data.quickWins[0] ?? data.opportunities[0] ?? null
          }
        />

        <ExecutiveKpis items={data.kpis.slice(0, 4)} />

        <div className={cn(gofGrid.twoCol, "min-w-0 gap-3")}>
          <ExecutivePriorityList items={data.priorities.slice(0, 3)} />
          <ExecutiveRiskPanel items={data.risks.slice(0, 3)} />
          <ExecutiveOpportunityPanel
            items={data.opportunities.slice(0, 3)}
            quickWins={data.quickWins.slice(0, 2)}
          />
          <ExecutiveAlertCenter items={data.alerts.slice(0, 3)} />
        </div>

        <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] open:shadow-[var(--shadow-card)]">
          <summary
            className={cn(
              gofTypography.caption,
              "cursor-pointer px-3 py-2 font-medium text-foreground",
            )}
          >
            Metas, forecast e ações ({data.actions.length})
          </summary>
          <div className="space-y-3 border-t border-[var(--border-subtle)] p-3">
            <ExecutiveGoalsPanel goals={data.goals} />
            <ExecutiveForecastPanel
              cashflow={data.cashflowForecast}
              financial={data.financialForecast}
              operational={data.operationalForecast}
            />
            <ExecutiveActionCenter items={data.actions} />
          </div>
        </details>

        <p className={gofTypography.caption}>
          Motor local {data.engineVersion} · sem IA generativa.
        </p>
      </ExecutiveSection>
    </div>
  );
}
