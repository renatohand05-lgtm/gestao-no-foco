"use client";

import { CheckCircle2, ListChecks, Sparkles } from "lucide-react";

import {
  ExecutiveBadge,
  ExecutiveEmptyState,
  ExecutiveSection,
  ExecutiveSkeleton,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import type {
  ExecutiveSummaryData,
} from "@/lib/dashboard/executive-summary-types";
import {
  EXECUTIVE_STATUS_BADGE,
  EXECUTIVE_STATUS_BAR,
} from "@/lib/dashboard/executive-ui";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveSummaryData;
};

/**
 * Resumo Executivo — DS oficial (Gate 19.1).
 */
export function ExecutiveSummarySection({ data }: Props) {
  const badge =
    EXECUTIVE_STATUS_BADGE[data.status] ?? EXECUTIVE_STATUS_BADGE.indisponivel;
  const bar =
    EXECUTIVE_STATUS_BAR[data.status as keyof typeof EXECUTIVE_STATUS_BAR] ??
    "bg-muted";

  return (
    <div data-dashboard-block="executive-summary" className={gofMotion.fade}>
      <ExecutiveSection
        title="Resumo Executivo"
        description="Visão consolidada do negócio — status e leitura do dia."
        panel
        actions={
          <div className="flex flex-col items-end gap-1">
            <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold", badge)}>
              <span className={cn("size-1.5 rounded-full", bar)} aria-hidden />
              {data.statusLabel}
            </span>
            <p className={cn(gofTypography.caption, "max-w-[16rem] text-right")}>
              {data.statusReason}
            </p>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                <DsIcon icon={ListChecks} size="sm" />
              </span>
              <p className="text-xs font-semibold text-foreground">
                {data.prioritiesCount === 0
                  ? "Nenhuma prioridade executável no Plano de Ação"
                  : `${data.prioritiesCount} prioridade${data.prioritiesCount === 1 ? "" : "s"} no Plano de Ação`}
              </p>
            </div>

            {data.priorities.length === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-3">
                <DsIcon
                  icon={CheckCircle2}
                  size="sm"
                  className="mt-0.5 text-success"
                />
                <p className={gofTypography.caption}>
                  Sem sinais críticos ou de atenção no Centro de Decisão.
                </p>
              </div>
            ) : (
              <ul className="space-y-2" aria-label="Sinais relevantes">
                {data.priorities.map((p) => (
                  <li
                    key={p.id}
                    className="flex min-w-0 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {p.title}
                    </span>
                    <ExecutiveBadge tone="neutral" variant="outline">
                      {p.severityLabel}
                    </ExecutiveBadge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                <DsIcon icon={Sparkles} size="sm" />
              </span>
              <p className="text-xs font-semibold">Recomendações do sistema</p>
            </div>
            {data.recommendations.length === 0 ? (
              <ExecutiveEmptyState
                title="Sem recomendações"
                description="Nenhuma recomendação adicional no momento."
                className="py-6"
              />
            ) : (
              <ul className="space-y-2">
                {data.recommendations.map((text) => (
                  <li
                    key={text}
                    className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 text-xs leading-snug"
                  >
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ExecutiveSection>
    </div>
  );
}

export function ExecutiveSummarySectionSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border/60 bg-card p-5"
      aria-busy="true"
      aria-label="Carregando resumo executivo"
    >
      <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-1/3" />
      <ExecutiveSkeleton heightClassName="h-24" widthClassName="w-full" />
    </div>
  );
}
