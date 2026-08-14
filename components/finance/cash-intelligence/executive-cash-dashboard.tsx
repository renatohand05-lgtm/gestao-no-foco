"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Shield,
  Sparkles,
  Wallet,
} from "lucide-react";

import { MetricCard } from "@/components/executive";
import { ExecutiveEmptyState } from "@/components/executive";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ExecutiveCashDashboard,
  RescheduleRecommendation,
  ScenarioComparison,
} from "@/lib/finance/cash-intelligence";
import {
  getCashDrillDown,
  getCashRecommendations,
  simulateCashScenario,
} from "@/lib/finance/cash-intelligence/cash-intelligence-actions";
import { CashProjectionChart } from "./cash-projection-chart";
import { CashRiskAlerts } from "./cash-risk-alerts";
import { WorkingCapitalCard } from "./working-capital-card";
import { RecommendationPanel } from "./recommendation-panel";
import { ScenarioSimulator } from "./scenario-simulator";
import { CashDrillDownDrawer } from "./cash-drill-down-drawer";
import { CashLayersPanel } from "./cash-layers-panel";

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  tenantSlug: string;
  initialDashboard: ExecutiveCashDashboard;
  initialHorizon: number;
};

export function ExecutiveCashDashboardClient({
  tenantSlug,
  initialDashboard,
  initialHorizon,
}: Props) {
  const [dashboard] = useState(initialDashboard);
  const [horizon] = useState(initialHorizon);
  const [recommendations, setRecommendations] = useState<
    RescheduleRecommendation[]
  >([]);
  const [scenarioResult, setScenarioResult] =
    useState<ScenarioComparison | null>(null);
  const [drillJson, setDrillJson] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const kpis = useMemo(
    () => [
      {
        key: "consolidated",
        label: "Saldo consolidado",
        value: money(dashboard.balance.consolidated),
        tone: "info" as const,
        icon: Wallet,
      },
      {
        key: "available",
        label: "Saldo disponível",
        value: money(dashboard.balance.available),
        tone: "success" as const,
        icon: Shield,
      },
      {
        key: "committed",
        label: "Saldo comprometido",
        value: money(dashboard.balance.committed),
        tone: "warning" as const,
        icon: AlertTriangle,
      },
      {
        key: "in",
        label: "Entradas (realizado)",
        value: money(dashboard.periodInflows),
        tone: "success" as const,
        icon: ArrowUpRight,
      },
      {
        key: "out",
        label: "Saídas (realizado)",
        value: money(dashboard.periodOutflows),
        tone: "danger" as const,
        icon: ArrowDownRight,
      },
      {
        key: "net",
        label: "Resultado líquido",
        value: money(dashboard.periodNet),
        tone: dashboard.periodNet >= 0 ? ("success" as const) : ("danger" as const),
        icon: Sparkles,
      },
      {
        key: "accounts",
        label: "Contas ativas",
        value: String(dashboard.balance.activeAccounts),
        tone: "neutral" as const,
        icon: Landmark,
      },
      {
        key: "ar",
        label: "Valores a receber",
        value: money(dashboard.receivablesOpen),
        tone: "info" as const,
        icon: ArrowUpRight,
      },
      {
        key: "ap",
        label: "Valores a pagar",
        value: money(dashboard.payablesOpen),
        tone: "warning" as const,
        icon: ArrowDownRight,
      },
      {
        key: "min",
        label: "Menor saldo projetado",
        value: money(dashboard.projection.minBalance),
        tone: dashboard.projection.minBalance < 0 ? ("danger" as const) : ("neutral" as const),
        icon: AlertTriangle,
      },
      {
        key: "risk",
        label: "Próxima data de risco",
        value: dashboard.projection.ruptureDate ?? "—",
        tone: dashboard.projection.ruptureDate ? ("danger" as const) : ("success" as const),
        icon: AlertTriangle,
      },
      {
        key: "wc",
        label: "Capital de giro estimado",
        value: money(dashboard.workingCapital.recommended),
        tone: "info" as const,
        icon: Wallet,
      },
    ],
    [dashboard],
  );

  function loadRecommendations() {
    startTransition(async () => {
      const res = await getCashRecommendations(tenantSlug, horizon);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setRecommendations(res.recommendations);
    });
  }

  function openDrill(key: string, label: string) {
    startTransition(async () => {
      const res = await getCashDrillDown(tenantSlug, {
        indicatorKey: key,
        indicatorLabel: label,
        from: dashboard.projection.from,
        to: dashboard.projection.to,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setDrillJson(JSON.stringify(res.tree, null, 2));
    });
  }

  function runScenario(kind: "investment" | "loan") {
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await simulateCashScenario(
        tenantSlug,
        kind === "investment"
          ? {
              kind: "investment",
              name: "Cenário de investimento",
              amount: 10_000,
              disbursementDate: today,
              horizonDays: horizon,
            }
          : {
              kind: "loan",
              name: "Cenário de empréstimo",
              principal: 20_000,
              releaseDate: today,
              rateMonthlyPct: 1.5,
              installments: 12,
              horizonDays: horizon,
            },
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setScenarioResult(res.result);
    });
  }

  return (
    <div className="space-y-6" data-cash-intelligence-dashboard>
      {error ? (
        <p className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Horizonte</span>
        {[30, 60, 90, 365].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={horizon === d ? "default" : "outline"}
            render={<Link href={`/${tenantSlug}/financeiro/caixa?horizon=${d}`} />}
          >
            {d}d
          </Button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={loadRecommendations}
        >
          Gerar recomendações
        </Button>
        <Button
          size="sm"
          variant="outline"
          render={<Link href={`/${tenantSlug}/financeiro/conciliacao`} />}
        >
          Conciliação
        </Button>
      </div>

      <section
        aria-label="KPIs de tesouraria"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
            onClick={() => openDrill(k.key, k.label)}
          >
            <MetricCard
              label={k.label}
              value={k.value}
              tone={k.tone}
              icon={k.icon}
              hint="Clique para drill-down"
            />
          </button>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkingCapitalCard wc={dashboard.workingCapital} />
        <CashRiskAlerts alerts={dashboard.alerts} />
      </div>

      {dashboard.projection.insufficientData ? (
        <ExecutiveEmptyState
          title="Projeção com baixa confiabilidade"
          description={dashboard.projection.confidenceReason}
        />
      ) : (
        <CashProjectionChart projection={dashboard.projection} />
      )}

      <CashLayersPanel layers={dashboard.layers} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecommendationPanel recommendations={recommendations} />
        <ScenarioSimulator
          result={scenarioResult}
          pending={pending}
          onSimulateInvestment={() => runScenario("investment")}
          onSimulateLoan={() => runScenario("loan")}
        />
      </div>

      <CashDrillDownDrawer
        open={Boolean(drillJson)}
        content={drillJson}
        onClose={() => setDrillJson(null)}
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm">Metodologia</CardTitle>
          <CardDescription>{dashboard.balance.methodology}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Confiança da projeção: {dashboard.projection.confidence} —{" "}
          {dashboard.projection.confidenceReason}
        </CardContent>
      </Card>
    </div>
  );
}
