"use client";

import { PremiumRevenueChart } from "@/components/dashboard/premium/premium-revenue-chart";
import type { DashboardChartPoint } from "@/types/dashboard-executive";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Props = {
  data: DashboardChartPoint[];
  periodoLabel: string;
  metaByDate?: Record<string, number> | null;
  /** Origem conhecida — nunca inventar métrica. */
  origem?: string;
  confianca?: string;
  className?: string;
};

/**
 * Gráfico Gestão — camada visual sobre série real.
 * Sprint 26.2.1: sem badges técnicos na UI.
 */
export function GFRevenueChart({
  data,
  periodoLabel,
  metaByDate = null,
  origem = "Dashboard · vendas",
  confianca = "Alta",
  className,
}: Props) {
  return (
    <div
      className={cn("gf-revenue-chart space-y-2", className)}
      data-gf-revenue-chart=""
      data-chart-authorial=""
      data-sprint="26.2.1"
      data-chart-origem={origem}
      data-chart-confianca={confianca}
    >
      <p className={cn(gfType.caption, "text-[var(--text-secondary)]")}>
        {origem} · confiança {confianca}
      </p>
      <PremiumRevenueChart
        data={data}
        periodoLabel={periodoLabel}
        metaByDate={metaByDate}
      />
    </div>
  );
}
