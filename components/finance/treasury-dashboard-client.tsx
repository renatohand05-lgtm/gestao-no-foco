"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { FinancePeriodFilter } from "@/components/finance/finance-period-filter";
import { TreasuryAccountsGrid } from "@/components/finance/treasury-accounts-grid";
import { TreasuryAlertsPanel } from "@/components/finance/treasury-alerts-panel";
import { TreasuryBalanceChart } from "@/components/finance/treasury-balance-chart";
import { TreasuryInsightsPanel } from "@/components/finance/treasury-insights-panel";
import { TreasuryKpiGrid } from "@/components/finance/treasury-kpi-grid";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  TreasuryAccountView,
  TreasuryAlert,
  TreasuryBalanceEvolution,
  TreasuryInsight,
  TreasuryPeriodKey,
  TreasurySummary,
} from "@/lib/finance";

export type TreasuryDashboardState =
  | "ok"
  | "permission_denied"
  | "load_error"
  | "empty_accounts"
  | "empty_period";

type Props = {
  tenantSlug: string;
  periodKey: TreasuryPeriodKey;
  summary: TreasurySummary | null;
  evolution: TreasuryBalanceEvolution | null;
  accounts: TreasuryAccountView[];
  insights: TreasuryInsight[];
  alerts: TreasuryAlert[];
  error?: string | null;
  errorCode?: string | null;
  state?: TreasuryDashboardState;
};

function resolveState(props: Props): TreasuryDashboardState {
  if (props.state) return props.state;
  if (
    props.errorCode === "FINANCE_PERMISSION_DENIED" ||
    props.errorCode === "FINANCE_CONFIG_PENDING" ||
    (props.error && /permiss/i.test(props.error))
  ) {
    return "permission_denied";
  }
  if (props.error && !props.summary) return "load_error";
  if (props.summary && props.accounts.length === 0) return "empty_accounts";
  if (
    props.summary &&
    props.summary.inflows === 0 &&
    props.summary.outflows === 0 &&
    (props.evolution?.hasMovements === false ||
      (props.evolution?.points.length ?? 0) === 0)
  ) {
    return "empty_period";
  }
  return "ok";
}

export function TreasuryDashboardClient(props: Props) {
  const {
    tenantSlug,
    periodKey,
    summary,
    evolution,
    accounts,
    insights,
    alerts,
    error,
  } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const state = resolveState(props);

  if (state === "permission_denied") {
    return (
      <div
        className="space-y-4"
        data-treasury-dashboard
        data-treasury-state="permission_denied"
      >
        <p
          className="rounded-lg border border-amber-600/40 bg-amber-50/60 px-3 py-3 text-sm text-amber-950"
          role="alert"
        >
          {error ??
            "Sem permissão para visualizar a tesouraria. Peça a um administrador para atribuir permissões financeiras."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      data-treasury-dashboard
      data-treasury-state={state}
    >
      <FinancePeriodFilter value={periodKey} />

      {state === "load_error" && error ? (
        <p
          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          Erro ao carregar dados: {error}
        </p>
      ) : null}

      {state === "empty_accounts" ? (
        <p
          className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground"
          data-treasury-empty="accounts"
        >
          Nenhuma conta bancária ativa. Cadastre uma conta para ver a posição de
          caixa — isto não é um bloqueio de permissão.
        </p>
      ) : null}

      {state === "empty_period" && summary ? (
        <p
          className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground"
          data-treasury-empty="period"
        >
          Sem movimentações no período selecionado. Os saldos e KPIs abaixo
          reflectem a posição actual.
        </p>
      ) : null}

      {summary ? (
        <TreasuryKpiGrid summary={summary} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy>
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      )}

      <TreasuryBalanceChart
        evolution={evolution}
        periodKey={periodKey}
        error={state === "load_error" ? error : null}
        onPeriodChange={(key) => {
          startTransition(() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("period", key);
            if (key !== "custom") {
              next.delete("from");
              next.delete("to");
            }
            router.replace(`?${next.toString()}`);
          });
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TreasuryInsightsPanel insights={insights} />
        <TreasuryAlertsPanel alerts={alerts} />
      </div>

      <TreasuryAccountsGrid tenantSlug={tenantSlug} accounts={accounts} />
    </div>
  );
}
