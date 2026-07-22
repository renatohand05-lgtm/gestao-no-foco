"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

import { DsIcon } from "@/components/ui/ds-icon";
import type {
  DecisionSeverity,
  ExecutiveDecisionItem,
  ExecutiveDecisionResult,
} from "@/lib/dashboard/executive-decision-types";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  exAnimations,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveDecisionResult;
  tenantSlug: string;
  maxItems?: number;
  compactMaxItems?: number;
  loading?: boolean;
};

const SEVERITY_UI: Record<
  DecisionSeverity,
  { label: string; icon: LucideIcon; bar: string; badge: string }
> = {
  critical: {
    label: "Crítico",
    icon: AlertTriangle,
    bar: "bg-rose-500",
    badge:
      "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  },
  warning: {
    label: "Atenção",
    icon: AlertTriangle,
    bar: "bg-orange-500",
    badge:
      "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
  },
  opportunity: {
    label: "Oportunidade",
    icon: Lightbulb,
    bar: "bg-emerald-500",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  info: {
    label: "Info",
    icon: Info,
    bar: "bg-sky-500",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  },
};

/** Rótulo visual do impacto — não altera o valor do payload. */
function impactLabel(item: ExecutiveDecisionItem): string {
  if (item.id === "projecao-mes-abaixo") return "Gap projetado";
  if (item.id === "meta-dia-abaixo") return "Falta para a meta";
  if (item.id === "meta-dia-atingida") return "Acima da meta";
  return "Impacto financeiro";
}

function formatImpactDisplay(item: ExecutiveDecisionItem): string {
  const value = item.impactValue ?? 0;
  const signed =
    item.id === "projecao-mes-abaixo" || item.id === "meta-dia-abaixo"
      ? -Math.abs(value)
      : value;
  const formatted = formatCurrency(Math.abs(signed));
  return signed < 0 ? `-${formatted}` : formatted;
}

function DecisionItemRow({ item }: { item: ExecutiveDecisionItem }) {
  const ui = SEVERITY_UI[item.severity];
  const hasImpact = item.impactValue != null && item.impactValue > 0;

  const content = (
    <div className="flex min-w-0 gap-3.5 px-3.5 py-3.5 sm:px-4 sm:py-4">
      <span
        className={cn("w-1 shrink-0 self-stretch rounded-full", ui.bar)}
        aria-hidden
      />
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
          ui.badge,
        )}
      >
        <DsIcon icon={ui.icon} size="md" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
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
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {impactLabel(item)}
            </p>
            <p className="mt-0.5 text-base font-semibold tracking-tight tabular-nums text-foreground sm:text-[17px]">
              {formatImpactDisplay(item)}
            </p>
          </div>
        ) : null}

        <p className={cn(exTypography.caption, "line-clamp-2 text-muted-foreground")}>
          {item.description}
        </p>

        {item.actionLabel ? (
          <span className="inline-flex items-center gap-0.5 pt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            {item.actionLabel}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className={cn(
            "block rounded-xl border border-border/50 bg-background/60 transition-colors hover:bg-muted/40",
            exAnimations.focusRing,
          )}
          aria-label={`${item.title}. ${item.actionLabel ?? "Abrir"}`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border/50 bg-background/60">
      {content}
    </li>
  );
}

function SeverityBreakdown({ data }: { data: ExecutiveDecisionResult }) {
  const { criticalCount, warningCount, opportunityCount, infoCount, totalCount } =
    data.summary;
  if (totalCount === 0) return null;

  const parts: { label: string; count: number }[] = [];
  if (criticalCount > 0) parts.push({ label: "Crítico", count: criticalCount });
  if (warningCount > 0) parts.push({ label: "Atenção", count: warningCount });
  if (opportunityCount > 0)
    parts.push({ label: "Oportunidade", count: opportunityCount });
  if (infoCount > 0) parts.push({ label: "Info", count: infoCount });

  return (
    <div className="border-b border-border/40 px-5 py-2.5 sm:px-6">
      <p className="text-xs font-medium text-foreground">
        {totalCount} alerta{totalCount === 1 ? "" : "s"} ativo
        {totalCount === 1 ? "" : "s"}
      </p>
      {parts.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {parts.map((p) => (
            <li key={p.label}>
              · {p.count} {p.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Centro de Decisão — compacto, priorizado (Gate 16.2 / 16.2.1 visual).
 */
export function ExecutiveDecisionCenter({
  data,
  tenantSlug,
  maxItems = 5,
  compactMaxItems = 3,
  loading = false,
}: Props) {
  const desktopItems = data.items.slice(0, maxItems);
  const hasMore = data.items.length > compactMaxItems;
  const empty = data.items.length === 0;

  return (
    <section
      className={cn(
        "border border-border/55 bg-card",
        exRadius[16],
        exShadow.card,
        exAnimations.fade,
      )}
      aria-labelledby="centro-decisao-titulo"
      data-dashboard-block="decision-center"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h2
            id="centro-decisao-titulo"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Centro de Decisão
          </h2>
          <p className={cn(exTypography.caption, "mt-0.5")}>
            {loading ? "Carregando prioridades…" : data.summary.headline}
          </p>
        </div>
        {hasMore ? (
          <Link
            href={`/${tenantSlug}/centro-operacoes`}
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground hover:bg-muted/50",
              exAnimations.focusRing,
            )}
            aria-label="Abrir Centro de Operações"
          >
            Centro de Operações →
          </Link>
        ) : null}
      </div>

      {empty ? (
        <div className="flex items-start gap-3.5 px-5 py-6 sm:px-6">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <DsIcon icon={CheckCircle2} size="md" />
          </span>
          <div>
            <p className={exTypography.cardTitle}>Operação sob controle</p>
            <p className={cn(exTypography.caption, "mt-0.5")}>
              Nenhum ponto crítico identificado neste momento.
            </p>
          </div>
        </div>
      ) : (
        <>
          {!loading ? <SeverityBreakdown data={data} /> : null}
          <ul className="hidden space-y-2.5 p-3.5 sm:block sm:p-4">
            {desktopItems.map((item) => (
              <DecisionItemRow key={item.id} item={item} />
            ))}
          </ul>
          <ul className="space-y-2.5 p-3.5 sm:hidden">
            {data.items.slice(0, compactMaxItems).map((item) => (
              <DecisionItemRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function ExecutiveDecisionCenterSkeleton() {
  return (
    <div
      className={cn(
        "h-44 border border-border/50 bg-card",
        exRadius[16],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando centro de decisão"
    />
  );
}
