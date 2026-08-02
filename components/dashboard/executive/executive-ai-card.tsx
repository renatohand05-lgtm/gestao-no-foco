import { ExecutiveIntelligenceCenter } from "@/components/dashboard/executive/executive-intelligence-center";
import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { EccHojeKpis } from "@/lib/executive-command-center";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";
import type { DashboardCharts } from "@/types/dashboard-executive";

type Props = {
  data: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  tenantSlug: string;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  predictive: PredictiveIntelligenceResult;
  /** Feeds do mesmo ciclo (simulações Decision Center · sem fetch). */
  feeds?: ExecutiveAiInput | null;
  hoje?: EccHojeKpis | null;
  charts?: DashboardCharts | null;
};

/**
 * Compat Gate 18.5 — Command Center + Intelligence Center + módulos 20.x.
 */
export function ExecutiveAiCard({
  data,
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
  return (
    <div data-dashboard-block="ia-executiva">
      <ExecutiveIntelligenceCenter
        ai={data}
        decision={decision}
        tenantSlug={tenantSlug}
        greeting={greeting}
        tenantName={tenantName}
        dateLabel={dateLabel}
        updatedAtLabel={updatedAtLabel}
        predictive={predictive}
        feeds={feeds}
        hoje={hoje}
        charts={charts}
      />
    </div>
  );
}
