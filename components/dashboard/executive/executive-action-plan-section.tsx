"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ListTodo } from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import type {
  ActionPlanPriority,
  ActionPlanRecommendation,
  ExecutiveActionPlanData,
} from "@/lib/dashboard/executive-action-plan-types";
import { formatCurrency } from "@/lib/dashboard/format";
import { EXECUTIVE_BLOCK, EXECUTIVE_STATUS_LABEL } from "@/lib/dashboard/executive-ui";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveActionPlanData;
};

const PRIORITY_UI: Record<
  ActionPlanPriority,
  { label: string; bar: string; badge: string }
> = {
  alta: {
    label: EXECUTIVE_STATUS_LABEL.critico,
    bar: "bg-rose-500",
    badge:
      "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  },
  media: {
    label: EXECUTIVE_STATUS_LABEL.atencao,
    bar: "bg-orange-500",
    badge:
      "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  },
};

function ActionPlanRow({ item }: { item: ActionPlanRecommendation }) {
  const ui = PRIORITY_UI[item.priority];
  const hasImpact = item.impactValue != null && item.impactValue > 0;

  const content = (
    <div className="flex min-w-0 gap-3.5 px-3.5 py-3.5 sm:px-4 sm:py-3.5">
      <span
        className={cn("w-1 shrink-0 self-stretch rounded-full", ui.bar)}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn(exTypography.cardTitle, "min-w-0 text-[13px] sm:text-sm")}>
            {item.title}
          </p>
          <span
            className={cn(
              "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
              ui.badge,
            )}
          >
            {ui.label}
          </span>
        </div>

        {hasImpact ? (
          <div>
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Impacto estimado
            </p>
            <p className="text-base font-semibold tracking-tight tabular-nums text-foreground">
              {formatCurrency(item.impactValue ?? 0)}
            </p>
          </div>
        ) : null}

        <p className={cn(exTypography.caption, "line-clamp-2 text-muted-foreground")}>
          {item.description}
        </p>

        <span className="inline-flex items-center gap-0.5 pt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          {item.actionLabel}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </div>
  );

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "block rounded-xl border border-border/50 bg-background/60 transition-colors hover:bg-muted/40",
          exAnimations.focusRing,
        )}
        aria-label={`${item.title}. ${item.actionLabel}`}
      >
        {content}
      </Link>
    </li>
  );
}

/**
 * Plano de Ação do Dia — recomendações priorizadas (Gate 17.1).
 */
export function ExecutiveActionPlanSection({ data }: Props) {
  const items = data.recommendations;
  const empty = items.length === 0;
  const alta = items.filter((i) => i.priority === "alta").length;

  return (
    <section
      className={cn(
        EXECUTIVE_BLOCK.section,
        exRadius[16],
        exShadow.card,
        exAnimations.fade,
      )}
      aria-labelledby="plano-acao-dia-titulo"
      data-dashboard-block="action-plan"
    >
      <div className={EXECUTIVE_BLOCK.header}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
              <DsIcon icon={ListTodo} size="md" />
            </span>
            <h2 id="plano-acao-dia-titulo" className={EXECUTIVE_BLOCK.title}>
              Plano de Ação do Dia
            </h2>
          </div>
          <p className={cn(exTypography.caption, "mt-1.5")}>
            {empty
              ? "Nenhuma ação prioritária neste momento."
              : `${items.length} ação${items.length === 1 ? "" : "ões"} · ${alta} ${EXECUTIVE_STATUS_LABEL.critico.toLowerCase()}${alta === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {empty ? (
        <div className="flex items-start gap-3.5 px-5 py-6 sm:px-6">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <DsIcon icon={CheckCircle2} size="md" />
          </span>
          <div>
            <p className={exTypography.cardTitle}>Dia sob controle</p>
            <p className={cn(exTypography.caption, "mt-0.5")}>
              Não há recomendações pendentes com base nos dados disponíveis.
            </p>
          </div>
        </div>
      ) : (
        <ul className="space-y-2.5 p-3.5 sm:p-4">
          {items.map((item) => (
            <ActionPlanRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ExecutiveActionPlanSectionSkeleton() {
  return (
    <div
      className={cn(
        "h-44 border border-border/50 bg-card",
        exRadius[16],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando plano de ação"
    />
  );
}
