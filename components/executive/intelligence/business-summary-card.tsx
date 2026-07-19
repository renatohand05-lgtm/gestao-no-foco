import { ExecutiveSummary } from "@/components/executive/presentation";
import { ExecutiveDisclosure } from "@/components/executive/presentation/executive-disclosure";
import { composeExecutiveNarrative } from "@/lib/executive-presentation";
import { exTypography } from "@/lib/design-system";
import type { BusinessSummary } from "@/lib/business-intelligence";

type Props = {
  summary: BusinessSummary;
  confidence?: "baixa" | "media" | "alta";
  confidenceReason?: string | null;
};

/**
 * Resumo BI — narrativa factual (Sprint 13.9).
 */
export function BusinessSummaryCard({
  summary,
  confidence,
  confidenceReason,
}: Props) {
  const narrative = composeExecutiveNarrative({
    headline: summary.headline,
    executiveSummary: summary.executiveSummary,
    status: summary.status,
    confidence,
    confidenceReason,
  });

  return (
    <div className="space-y-3">
      <ExecutiveSummary narrative={narrative} confidence={confidence} />
      <ExecutiveDisclosure summary="Como interpretar este status">
        <p className={exTypography.caption}>
          O status e o texto vêm da Inteligência de Negócio já calculada no
          servidor. Em confiança baixa, trate as conclusões como provisórias.
        </p>
      </ExecutiveDisclosure>
    </div>
  );
}
