"use client";

import type { TreasuryKpi, TreasurySummary } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatKpi(kpi: TreasuryKpi) {
  if (kpi.format === "number") return String(Math.round(kpi.value));
  if (kpi.format === "percent") return `${kpi.value.toFixed(1)}%`;
  return money(kpi.value);
}

function toneLabel(tone: TreasuryKpi["tone"]) {
  if (tone === "positive") return "Positivo";
  if (tone === "critical") return "Atenção";
  return "Neutro";
}

function toneBadge(tone: TreasuryKpi["tone"]) {
  if (tone === "positive") return "success" as const;
  if (tone === "critical") return "warning" as const;
  return "outline" as const;
}

function toneText(tone: TreasuryKpi["tone"]) {
  if (tone === "positive") return "text-emerald-700 dark:text-emerald-400";
  if (tone === "critical") return "text-amber-800 dark:text-amber-300";
  return "text-muted-foreground";
}

function hierarchy(key: string): "primary" | "secondary" | "compact" {
  if (key === "consolidated" || key === "net") return "primary";
  if (key === "accounts") return "compact";
  return "secondary";
}

type Props = {
  summary: TreasurySummary;
  className?: string;
};

function KpiCard({
  kpi,
  level,
}: {
  kpi: TreasuryKpi;
  level: "primary" | "secondary" | "compact";
}) {
  const delta =
    kpi.deltaPct == null
      ? "Sem base no período anterior"
      : `${kpi.deltaPct > 0 ? "+" : ""}${kpi.deltaPct}% vs período anterior`;

  return (
    <Card
      data-kpi-level={level}
      data-kpi-key={kpi.key}
      size={level === "compact" ? "sm" : "default"}
      className={cn(
        "h-full border-border/40 bg-card shadow-sm ring-1 ring-border/10",
        level === "primary" && "sm:col-span-1 lg:col-span-1",
      )}
    >
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.06em]">
            {kpi.label}
          </CardDescription>
          <Badge variant={toneBadge(kpi.tone)} className="shrink-0">
            {toneLabel(kpi.tone)}
          </Badge>
        </div>
        <CardTitle
          className={cn(
            "mt-1 tabular-nums tracking-tight text-foreground",
            level === "primary" && "text-3xl font-semibold",
            level === "secondary" && "text-2xl font-semibold",
            level === "compact" && "text-xl font-semibold",
          )}
        >
          {formatKpi(kpi)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-2">
        <p className={cn("text-xs tabular-nums", toneText(kpi.tone))}>{delta}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {kpi.legend}
        </p>
      </CardContent>
    </Card>
  );
}

export function TreasuryKpiGrid({ summary, className }: Props) {
  const primary = summary.kpis.filter((k) => hierarchy(k.key) === "primary");
  const secondary = summary.kpis.filter(
    (k) => hierarchy(k.key) === "secondary",
  );
  const compact = summary.kpis.filter((k) => hierarchy(k.key) === "compact");

  return (
    <section data-treasury-kpi-grid className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        {primary.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} level="primary" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {secondary.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} level="secondary" />
        ))}
        {compact.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} level="compact" />
        ))}
      </div>
    </section>
  );
}
