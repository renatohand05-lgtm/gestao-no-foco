"use client";

import { useMemo, useState } from "react";

import { ExecutiveTimelineEmptyState } from "@/components/dashboard/executive-timeline/executive-timeline-empty-state";
import { ExecutiveTimelineFilter } from "@/components/dashboard/executive-timeline/executive-timeline-filter";
import { ExecutiveTimelineItem } from "@/components/dashboard/executive-timeline/executive-timeline-item";
import { ExecutiveBadge, ExecutiveSection } from "@/components/executive";
import {
  runExecutiveTimeline,
  type ExecutiveTimelineCategory,
  type ExecutiveTimelineSort,
} from "@/lib/executive-timeline";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  ai: ExecutiveAiResult;
  predictive: PredictiveIntelligenceResult;
  decision?: ExecutiveDecisionResult | null;
};

/**
 * Executive Timeline — abaixo da Predictive Intelligence (Gate 20.5).
 */
export function ExecutiveTimelinePanel({
  tenantSlug,
  ai,
  predictive,
  decision = null,
}: Props) {
  const [sort, setSort] = useState<ExecutiveTimelineSort>("recent");
  const [categories, setCategories] = useState<ExecutiveTimelineCategory[]>([]);

  const data = useMemo(
    () =>
      runExecutiveTimeline({
        tenantSlug,
        ai,
        predictive,
        decision,
        sort,
        categories: categories.length > 0 ? categories : null,
      }),
    [tenantSlug, ai, predictive, decision, sort, categories],
  );

  const critical = data.events.filter((e) => e.severity === "critical").length;
  const positive = data.events.filter((e) => e.severity === "positive").length;

  return (
    <div
      data-dashboard-block="executive-timeline"
      data-timeline-engine={data.engineVersion}
      className={cn(gofMotion.fade)}
    >
      <ExecutiveSection
        title="Executive Timeline"
        description="Linha do tempo inteligente · eventos com evidência do snapshot executivo."
        panel
        actions={
          <div className="flex flex-wrap gap-1.5">
            <ExecutiveBadge tone="neutral" variant="outline">
              {data.total} evento{data.total === 1 ? "" : "s"}
            </ExecutiveBadge>
            {critical > 0 ? (
              <ExecutiveBadge tone="danger" variant="soft">
                {critical} crítico{critical === 1 ? "" : "s"}
              </ExecutiveBadge>
            ) : null}
            {positive > 0 ? (
              <ExecutiveBadge tone="success" variant="soft">
                {positive} positivo{positive === 1 ? "" : "s"}
              </ExecutiveBadge>
            ) : null}
          </div>
        }
        className="space-y-4"
      >
        <ExecutiveTimelineFilter
          sort={sort}
          onSortChange={setSort}
          categories={categories}
          onCategoriesChange={setCategories}
        />

        {data.events.length === 0 ? (
          <ExecutiveTimelineEmptyState className="py-8" />
        ) : (
          <ol className="relative space-y-3 border-l border-border/60 ml-1.5">
            {data.events.map((event) => (
              <ExecutiveTimelineItem key={event.id} event={event} />
            ))}
          </ol>
        )}

        <p className={gofTypography.caption}>
          Motor {data.engineVersion} · sem IA generativa · dedupe e ordenação
          locais.
        </p>
      </ExecutiveSection>
    </div>
  );
}
