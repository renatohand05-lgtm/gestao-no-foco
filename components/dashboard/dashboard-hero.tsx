import type { ReactNode } from "react";
import { AlertTriangle, HeartPulse, TrendingUp } from "lucide-react";

import {
  dsGap,
  dsIconSize,
  dsLayout,
  dsMotion,
  dsPadding,
  dsRadius,
  dsShadow,
  dsSpace,
  dsType,
} from "@/lib/design-system";
import { formatVariationPct } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { DashboardKpiComparison, DashboardPeriodo } from "@/types/dashboard-executive";
import type { DashboardIntelligenceResult } from "@/types/intelligence";

type DashboardHeroProps = {
  greeting: string;
  tenantName: string;
  periodo: DashboardPeriodo;
  revenueTrend: DashboardKpiComparison;
  /** Quando omitido, mostra skeleton dos cards de saúde/alertas. */
  intelligence?: DashboardIntelligenceResult | null;
  /** Slot opcional no lugar dos cards de insight (Suspense aninhado). */
  insightsSlot?: ReactNode;
};

function healthLabelClass(
  label: DashboardIntelligenceResult["healthScore"]["label"],
) {
  switch (label) {
    case "Excelente":
      return "text-emerald-300";
    case "Saudável":
      return "text-sky-300";
    case "Atenção":
      return "text-amber-300";
    case "Crítico":
      return "text-orange-300";
    case "Emergência":
      return "text-rose-300";
  }
}

function displayHealthBand(
  label: DashboardIntelligenceResult["healthScore"]["label"],
) {
  return label === "Saudável" ? "Bom" : label;
}

export function DashboardHeroInsightsSkeleton() {
  return (
    <div className={cn("grid sm:grid-cols-2 lg:grid-cols-1", dsGap.md)}>
      <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
    </div>
  );
}

function HeroInsights({
  intelligence,
  revenueTrend,
}: {
  intelligence: DashboardIntelligenceResult;
  revenueTrend: DashboardKpiComparison;
}) {
  const health = intelligence.healthScore;
  const criticalAlerts = intelligence.alerts.filter(
    (alert) => alert.priority === "critical" || alert.priority === "high",
  ).length;

  return (
    <div className={cn("grid sm:grid-cols-2 lg:grid-cols-1", dsGap.md)}>
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm",
          dsMotion.scaleIn,
        )}
      >
        <div className="flex items-center gap-2 text-emerald-200/90">
          <HeartPulse className={dsIconSize.md} aria-hidden />
          <span className={dsType.badge}>Saúde da empresa</span>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
          {health.score}
          <span className="text-base font-normal text-slate-300">/100</span>
        </p>
        <p className={cn("mt-1 text-sm font-medium", healthLabelClass(health.label))}>
          {displayHealthBand(health.label)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className={cn(dsSpace.stackSm)}>
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <AlertTriangle
              className={cn(dsIconSize.sm, "text-amber-300")}
              aria-hidden
            />
            <span>
              {criticalAlerts > 0
                ? `${criticalAlerts} alerta${criticalAlerts > 1 ? "s" : ""} importante${criticalAlerts > 1 ? "s" : ""}`
                : "Nenhum alerta crítico"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <TrendingUp
              className={cn(dsIconSize.sm, "text-emerald-300")}
              aria-hidden
            />
            <span>
              Receita{" "}
              {revenueTrend.trend === "up"
                ? "crescendo"
                : revenueTrend.trend === "down"
                  ? "em queda"
                  : "estável"}{" "}
              {formatVariationPct(revenueTrend.variationPct)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {intelligence.priorities.length} prioridade
            {intelligence.priorities.length === 1 ? "" : "s"} na fila
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardHeroInsights({
  intelligence,
  revenueTrend,
}: {
  intelligence: DashboardIntelligenceResult;
  revenueTrend: DashboardKpiComparison;
}) {
  return (
    <HeroInsights intelligence={intelligence} revenueTrend={revenueTrend} />
  );
}

export function DashboardHero({
  greeting,
  tenantName,
  periodo,
  revenueTrend,
  intelligence = null,
  insightsSlot,
}: DashboardHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white",
        dsRadius.xl,
        dsPadding.sectionX,
        dsPadding.sectionY,
        dsShadow.md,
        dsMotion.fadeUp,
      )}
      aria-label="Hero do dashboard executivo"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.12),transparent_55%)]" />

      <div
        className={cn(
          "relative grid lg:grid-cols-[1.4fr_0.8fr] lg:items-end",
          dsGap.xl,
        )}
      >
        <div className={cn(dsLayout.narrow, dsSpace.stackMd)}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Dashboard executivo
          </p>
          <div className={dsSpace.stackXs}>
            <p className="text-sm text-slate-300/90 md:text-base">{greeting}</p>
            <h2 className="font-serif text-3xl tracking-tight md:text-4xl">
              {tenantName}
            </h2>
          </div>
          <p className="text-sm text-slate-200/85 md:text-base">
            Período: <span className="font-medium text-white">{periodo.label}</span>
          </p>
        </div>

        {insightsSlot !== undefined
          ? insightsSlot
          : intelligence
            ? (
              <HeroInsights
                intelligence={intelligence}
                revenueTrend={revenueTrend}
              />
            )
            : (
              <DashboardHeroInsightsSkeleton />
            )}
      </div>
    </section>
  );
}

export function DashboardHeroSkeleton() {
  return (
    <div
      className={cn(dsRadius.xl, "h-48 animate-pulse bg-muted/30")}
      aria-busy="true"
    />
  );
}
