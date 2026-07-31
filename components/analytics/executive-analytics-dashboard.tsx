"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download, Sparkles } from "lucide-react";

import { ExecutiveEmptyState, MetricCard } from "@/components/executive";
import { AnalyticsNavigation } from "@/components/analytics/analytics-navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  exportAnalyticsCsv,
  getAnalyticsDrillDown,
  getExecutiveAnalyticsDashboard,
} from "@/lib/analytics/analytics-actions";
import type { buildExecutiveAnalyticsBundle } from "@/lib/analytics/analytics-orchestrator";
import type { AnalyticsPeriodPreset } from "@/lib/analytics";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Bundle = ReturnType<typeof buildExecutiveAnalyticsBundle>;

const PERIODS: Array<{ id: AnalyticsPeriodPreset; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "week", label: "Semana" },
  { id: "last_7", label: "7d" },
  { id: "last_30", label: "30d" },
  { id: "last_90", label: "90d" },
  { id: "last_365", label: "365d" },
  { id: "month", label: "Mês" },
  { id: "quarter", label: "Trim." },
  { id: "semester", label: "Sem." },
  { id: "year", label: "Ano" },
];

function toneFromComparison(
  definitionId: string,
  comparisons: Bundle["comparisons"],
): "success" | "danger" | "warning" | "neutral" | "info" {
  const c = comparisons.find((x) => x.definitionId === definitionId);
  if (!c) return "info";
  if (c.tone === "positive") return "success";
  if (c.tone === "negative") return "danger";
  if (c.tone === "warning") return "warning";
  return "neutral";
}

type Props = {
  tenantSlug: string;
  initialBundle: Bundle;
  title?: string;
  description?: string;
};

export function ExecutiveAnalyticsDashboard({
  tenantSlug,
  initialBundle,
  title = "Analytics Enterprise",
  description = "Indicadores executivos a partir das fontes canônicas — sem dados fictícios.",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPeriod = (searchParams.get("period") as AnalyticsPeriodPreset) || "last_30";

  const [bundle, setBundle] = useState(initialBundle);
  const [period, setPeriod] = useState<AnalyticsPeriodPreset>(
    [
      "today",
      "yesterday",
      "week",
      "month",
      "quarter",
      "semester",
      "year",
      "last_7",
      "last_30",
      "last_90",
      "last_365",
    ].includes(initialPeriod)
      ? initialPeriod
      : "last_30",
  );
  const [drill, setDrill] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrill(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const availableKpis = useMemo(
    () =>
      (bundle.kpis as Bundle["metrics"]).filter(
        (k) => k && k.availability === "available",
      ),
    [bundle.kpis],
  );

  const sourceEntries = useMemo(
    () => Object.entries(bundle.sourceHealth ?? {}),
    [bundle.sourceHealth],
  );

  function reload(next: AnalyticsPeriodPreset) {
    setPeriod(next);
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", next);
    router.replace(`${pathname}?${params.toString()}`);
    startTransition(async () => {
      const res = await getExecutiveAnalyticsDashboard(tenantSlug, {
        periodPreset: next,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setBundle(res.bundle);
    });
  }

  function openDrill(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await getAnalyticsDrillDown(tenantSlug, id, {
        periodPreset: period,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDrill(JSON.stringify(res.drillDown, null, 2));
    });
  }

  function exportCsv() {
    setError(null);
    startTransition(async () => {
      const res = await exportAnalyticsCsv(tenantSlug, { periodPreset: period });
      if (!res.success) {
        setError(res.error);
        return;
      }
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (pending && !bundle.metrics.length) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div
      className="space-y-4"
      data-analytics-legible=""
      data-sprint="26.2.1"
    >
      <div className="space-y-1">
        <h1 className={cn(gofTypography.title, "text-foreground")}>{title}</h1>
        <p className={cn(gofTypography.subtitle, "text-muted-foreground")}>
          {description}
        </p>
      </div>

      <AnalyticsNavigation tenantSlug={tenantSlug} />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={period === p.id ? "default" : "outline"}
            disabled={pending}
            onClick={() => reload(p.id)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={exportCsv}
        >
          <Download className="mr-1 size-3.5" />
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled
          title="Excel em preparação — ANALYTICS_EXPORT_EXCEL_ENABLED=0"
        >
          Excel (Em preparação)
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled
          title="PDF em preparação — ANALYTICS_EXPORT_PDF_ENABLED=0"
        >
          PDF (Em preparação)
        </Button>
        <Badge variant="outline">{bundle.provider.label}</Badge>
        <span className={cn(gofTypography.caption, "text-muted-foreground")}>
          Atualizado: {bundle.updatedAt ?? bundle.context.asOf}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {sourceEntries.length > 0 ? (
        <details
          className="rounded-[var(--gf-radius)] border border-border bg-card shadow-[var(--elevation-card)] open:shadow-[var(--elevation-raised)]"
          data-analytics-sources-panel=""
          data-sprint="26.2.1"
        >
          <summary className="cursor-pointer list-none px-4 py-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className={cn(gofTypography.caption, "text-muted-foreground")}>
                  Cobertura de dados
                </p>
                <p className={cn(gofTypography.title, "text-base text-foreground")}>
                  {
                    sourceEntries.filter(([, h]) => h.status === "ok")
                      .length
                  }{" "}
                  de {sourceEntries.length} fontes ativas
                </p>
              </div>
              <Badge variant="outline">Ver fontes</Badge>
            </div>
            <p className={cn(gofTypography.caption, "mt-1 text-muted-foreground")}>
              Confiança consolidada no provider · detalhes técnicos sob demanda
            </p>
          </summary>
          <div className="border-t border-border px-4 py-3">
            <p className={cn(gofTypography.caption, "mb-2 text-muted-foreground")}>
              Falha de uma fatia não derruba o dashboard. Persistência de período via
              URL (?period=).
            </p>
            <div className="flex flex-wrap gap-2">
              {sourceEntries.map(([key, h]) => (
                <Badge key={key} variant="outline" title={h.message}>
                  {key}: {h.status}
                </Badge>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      {bundle.empty ? (
        <ExecutiveEmptyState
          title="Dados indisponíveis"
          description="Nenhuma fonte canônica retornou métricas. Configure DRE, vendas, caixa ou tributos — nada é estimado."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {availableKpis.slice(0, 12).map((k) => (
            <button
              key={k.definitionId}
              type="button"
              className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => openDrill(k.definitionId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openDrill(k.definitionId);
                }
              }}
              aria-label={`Drill-down ${k.name}`}
            >
              <MetricCard
                label={k.name}
                value={k.formatted}
                hint={
                  k.confidence === "high"
                    ? "Confiança alta"
                    : k.confidence === "medium"
                      ? "Confiança média"
                      : k.confidence === "low"
                        ? "Confiança baixa"
                        : `Confiança ${k.confidence}`
                }
                tone={toneFromComparison(k.definitionId, bundle.comparisons)}
              />
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <AlertTriangle className="size-4" />
              Alertas ({bundle.alerts.length})
            </CardTitle>
            <CardDescription>Deduplicados por contexto e período.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.alerts.slice(0, 8).map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{a.severity}</Badge>
                  <span className="font-medium">{a.title}</span>
                </div>
                <p className="mt-1 text-[var(--text-secondary)]">{a.description}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{a.recommendation}</p>
              </div>
            ))}
            {!bundle.alerts.length ? (
              <p className="text-sm text-[var(--text-secondary)]">Nenhum alerta no período.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <Sparkles className="size-4" />
              Insights
            </CardTitle>
            <CardDescription>{bundle.provider.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bundle.insights.slice(0, 6).map((i) => (
              <div key={i.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{i.title}</p>
                <p className="mt-1 text-[var(--text-secondary)]">{i.summary}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Confiança {i.confidence} · {i.limitations[0]}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={gofTypography.title}>Metas</CardTitle>
          <CardDescription>
            Integração com metas_vendas — sem alterar o módulo de metas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {bundle.targets.map((t) => (
            <div key={t.definitionId} className="rounded-md border p-3">
              {t.available ? (
                <p>
                  {t.definitionId}: meta {t.target} · realizado {t.realized} ·
                  atingimento {t.attainment ?? "n/d"} · {t.probabilityLabel ?? ""}
                </p>
              ) : (
                <p className="text-[var(--text-secondary)]">
                  {t.definitionId}: {t.unavailableReason}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={gofTypography.title}>Exportação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {bundle.exports.map((e) => (
            <Badge key={e.format} variant="outline">
              {e.format}: {e.status === "preparing" ? "Em preparação" : e.status}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className={gofTypography.title}>Catálogo (amostra)</CardTitle>
          <CardDescription>
            Indisponíveis explícitos — sem estimativa silenciosa.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-64 space-y-1 overflow-auto text-xs">
          {bundle.metrics
            .filter((m) => m.availability === "unavailable")
            .slice(0, 20)
            .map((m) => (
              <div key={m.definitionId} className="flex justify-between gap-2">
                <span>{m.name}</span>
                <span className="text-[var(--text-secondary)]">
                  {m.unavailableReason}
                </span>
              </div>
            ))}
        </CardContent>
      </Card>

      {drill ? (
        <Card role="dialog" aria-modal="true" aria-label="Drill-down">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className={gofTypography.title}>Drill-down</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setDrill(null)}>
              Fechar (Esc)
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
              {drill}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-[var(--text-secondary)]">
        Layout widgets: {bundle.layout.widgets.filter((w) => w.visible).length}{" "}
        visíveis · flags analytics=
        {String(bundle.flags.analytics)}
      </p>
      <p className="sr-only">
        Navegação por teclado disponível nos filtros e cards de KPI.
      </p>
    </div>
  );
}
