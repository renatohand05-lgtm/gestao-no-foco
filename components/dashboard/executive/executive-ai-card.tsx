import { ExecutiveIntelligenceCenter } from "@/components/dashboard/executive/executive-intelligence-center";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";
import type { PredictiveIntelligenceResult } from "@/lib/predictive";

type Props = {
  data: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  tenantSlug: string;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
  predictive: PredictiveIntelligenceResult;
};

/**
 * Compat Gate 18.5 — Intelligence Center + Hero + Copilot + Predictive (20.4).
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
      />
    </div>
  );
}
