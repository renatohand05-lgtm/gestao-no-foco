import { ExecutiveSection } from "@/components/executive";
import { ExecutiveDiagnosisCard } from "@/components/executive/intelligence/executive-diagnosis-card";
import { ExecutiveHealthBar } from "@/components/executive/intelligence/executive-health-bar";
import { ExecutiveInsightsGrid } from "@/components/executive/intelligence/executive-insights-grid";
import { ExecutiveScoreCard } from "@/components/executive/intelligence/executive-score-card";
import { ExecutiveMonthTimeline } from "@/components/executive/intelligence/executive-timeline";
import { exSpacing, exStack, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ExecutiveIntelligenceResult } from "@/lib/intelligence/types";

type Props = {
  data: ExecutiveIntelligenceResult;
};

/**
 * Seção de inteligência executiva (Sprint 11.1).
 * Ação principal vive no Action Center (Sprint 11.4) — sem duplicar no fluxo.
 */
export function ExecutiveIntelligenceSection({ data }: Props) {
  return (
    <ExecutiveSection
      title="Inteligência executiva"
      description="Interpretação automática dos indicadores já carregados — sem novos fetches."
      panel
    >
      <div className={exStack[20]}>
        <div className={cn("grid gap-4 lg:grid-cols-2", exSpacing[16])}>
          <ExecutiveScoreCard score={data.score} />
          <ExecutiveHealthBar health={data.health} />
        </div>

        <div>
          <h3 className={cn("mb-3", exTypography.sectionTitle)}>
            Insights prioritários
          </h3>
          <ExecutiveInsightsGrid insights={data.insights} />
        </div>

        <div className={cn("grid gap-4 lg:grid-cols-2", exSpacing[16])}>
          <ExecutiveDiagnosisCard diagnosis={data.diagnosis} />
          <ExecutiveMonthTimeline timeline={data.timeline} />
        </div>
      </div>
    </ExecutiveSection>
  );
}
