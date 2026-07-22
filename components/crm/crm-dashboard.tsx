"use client";

import { memo, useMemo } from "react";

import { DashboardBarChart } from "@/components/dashboard/dashboard-charts";
import { SectionCard } from "@/components/ui/section-card";
import {
  CRM_FUNIL_COLORS,
  CRM_FUNIL_LABELS,
} from "@/lib/crm/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CrmDashboardKpis } from "@/types/crm";

type CrmDashboardProps = {
  kpis: CrmDashboardKpis;
};

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export const CrmDashboard = memo(function CrmDashboard({ kpis }: CrmDashboardProps) {
  const funilChart = useMemo(
    () =>
      kpis.funil.map((row) => ({
        data: row.estagio,
        label: CRM_FUNIL_LABELS[row.estagio],
        value: row.total,
      })),
    [kpis.funil],
  );

  const receitaChart = useMemo(
    () =>
      kpis.receita_mensal.map((row) => ({
        data: row.data,
        label: row.label,
        value: row.value,
      })),
    [kpis.receita_mensal],
  );

  const consultorChart = useMemo(
    () =>
      (kpis.receita_por_consultor ?? kpis.receita_por_vendedor)
        .slice(0, 8)
        .map((row) => ({
          data: row.consultor_id ?? "sem",
          label: row.nome.length > 12 ? `${row.nome.slice(0, 12)}…` : row.nome,
          value: row.receita,
        })),
    [kpis.receita_por_consultor, kpis.receita_por_vendedor],
  );

  const motivosChart = useMemo(
    () =>
      (kpis.motivos_perda ?? []).map((row) => ({
        data: row.motivo,
        label:
          row.motivo.length > 18 ? `${row.motivo.slice(0, 18)}…` : row.motivo,
        value: row.total,
      })),
    [kpis.motivos_perda],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Total de leads" value={String(kpis.total_leads)} />
        <KpiTile label="Clientes ativos" value={String(kpis.clientes_ativos)} />
        <KpiTile label="Clientes perdidos" value={String(kpis.clientes_perdidos)} />
        <KpiTile label="Novos (30d)" value={String(kpis.novos_clientes)} />
        <KpiTile
          label="Recorrentes"
          value={String(kpis.clientes_recorrentes)}
        />
        <KpiTile label="Inativos" value={String(kpis.clientes_inativos)} />
        <KpiTile
          label="Sem retorno (90d)"
          value={String(kpis.clientes_sem_retorno)}
        />
        <KpiTile
          label="Oportunidades vencidas"
          value={String(kpis.oportunidades_vencidas)}
        />
        <KpiTile
          label="Previsão fechamento"
          value={formatCurrency(kpis.previsao_fechamento)}
        />
        <KpiTile label="Receita CRM (30d)" value={formatCurrency(kpis.receita_crm)} />
        <KpiTile label="Ticket médio" value={formatCurrency(kpis.ticket_medio)} />
        <KpiTile label="Conversão" value={`${kpis.taxa_conversao}%`} />
        <KpiTile
          label="Tempo médio fechamento"
          value={`${kpis.tempo_medio_fechamento_dias} dias`}
        />
        <KpiTile
          label="Valor médio carteira"
          value={formatCurrency(kpis.valor_medio_carteira)}
        />
        <KpiTile
          label="Receita por cliente"
          value={formatCurrency(kpis.receita_por_cliente)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardBarChart
          title="Funil comercial"
          description="Quantidade de clientes por estágio"
          data={funilChart}
          barClassName="bg-primary/80"
          emptyDescription="Sem clientes no funil."
        />
        <DashboardBarChart
          title="Receita mensal"
          description="Vendas faturadas nos últimos meses"
          data={receitaChart}
          barClassName="bg-emerald-500/85"
          emptyDescription="Sem receita no período."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardBarChart
          title="Receita por consultor"
          description="Atribuído ao consultor do cliente (30 dias)"
          data={consultorChart}
          barClassName="bg-violet-500/85"
          emptyDescription="Sem vendas faturadas no período."
        />
        <DashboardBarChart
          title="Motivos de perda"
          description="Eventos de perda registrados"
          data={motivosChart}
          barClassName="bg-rose-500/80"
          emptyDescription="Sem motivos de perda registrados."
        />
      </div>

      <SectionCard title="Detalhe do funil">
        <ul className="space-y-2">
          {kpis.funil.map((row) => (
            <li
              key={row.estagio}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  CRM_FUNIL_COLORS[row.estagio],
                )}
              >
                {CRM_FUNIL_LABELS[row.estagio]}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {row.total} · {formatCurrency(row.valor_total)}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
});
