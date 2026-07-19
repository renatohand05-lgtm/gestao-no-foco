import { ExecutiveSection } from "@/components/executive";
import { BusinessCauseCard } from "@/components/executive/intelligence/business-cause-card";
import { BusinessOpportunityCard } from "@/components/executive/intelligence/business-opportunity-card";
import { BusinessPriorityCard } from "@/components/executive/intelligence/business-priority-card";
import { BusinessRiskCard } from "@/components/executive/intelligence/business-risk-card";
import { BusinessSummaryCard } from "@/components/executive/intelligence/business-summary-card";
import { ExecutiveDisclosure } from "@/components/executive/presentation";
import { exSpacing, exStack, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { BusinessIntelligenceResult } from "@/lib/business-intelligence";

type Props = {
  data: BusinessIntelligenceResult;
  confidence?: "baixa" | "media" | "alta";
  confidenceReason?: string | null;
  /** Quando true, renderiza só o conteúdo (sem Section) — ex.: disclosure. */
  embedded?: boolean;
};

function BusinessInsightsBody({
  data,
  confidence,
  confidenceReason,
}: Omit<Props, "embedded">) {
  return (
    <div className={exStack[20]}>
      <BusinessSummaryCard
        summary={data.summary}
        confidence={confidence}
        confidenceReason={confidenceReason}
      />

      <BusinessCauseCard cause={data.cause} />

      {data.risks.length > 0 ? (
        <div>
          <h3 className={cn("mb-3", exTypography.label)}>Riscos</h3>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
              exSpacing[12],
            )}
          >
            {data.risks.map((risk) => (
              <BusinessRiskCard key={risk.id} risk={risk} />
            ))}
          </div>
        </div>
      ) : null}

      {data.opportunities.length > 0 ? (
        <div>
          <h3 className={cn("mb-3", exTypography.label)}>Oportunidades</h3>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
              exSpacing[12],
            )}
          >
            {data.opportunities.map((opp) => (
              <BusinessOpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </div>
      ) : null}

      {data.priorities.length > 0 ? (
        <div>
          <h3 className={cn("mb-3", exTypography.label)}>Prioridades</h3>
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
              exSpacing[12],
            )}
          >
            {data.priorities.map((p) => (
              <BusinessPriorityCard key={p.id} priority={p} />
            ))}
          </div>
        </div>
      ) : null}

      {data.comparator.note || data.comparator.available ? (
        <ExecutiveDisclosure summary="Comparadores e metodologia">
          <p className={exTypography.caption}>
            {data.comparator.label}
            {data.comparator.available ? " · disponível" : " · indisponível"}
          </p>
          {data.comparator.note ? (
            <p className={exTypography.caption}>{data.comparator.note}</p>
          ) : null}
        </ExecutiveDisclosure>
      ) : null}
    </div>
  );
}

/**
 * Painel Business Intelligence — narrativa e prioridade visual (Sprint 13.9).
 * Sprint 13.14: `embedded` para uso sob Insights compostos.
 */
export function BusinessInsightsPanel({
  data,
  confidence,
  confidenceReason,
  embedded = false,
}: Props) {
  const body = (
    <BusinessInsightsBody
      data={data}
      confidence={confidence}
      confidenceReason={confidenceReason}
    />
  );

  if (embedded) return body;

  return (
    <ExecutiveSection
      title="Inteligência de negócio"
      description="O que aconteceu, por quê, onde está o impacto e o que priorizar."
      panel
    >
      {body}
    </ExecutiveSection>
  );
}
