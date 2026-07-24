"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ListTodo } from "lucide-react";

import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveEmptyState,
  ExecutiveSection,
  ExecutiveSkeleton,
  type ExecutiveBadgeTone,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import type {
  ActionPlanPriority,
  ActionPlanRecommendation,
  ExecutiveActionPlanData,
} from "@/lib/dashboard/executive-action-plan-types";
import { formatCurrency } from "@/lib/dashboard/format";
import { EXECUTIVE_STATUS_LABEL } from "@/lib/dashboard/executive-ui";
import {
  gofFocusRing,
  gofMotion,
  gofRadius,
  gofTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  data: ExecutiveActionPlanData;
};

const PRIORITY_UI: Record<
  ActionPlanPriority,
  { label: string; tone: ExecutiveBadgeTone; bar: string }
> = {
  alta: {
    label: EXECUTIVE_STATUS_LABEL.critico,
    tone: "danger",
    bar: "bg-danger",
  },
  media: {
    label: EXECUTIVE_STATUS_LABEL.atencao,
    tone: "warning",
    bar: "bg-warning",
  },
};

function ActionPlanRow({ item }: { item: ActionPlanRecommendation }) {
  const ui = PRIORITY_UI[item.priority];
  const hasImpact = item.impactValue != null && item.impactValue > 0;

  const content = (
    <div className="flex min-w-0 gap-3.5">
      <span
        className={cn("w-1 shrink-0 self-stretch rounded-full", ui.bar)}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn(gofTypography.body, "min-w-0 font-semibold")}>
            {item.title}
          </p>
          <ExecutiveBadge tone={ui.tone} variant="soft">
            {ui.label}
          </ExecutiveBadge>
        </div>

        {hasImpact ? (
          <div>
            <p className={cn(gofTypography.caption, "uppercase tracking-wide")}>
              Impacto estimado
            </p>
            <p className="text-base font-semibold tracking-tight tabular-nums text-foreground">
              {formatCurrency(item.impactValue ?? 0)}
            </p>
          </div>
        ) : null}

        <p className={cn(gofTypography.caption, "line-clamp-2")}>
          {item.description}
        </p>

        <span className="inline-flex items-center gap-0.5 pt-0.5 text-xs font-medium text-muted-foreground">
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
          "block transition-colors hover:bg-muted/40",
          gofRadius.lg,
          gofFocusRing,
        )}
        aria-label={`${item.title}. ${item.actionLabel}`}
      >
        <ExecutiveCard padding={16} interactive className="border-border/50">
          {content}
        </ExecutiveCard>
      </Link>
    </li>
  );
}

/**
 * Plano de Ação do Dia — Design System oficial (Gate 19.1).
 */
export function ExecutiveActionPlanSection({ data }: Props) {
  const items = data.recommendations;
  const empty = items.length === 0;
  const alta = items.filter((i) => i.priority === "alta").length;

  return (
    <div data-dashboard-block="action-plan" className={gofMotion.fade}>
      <ExecutiveSection
        title="Plano de Ação do Dia"
        description={
          empty
            ? "Nenhuma ação prioritária neste momento."
            : `${items.length} ação${items.length === 1 ? "" : "ões"} · ${alta} ${EXECUTIVE_STATUS_LABEL.critico.toLowerCase()}${alta === 1 ? "" : "s"}`
        }
        panel
        actions={
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center bg-muted/70 text-muted-foreground",
              gofRadius.md,
            )}
          >
            <DsIcon icon={ListTodo} size="md" />
          </span>
        }
      >
        {empty ? (
          <ExecutiveEmptyState
            title="Dia sob controle"
            description="Não há recomendações pendentes com base nos dados disponíveis."
            icon={CheckCircle2}
            className="py-6"
          />
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <ActionPlanRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </ExecutiveSection>
    </div>
  );
}

export function ExecutiveActionPlanSectionSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border/60 bg-card p-5"
      aria-busy="true"
      aria-label="Carregando plano de ação"
    >
      <ExecutiveSkeleton heightClassName="h-5" widthClassName="w-1/3" />
      <ExecutiveSkeleton heightClassName="h-32" widthClassName="w-full" />
    </div>
  );
}
