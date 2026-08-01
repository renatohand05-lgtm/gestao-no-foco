"use client";

import dynamic from "next/dynamic";
import type { DashboardChartPoint } from "@/types/dashboard-executive";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";
import { GFSkeleton } from "@/components/gf/gf-skeleton";

const PremiumRevenueChart = dynamic(
  () =>
    import("@/components/dashboard/premium/premium-revenue-chart").then(
      (m) => m.PremiumRevenueChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="space-y-2"
        data-chart-lazy-fallback=""
        role="status"
        aria-label="Carregando gráfico"
      >
        <GFSkeleton className="h-48 w-full rounded-xl" />
      </div>
    ),
  },
);

type Props = {
  data: DashboardChartPoint[];
  periodoLabel: string;
  metaByDate?: Record<string, number> | null;
  origem?: string;
  confianca?: string;
  className?: string;
};

/**
 * Gráfico Gestão — lazy-load do SVG (Sprint 26.5 performance).
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
      data-chart-lazy="1"
      data-sprint="26.5"
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
