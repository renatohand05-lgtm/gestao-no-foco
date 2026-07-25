import { ExecutiveIntelligenceCenter } from "@/components/dashboard/executive/executive-intelligence-center";
import type { ExecutiveAiResult } from "@/lib/ai/executive-ai-types";
import type { ExecutiveDecisionResult } from "@/lib/dashboard/executive-decision-types";

type Props = {
  data: ExecutiveAiResult;
  decision?: ExecutiveDecisionResult | null;
  greeting: string;
  tenantName: string;
  dateLabel: string;
  updatedAtLabel: string;
};

/**
 * Compat Gate 18.5 — renderiza o Centro de Inteligência + Hero (20.1.1).
 */
export function ExecutiveAiCard({
  data,
  decision = null,
  greeting,
  tenantName,
  dateLabel,
  updatedAtLabel,
}: Props) {
  return (
    <div data-dashboard-block="ia-executiva">
      <ExecutiveIntelligenceCenter
        ai={data}
        decision={decision}
        greeting={greeting}
        tenantName={tenantName}
        dateLabel={dateLabel}
        updatedAtLabel={updatedAtLabel}
      />
    </div>
  );
}
