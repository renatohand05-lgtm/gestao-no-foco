"use client";

import { useMemo } from "react";

import { DecisionCard } from "@/components/dashboard/executive-decision-center/decision-card";
import { DecisionEmptyState } from "@/components/dashboard/executive-decision-center/decision-empty-state";
import { ExecutiveScoreCard } from "@/components/dashboard/executive-decision-center/executive-score";
import { QuickWins } from "@/components/dashboard/executive-decision-center/quick-wins";
import { SimulationCard } from "@/components/dashboard/executive-decision-center/simulation-card";
import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import type { ExecutiveAiInput, ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import { runExecutiveDecisionCenter } from "@/lib/executive-decision-center";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  decision?: ExecutiveDecisionResult | null;
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
}: Props) {
  const data = useMemo(
    () =>
      runExecutiveDecisionCenter({
        tenantSlug,
        ai,
        predictive,
        feeds,
        decision,
      }),
    [tenantSlug, ai, predictive, feeds, decision],
  );

  const critical = data.queue.filter((d) => d.priority === "critical").length;

  return (
    <div
      data-dashboard-block="executive-decision-center"
      data-edc-engine={data.engineVersion}
      className={cn("space-y-4", gofMotion.fade)}
    >
      <ExecutiveSection
        title="Executive Decision Center"
        description="Fila priorizada de decisões · impacto × urgência × confiança × esforço."
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
        <ExecutiveScoreCard score={data.executiveScore} />

        <QuickWins items={data.quickWins} />

        <div className="space-y-2">
          <h3 className={cn(gofTypography.title, "text-sm")}>
            Fila de decisões
          </h3>
          {data.queue.length === 0 ? (
            <DecisionEmptyState />
          ) : (
            <ol className="space-y-2">
              {data.queue.map((d, idx) => (
                <li key={d.id} className="space-y-1">
                  <p className={gofTypography.caption}>#{idx + 1}</p>
                  <DecisionCard decision={d} />
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-2">
          <h3 className={cn(gofTypography.title, "text-sm")}>
            Simulador “E se?”
          </h3>
          <p className={gofTypography.caption}>
            Cenários determinísticos sobre valores reais do snapshot · Predictive
            local · sem IA generativa.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.simulations.map((s) => (
              <SimulationCard key={s.id} simulation={s} />
            ))}
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
