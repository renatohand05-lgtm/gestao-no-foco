import { ExecutiveIntelligenceCenter } from "@/components/dashboard/executive/executive-intelligence-center";
import type {
  ExecutiveAiInput,
  ExecutiveAiResult,
} from "@/lib/ai/executive-ai-types";
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
  /** Feeds do mesmo ciclo (simulações Decision Center · sem fetch). */
  feeds?: ExecutiveAiInput | null;
};

/**
 * Compat Gate 18.5 — Intelligence Center + Hero + Copilot + Predictive + Timeline + Decision Center.
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
      />
    </div>
  );
}
