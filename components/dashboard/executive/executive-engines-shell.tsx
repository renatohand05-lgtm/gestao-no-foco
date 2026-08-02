"use client";

import { useMemo } from "react";

import { ExecutiveCopilotPanel } from "@/components/ai/executive-copilot";
import { BusinessHealthCard } from "@/components/dashboard/business-health";
import { DecisionCenterPanel } from "@/components/dashboard/executive-decision-center";
import { ExecutiveCommandCenter } from "@/components/dashboard/executive-command-center";
import { ExecutiveIntelligenceSignalsPanel } from "@/components/dashboard/executive/executive-intelligence-signals-panel";
import { ExecutiveTimelinePanel } from "@/components/dashboard/executive-timeline";
import { PredictiveIntelligencePanel } from "@/components/dashboard/predictive";
import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import {
  aggregateCommandSources,
  type EccHojeKpis,
} from "@/lib/executive-command-center";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import type { DashboardCharts } from "@/types/dashboard-executive";
import { gofMotion } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  ai: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  tenantSlug: string;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  predictive: PredictiveIntelligenceResult;
  feeds?: ExecutiveAiInput | null;
  hoje?: EccHojeKpis | null;
  /** Séries opcionais já carregadas no dashboard (sinais 29.4). */
  charts?: DashboardCharts | null;
};

/**
 * Orquestra engines 20.2–20.7 uma vez por paint.
 * RC1: Command Center é o único hero do topo.
 */
export function ExecutiveEnginesShell({
  ai,
  decision = null,
  tenantSlug,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
  predictive,
  feeds = null,
  hoje = null,
  charts = null,
}: Props) {
  const shared = useMemo(
    () =>
      aggregateCommandSources({
        tenantSlug,
        ai,
        predictive,
        feeds,
        decision,
      }),
    [tenantSlug, ai, predictive, feeds, decision],
  );

  return (
    <div className={cn("space-y-5 min-w-0", gofMotion.fade)}>
      <ExecutiveCommandCenter
        tenantSlug={tenantSlug}
        greeting={greeting}
        tenantName={tenantName}
        dateLabel={dateLabel}
        updatedAtLabel={updatedAtLabel}
        ai={ai}
        predictive={predictive}
        feeds={feeds}
        decision={decision}
        hoje={hoje}
        businessHealth={shared.bh}
        timeline={shared.timeline}
        edc={shared.edc}
      />

      <BusinessHealthCard ai={ai} data={shared.bh} />

      <ExecutiveIntelligenceSignalsPanel
        ai={ai}
        businessHealth={shared.bh}
        charts={charts}
      />

      <ExecutiveCopilotPanel
        tenantSlug={tenantSlug}
        ai={ai}
        decision={decision}
        businessHealth={shared.bh}
        eic={shared.eic}
      />

      <PredictiveIntelligencePanel data={predictive} />

      <ExecutiveTimelinePanel
        tenantSlug={tenantSlug}
        ai={ai}
        predictive={predictive}
        decision={decision}
        businessHealth={shared.bh}
      />

      <DecisionCenterPanel
        tenantSlug={tenantSlug}
        ai={ai}
        predictive={predictive}
        feeds={feeds}
        decision={decision}
        businessHealth={shared.bh}
        timeline={shared.timeline}
        edc={shared.edc}
      />
    </div>
  );
}
