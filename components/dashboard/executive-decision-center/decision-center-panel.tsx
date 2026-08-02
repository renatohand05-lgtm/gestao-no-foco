"use client";

import { useMemo } from "react";

import { DecisionCard } from "@/components/dashboard/executive-decision-center/decision-card";
import { DecisionEmptyState } from "@/components/dashboard/executive-decision-center/decision-empty-state";
import { ExecutiveScoreCard } from "@/components/dashboard/executive-decision-center/executive-score";
import { ImpactEffortMatrix } from "@/components/dashboard/executive-decision-center/impact-effort-matrix";
import { QuickWins } from "@/components/dashboard/executive-decision-center/quick-wins";
import { SimulationCard } from "@/components/dashboard/executive-decision-center/simulation-card";
import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import type { ExecutiveAiInput, ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { BusinessHealthResult } from "@/lib/enterprise";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import {
  runExecutiveDecisionCenter,
  type EdcResult,
} from "@/lib/executive-decision-center";
import type { ExecutiveTimelineResult } from "@/lib/executive-timeline";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  decision?: ExecutiveDecisionResult | null;
  businessHealth?: BusinessHealthResult;
  timeline?: ExecutiveTimelineResult;
  /** Resultado já agregado pelo Command Center shell. */
  edc?: EdcResult;
};

/**
 * Executive Decision Center — abaixo da Executive Timeline (Gate 20.6).
 */
export function DecisionCenterPanel({
  tenantSlug,
  ai,
  predictive,
  feeds = null,
  decision = null,
  businessHealth,
  timeline,
  edc: edcProp,
}: Props) {
  const data = useMemo(
    () =>
      edcProp ??
      runExecutiveDecisionCenter({
        tenantSlug,
        ai,
        predictive,
        feeds,
        decision,
        businessHealth,
        timeline,
      }),
    [edcProp, tenantSlug, ai, predictive, feeds, decision, businessHealth, timeline],
  );

  const criticalItems = data.queue.filter((d) => d.priority === "critical");
  const trackingItems = data.queue.filter((d) => d.priority !== "critical");
  const critical = criticalItems.length;

  return (
    <div
      data-dashboard-block="executive-decision-center"
      data-edc-engine={data.engineVersion}
      data-premium-v257="decision-center"
      data-decision-center-layout="v262"
      data-sprint="26.2"
      className={cn("space-y-4 premium-enter", gofMotion.fade)}
    >
      <ExecutiveSection
        title="Executive Decision Center"
        description="Críticas · Quick Wins · Em acompanhamento."
        panel
        actions={
          <div className="flex flex-wrap gap-1.5">
            <ExecutiveBadge tone="neutral" variant="outline">
              {data.total} decisão{data.total === 1 ? "" : "ões"}
            </ExecutiveBadge>
            {critical > 0 ? (
              <ExecutiveBadge tone="danger" variant="soft">
                {critical} crítica{critical === 1 ? "" : "s"}
              </ExecutiveBadge>
            ) : null}
            {data.quickWins.length > 0 ? (
              <ExecutiveBadge tone="success" variant="soft">
                {data.quickWins.length} quick win
                {data.quickWins.length === 1 ? "" : "s"}
              </ExecutiveBadge>
            ) : null}
          </div>
        }
        className="space-y-4"
      >
        <div
          className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          data-decision-top=""
        >
          <ExecutiveScoreCard score={data.executiveScore} />
          <QuickWins items={data.quickWins} />
        </div>

        <div
          className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
          data-decision-body=""
        >
          <div className="space-y-4 min-w-0">
            <div className="space-y-2" data-decision-group="critical">
              <h3 className={cn(gofTypography.title, "text-sm")}>Críticas</h3>
              {criticalItems.length === 0 ? (
                <p className={gofTypography.caption}>Nenhuma crítica agora.</p>
              ) : (
                <ol className="space-y-2">
                  {criticalItems.map((d, idx) => (
                    <li key={d.id} className="space-y-1">
                      <p className={gofTypography.caption}>#{idx + 1}</p>
                      <DecisionCard decision={d} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="space-y-2" data-decision-group="tracking">
              <h3 className={cn(gofTypography.title, "text-sm")}>
                Em acompanhamento
              </h3>
              {trackingItems.length === 0 ? (
                data.queue.length === 0 ? (
                  <DecisionEmptyState />
                ) : (
                  <p className={gofTypography.caption}>
                    Sem itens em acompanhamento.
                  </p>
                )
              ) : (
                <ol className="space-y-2">
                  {trackingItems.map((d, idx) => (
                    <li key={d.id} className="space-y-1">
                      <p className={gofTypography.caption}>#{idx + 1}</p>
                      <DecisionCard decision={d} />
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <ImpactEffortMatrix decisions={data.queue} />
            <div className="space-y-2" data-simulator-block="">
              <h3 className={cn(gofTypography.title, "text-sm")}>
                Simulador “E se?”
              </h3>
              <p className={gofTypography.caption}>
                Interativo sobre baseline real · Predictive local · sem IA
                generativa.
              </p>
              <div className="grid gap-3 sm:grid-cols-1">
                {data.simulations.map((s) => (
                  <SimulationCard key={s.id} simulation={s} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={gofTypography.caption}>
          Motor local {data.engineVersion} · sem OpenAI · somente evidências do
          tenant.
        </p>
      </ExecutiveSection>
    </div>
  );
}
