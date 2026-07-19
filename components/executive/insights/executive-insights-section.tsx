import { ExecutiveSection } from "@/components/executive";
import { ExecutiveInsightCard } from "@/components/executive/insights/executive-insight-card";
import { ExecutiveInsightsEmptyState } from "@/components/executive/insights/executive-insights-empty-state";
import { ExecutiveConfidence } from "@/components/executive/presentation/executive-confidence";
import { ExecutiveDisclosure } from "@/components/executive/presentation/executive-disclosure";
import {
  exSpacing,
  exStack,
  exTypography,
} from "@/lib/design-system";
import type { ExecutiveInsightsPack } from "@/lib/executive-insights";
import { cn } from "@/lib/utils";

type Props = {
  pack: ExecutiveInsightsPack;
  /** Detalhamento complementar (ex.: painel BI original) */
  details?: React.ReactNode;
};

function Group({
  title,
  items,
}: {
  title: string;
  items: ExecutiveInsightsPack["risks"];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={cn("mb-3", exTypography.label)}>{title}</h3>
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          exSpacing[12],
        )}
      >
        {items.map((insight) => (
          <ExecutiveInsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

/**
 * Seção de insights compostos — Design Freeze: não altera Hero/KPIs.
 */
export function ExecutiveInsightsSection({ pack, details }: Props) {
  const hasContent =
    pack.primary ||
    pack.risks.length > 0 ||
    pack.opportunities.length > 0 ||
    pack.positives.length > 0 ||
    pack.informational.length > 0;

  if (!hasContent) {
    return <ExecutiveInsightsEmptyState />;
  }

  return (
    <ExecutiveSection
      title="Insights executivos"
      description="O que está acontecendo, por quê importa e o que fazer primeiro — sem IA externa."
      panel
    >
      <div className={exStack[20]}>
        <div className="flex flex-wrap items-center gap-2">
          <ExecutiveConfidence
            level={pack.confidence}
            reason={pack.confidenceReason}
          />
          {pack.periodLabel ? (
            <p className={exTypography.caption}>Período: {pack.periodLabel}</p>
          ) : null}
        </div>

        <div
          className="rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
          aria-live="polite"
        >
          <p className={exTypography.label}>Resumo executivo</p>
          <p className={cn("mt-2", exTypography.body)}>
            {pack.summary.narrative}
          </p>
        </div>

        {pack.primary ? (
          <div>
            <h3 className={cn("mb-3", exTypography.label)}>
              Prioridade principal
            </h3>
            <ExecutiveInsightCard insight={pack.primary} featured />
          </div>
        ) : null}

        <Group title="Riscos" items={pack.risks} />
        <Group title="Oportunidades" items={pack.opportunities} />
        <Group title="Sinais positivos" items={pack.positives} />
        <Group title="Informações" items={pack.informational} />

        {pack.more.length > 0 ? (
          <ExecutiveDisclosure
            summary={`Mais insights (${pack.more.length})`}
          >
            <div className={cn("grid gap-3 sm:grid-cols-2", exSpacing[12])}>
              {pack.more.map((insight) => (
                <ExecutiveInsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </ExecutiveDisclosure>
        ) : null}

        {details ? (
          <ExecutiveDisclosure summary="Detalhamento das fontes (BI / EI)">
            {details}
          </ExecutiveDisclosure>
        ) : null}
      </div>
    </ExecutiveSection>
  );
}
