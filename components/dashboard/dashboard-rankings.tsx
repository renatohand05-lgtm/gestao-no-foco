import Link from "next/link";
import { Medal } from "lucide-react";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { buildRankingItemHref } from "@/lib/dashboard/drill-down";
import { formatCurrency } from "@/lib/dashboard/format";
import {
  dsIconBox,
  dsIconSize,
  dsInteractive,
  dsMotion,
  dsRadius,
  dsSpace,
  dsStatus,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  DashboardFilters,
  DashboardRankingItem,
} from "@/types/dashboard-executive";

type DashboardRankingListProps = {
  tenantSlug: string;
  filters: DashboardFilters;
  rankingType: "clientes" | "produtos" | "servicos" | "categorias";
  title: string;
  description: string;
  items: DashboardRankingItem[];
  emptyDescription?: string;
};

function medalTone(index: number) {
  if (index === 0) return "bg-amber-400/20 text-amber-700 dark:text-amber-300";
  if (index === 1) return "bg-slate-300/30 text-slate-700 dark:text-slate-300";
  if (index === 2) return "bg-orange-400/20 text-orange-700 dark:text-orange-300";
  return dsStatus.neutral.soft;
}

export function DashboardRankingList({
  tenantSlug,
  filters,
  rankingType,
  title,
  description,
  items,
  emptyDescription = "Nenhum registro ranqueado no período.",
}: DashboardRankingListProps) {
  if (items.length === 0) {
    return (
      <DashboardSection title={title} description={description}>
        <DashboardEmptyState
          className="border-0 bg-transparent py-8"
          title="Sem ranking"
          description={emptyDescription}
          actionHref={`/${tenantSlug}/vendas`}
          actionLabel="Registrar vendas"
        />
      </DashboardSection>
    );
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <DashboardSection
      title={title}
      description={description}
      className={dsMotion.fadeUp}
    >
      <ol className={dsSpace.stackLg}>
        {items.map((item, index) => {
          const width = Math.max((item.value / max) * 100, 6);
          const href = buildRankingItemHref(
            tenantSlug,
            rankingType,
            item.id,
            filters,
          );

          const content = (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={cn(dsIconBox.medal, medalTone(index))}>
                    {index < 3 ? (
                      <Medal className={dsIconSize.sm} aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                    {item.label.slice(0, 1)}
                  </span>
                  <span className="min-w-0 truncate font-medium">{item.label}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                <div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400",
                    dsMotion.progress,
                  )}
                  style={{ width: `${width}%` }}
                />
              </div>
            </>
          );

          return (
            <li key={item.id}>
              {href ? (
                <Link
                  href={href}
                  className={cn(
                    "group block p-2.5",
                    dsRadius.md,
                    dsSpace.stackSm,
                    dsInteractive.focusCard,
                    dsMotion.hover,
                    "hover:bg-muted/40",
                  )}
                  aria-label={`Abrir ${item.label}`}
                >
                  {content}
                </Link>
              ) : (
                <div className={cn(dsSpace.stackSm, "p-2.5")}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </DashboardSection>
  );
}
