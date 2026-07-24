"use client";

import { CheckCircle2, ListChecks, Sparkles } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import type {
  ExecutiveSummaryData,
  ExecutiveSummaryStatus,
} from "@/lib/dashboard/executive-summary-types";
import { EXECUTIVE_BLOCK } from "@/lib/dashboard/executive-ui";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveSummaryData;
};

const STATUS_UI: Record<
  ExecutiveSummaryStatus,
  { badge: string; bar: string }
> = {
  excelente: {
    badge:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    bar: "bg-emerald-500",
  },
  saudavel: {
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    bar: "bg-sky-500",
  },
  atencao: {
    badge:
      "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
    bar: "bg-orange-500",
  },
  critico: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
    bar: "bg-rose-500",
  },
};

/**
 * Resumo Executivo — consolidação (sem CTAs do Plano de Ação).
 */
export function ExecutiveSummarySection({ data }: Props) {
  const ui = STATUS_UI[data.status];

  return (
    <section
      className={cn(
        EXECUTIVE_BLOCK.section,
        exRadius[16],
        exShadow.card,
        exAnimations.fade,
      )}
      aria-labelledby="resumo-executivo-titulo"
      data-dashboard-block="executive-summary"
    >
      <div className={EXECUTIVE_BLOCK.header}>
        <div className="min-w-0">
          <h2 id="resumo-executivo-titulo" className={EXECUTIVE_BLOCK.title}>
            Resumo Executivo
          </h2>
          <p className={cn(exTypography.caption, "mt-0.5")}>
            Visão consolidada do negócio — status e leitura do dia.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(EXECUTIVE_BLOCK.badge, ui.badge)}>
            <span
              className={cn("size-1.5 rounded-full", ui.bar)}
              aria-hidden
            />
            {data.statusLabel}
          </span>
          <p className={cn(exTypography.caption, "max-w-[16rem] text-right")}>
            {data.statusReason}
          </p>
        </div>
      </div>

      <div
        className={cn(
          EXECUTIVE_BLOCK.body,
          "grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]",
        )}
      >
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
            <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-3">
              <DsIcon
                icon={CheckCircle2}
                size="sm"
                className="mt-0.5 text-emerald-600"
              />
              <p className={cn(exTypography.caption)}>
                Sem sinais críticos ou de atenção no Centro de Decisão.
              </p>
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Sinais relevantes">
              {data.priorities.map((p) => (
                <li
                  key={p.id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {p.title}
                  </span>
                  <span className="shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {p.severityLabel}
                  </span>
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
            <p className="text-xs font-semibold text-foreground">
              Recomendações do sistema
            </p>
          </div>
          {data.recommendations.length === 0 ? (
            <p className={cn(exTypography.caption)}>
              Sem recomendações adicionais.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.recommendations.map((text) => (
                <li
                  key={text}
                  className="rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 text-xs leading-snug text-foreground/90"
                >
                  {text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function ExecutiveSummarySectionSkeleton() {
  return (
    <div
      className={cn(
        "h-36 border border-border/50 bg-card",
        exRadius[16],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando resumo executivo"
    />
  );
}
