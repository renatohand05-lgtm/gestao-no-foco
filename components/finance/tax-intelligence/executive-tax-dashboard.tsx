"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Building2,
  Landmark,
  LineChart,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";

import { ExecutiveEmptyState, MetricCard } from "@/components/executive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getTaxDrillDown,
  runTaxSimulation,
} from "@/lib/finance/tax-intelligence/tax-intelligence-actions";
import type {
  ExecutiveTaxDashboard,
  TaxAiRecommendation,
  TaxAlert,
  TaxCashflowProjection,
  TaxEnterpriseReport,
  TaxSimulationComparison,
  TaxSupplierRankItem,
} from "@/lib/finance/tax-intelligence";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  tenantSlug: string;
  dashboard: ExecutiveTaxDashboard;
  alerts: TaxAlert[];
  cashflow: TaxCashflowProjection;
  ai: TaxAiRecommendation[];
  supplierRanking: TaxSupplierRankItem[];
  report: TaxEnterpriseReport;
  integrations: { connectors: Array<{ id: string; name: string; status: string }> };
  snapshotEmpty?: boolean;
};

export function ExecutiveTaxDashboardClient({
  tenantSlug,
  dashboard,
  alerts,
  cashflow,
  ai,
  supplierRanking,
  report,
  integrations,
  snapshotEmpty,
}: Props) {
  const [drillJson, setDrillJson] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<TaxSimulationComparison | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const kpis = useMemo(
    () => [
      {
        key: "load",
        label: "Carga consolidada",
        value: money(dashboard.consolidatedLoad),
        tone: "info" as const,
        icon: Landmark,
      },
      {
        key: "projected",
        label: "Projetado",
        value: money(dashboard.projectedLoad),
        tone: "neutral" as const,
        icon: LineChart,
      },
      {
        key: "delta",
        label: "Realizado vs projetado",
        value: money(dashboard.realizedVsProjectedDelta),
        tone:
          dashboard.realizedVsProjectedDelta > 0
            ? ("danger" as const)
            : ("success" as const),
        icon: Scale,
      },
      {
        key: "reform",
        label: "Delta Reforma",
        value: money(dashboard.reformImpact.projectedDelta),
        tone: "warning" as const,
        icon: Sparkles,
      },
    ],
    [dashboard],
  );

  function runDrill(dimension: "company" | "branch" | "cost_center" | "period") {
    setError(null);
    startTransition(async () => {
      const res = await getTaxDrillDown(tenantSlug, { dimension });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDrillJson(JSON.stringify(res.drillDown, null, 2));
    });
  }

  function runGrowthSim() {
    setError(null);
    startTransition(async () => {
      const res = await runTaxSimulation(tenantSlug, {
        kind: "revenue_growth",
        label: "Crescimento +10% receita",
        factors: { revenue_growth: 0.1 },
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSimulation(res.result);
    });
  }

  if (snapshotEmpty || dashboard.emptyReason) {
    return (
      <div className="space-y-4">
        <ExecutiveEmptyState
          title="Inteligência Tributária pronta para configurar"
          description={
            dashboard.emptyReason ??
            "Cadastre tax_rule_versions, entidades e bases. Nenhuma alíquota é assumida pelo sistema."
          }
        />
        <Card>
          <CardHeader>
            <CardTitle className={gofTypography.title}>
              Arquitetura de integrações
            </CardTitle>
            <CardDescription>
              Contratos preparados — sem integrações simuladas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {integrations.connectors.map((c) => (
              <Badge key={c.id} variant="outline">
                {c.name}: {c.status}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <MetricCard
            key={k.key}
            label={k.label}
            value={k.value}
            tone={k.tone}
            icon={k.icon}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => runDrill("period")}
        >
          Drill período
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => runDrill("company")}
        >
          Drill empresa
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => runDrill("branch")}
        >
          Drill filial
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => runDrill("cost_center")}
        >
          Drill centro
        </Button>
        <Button size="sm" disabled={pending} onClick={runGrowthSim}>
          Simular +10% receita
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <Building2 className="size-4" />
              Por empresa / filial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.byCompany.slice(0, 6).map((i) => (
              <div key={i.id} className="flex justify-between gap-2">
                <span>{i.label}</span>
                <span className="tabular-nums">{money(i.amount)}</span>
              </div>
            ))}
            {dashboard.byBranch.length > 0 ? (
              <>
                <p className="pt-2 text-xs text-muted-foreground">Filiais</p>
                {dashboard.byBranch.slice(0, 4).map((i) => (
                  <div key={i.id} className="flex justify-between gap-2">
                    <span>{i.label}</span>
                    <span className="tabular-nums">{money(i.amount)}</span>
                  </div>
                ))}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <LineChart className="size-4" />
              Tendência mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dashboard.monthlyTrend.map((t) => (
              <div key={t.period} className="flex justify-between gap-2">
                <span>{t.period}</span>
                <span className="tabular-nums">
                  {money(t.realized)} / {money(t.projected)}
                </span>
              </div>
            ))}
            {!dashboard.monthlyTrend.length ? (
              <p className="text-muted-foreground">Sem série mensal.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={gofTypography.title}>
            Reforma Tributária & eficiência
          </CardTitle>
          <CardDescription>{dashboard.reformImpact.summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {dashboard.efficiency.map((e) => (
            <div key={e.key} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{e.label}</p>
              <p className="text-lg font-medium tabular-nums">{e.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{e.explanation}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <AlertTriangle className="size-4" />
              Alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 6).map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{a.severity}</Badge>
                  <span className="font-medium">{a.title}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{a.message}</p>
                <p className="mt-1 text-xs">
                  Confiança {a.confidence} · revisão humana · nunca auto-aplicado
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <Sparkles className="size-4" />
              IA Tributária
            </CardTitle>
            <CardDescription>
              Explica cálculos e sugere cenários — sem execução automática.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ai.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{r.title}</p>
                <p className="mt-1 text-muted-foreground">{r.explanation}</p>
                <p className="mt-1 text-xs">
                  Origem: {r.origin} · confiança {r.confidence}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              Fluxo de caixa tributário ({cashflow.scenario})
            </CardTitle>
            <CardDescription>{cashflow.methodology}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Total outflow:{" "}
              <span className="tabular-nums font-medium">
                {money(cashflow.totalTaxOutflow)}
              </span>
            </p>
            {cashflow.points.slice(0, 6).map((p) => (
              <div key={p.date} className="flex justify-between gap-2">
                <span>{p.date}</span>
                <span className="tabular-nums">{money(p.taxOutflow)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={cn(gofTypography.title, "flex items-center gap-2")}>
              <Users className="size-4" />
              Ranking de fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {supplierRanking.slice(0, 5).map((s) => (
              <div key={s.supplierId} className="rounded-md border p-2">
                <div className="flex justify-between">
                  <span>
                    #{s.rank} {s.name}
                  </span>
                  <span className="tabular-nums">{s.score.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.justification}
                </p>
              </div>
            ))}
            {!supplierRanking.length ? (
              <p className="text-muted-foreground">
                Sem fornecedores ranqueáveis no snapshot.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {simulation ? (
        <Card>
          <CardHeader>
            <CardTitle className={gofTypography.title}>
              Simulação: {simulation.label}
            </CardTitle>
            <CardDescription>{simulation.explanation}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Baseline {money(simulation.baselineTotal)} → Simulado{" "}
              {money(simulation.simulatedTotal)} (Δ {money(simulation.delta)})
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confiança {simulation.confidence} · requer revisão humana
            </p>
          </CardContent>
        </Card>
      ) : null}

      {drillJson ? (
        <Card>
          <CardHeader>
            <CardTitle className={gofTypography.title}>Drill-down</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
              {drillJson}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className={gofTypography.title}>
            Relatório Enterprise
          </CardTitle>
          <CardDescription>
            Exportação preparada: {report.exportFormatsPrepared.join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {report.sections.map((s) => (
            <div key={s.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-muted-foreground">{s.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{dashboard.methodology}</p>
    </div>
  );
}
