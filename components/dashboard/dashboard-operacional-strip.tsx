import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import type { OperacionalOverview } from "@/lib/dashboard/operacional-overview-service";
import { cn } from "@/lib/utils";

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null) {
    return (
      <span className="text-[11px] text-muted-foreground">sem base</span>
    );
  }
  const pos = pct >= 0;
  return (
    <span
      className={cn(
        "text-[11px] font-medium",
        pos
          ? "text-emerald-700 dark:text-emerald-400"
          : "text-rose-700 dark:text-rose-400",
      )}
    >
      {pos ? "+" : ""}
      {pct}%
    </span>
  );
}

function Card({
  label,
  value,
  href,
  delta,
  hint,
}: {
  label: string;
  value: string;
  href?: string;
  delta?: number | null;
  hint?: string;
}) {
  const inner = (
    <div className="rounded-lg border bg-card p-3 transition hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {delta !== undefined ? <DeltaBadge pct={delta} /> : null}
      </div>
      <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

type Props = {
  tenantSlug: string;
  data: OperacionalOverview;
};

export function DashboardOperacionalStrip({ tenantSlug, data }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Operação — Vendas</h2>
          <Link
            href={`/${tenantSlug}/vendas/dashboard`}
            className="text-xs underline"
          >
            Ver dashboard
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Card
            label="Vendas hoje"
            value={formatCurrency(data.vendas.dia.atual)}
            delta={data.vendas.dia.pct}
            hint="vs ontem"
            href={`/${tenantSlug}/vendas`}
          />
          <Card
            label="Vendas no mês"
            value={formatCurrency(data.vendas.mes.atual)}
            delta={data.vendas.mes.pct}
            hint="vs mês anterior"
            href={`/${tenantSlug}/vendas/dashboard`}
          />
          <Card
            label="Ticket médio"
            value={formatCurrency(data.vendas.ticketMedio.atual)}
            delta={data.vendas.ticketMedio.pct}
          />
          <Card
            label="Margem bruta"
            value={formatCurrency(data.vendas.margemBruta)}
          />
          <Card
            label="Descontos"
            value={formatCurrency(data.vendas.descontos)}
            href={`/${tenantSlug}/descontos/dashboard`}
          />
          <Card
            label="Canceladas"
            value={String(data.vendas.canceladas)}
          />
          <Card
            label="Itens vendidos"
            value={String(data.vendas.itensVendidos)}
          />
          <Card
            label="Clientes atendidos"
            value={String(data.vendas.clientesAtendidos)}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Operação — Ordens de Serviço</h2>
          <Link
            href={`/${tenantSlug}/ordens/dashboard`}
            className="text-xs underline"
          >
            Ver dashboard
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <Card
            label="OS abertas"
            value={String(data.os.abertas)}
            href={`/${tenantSlug}/ordens?status=aguardando_diagnostico`}
          />
          <Card
            label="Pendentes"
            value={String(data.os.pendentes)}
            href={`/${tenantSlug}/ordens?status=aguardando_peca`}
          />
          <Card
            label="Aguardando aprovação"
            value={String(data.os.aguardandoAprovacao)}
            href={`/${tenantSlug}/ordens?status=aguardando_aprovacao`}
          />
          <Card
            label="Em execução"
            value={String(data.os.emExecucao)}
            href={`/${tenantSlug}/ordens?status=em_execucao`}
          />
          <Card
            label="Finalizadas hoje"
            value={String(data.os.finalizadasHoje)}
          />
          <Card
            label="Finalizadas no mês"
            value={String(data.os.finalizadasMes)}
          />
          <Card label="Canceladas" value={String(data.os.canceladas)} />
          <Card
            label="Ticket médio OS"
            value={formatCurrency(data.os.ticketMedio)}
          />
          <Card
            label="Faturamento OS"
            value={formatCurrency(data.os.faturamento)}
          />
          <Card
            label="Tempo médio"
            value={
              data.os.tempoMedioDias != null
                ? `${data.os.tempoMedioDias} d`
                : "—"
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Estoque</h2>
            <Link href={`/${tenantSlug}/estoque`} className="text-xs underline">
              Abrir
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Card label="Estoque baixo" value={String(data.estoque.baixo)} />
            <Card label="Zerados" value={String(data.estoque.zerados)} />
            <Card
              label="Valor do estoque"
              value={formatCurrency(data.estoque.valorTotal)}
            />
            <Card
              label="Sem giro (90d)"
              value={String(data.estoque.semGiro)}
            />
            <Card
              label="Saídas hoje"
              value={String(data.estoque.saidasDia)}
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Financeiro</h2>
            <Link
              href={`/${tenantSlug}/financeiro/contas-receber`}
              className="text-xs underline"
            >
              Abrir
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              label="A receber"
              value={formatCurrency(data.financeiro.receberAberto)}
            />
            <Card
              label="Vencidas"
              value={formatCurrency(data.financeiro.receberVencido)}
            />
            <Card
              label="Entradas hoje"
              value={formatCurrency(data.financeiro.entradasDia)}
            />
            <Card
              label="Saídas hoje"
              value={formatCurrency(data.financeiro.saidasDia)}
            />
            <Card
              label="Saldo projetado"
              value={formatCurrency(data.financeiro.saldoProjetado)}
            />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">CRM</h2>
          <Link
            href={`/${tenantSlug}/clientes/dashboard`}
            className="text-xs underline"
          >
            Ver dashboard
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            label="Novos no mês"
            value={String(data.crm.novosMes)}
            href={`/${tenantSlug}/clientes`}
          />
          <Card label="Clientes ativos" value={String(data.crm.ativos)} />
          <Card
            label="Leads"
            value={String(data.crm.leads)}
            href={`/${tenantSlug}/clientes/funil`}
          />
          <Card
            label="Oportunidades abertas"
            value={String(data.crm.oportunidadesAbertas)}
            href={`/${tenantSlug}/clientes/funil`}
          />
        </div>
      </div>
    </div>
  );
}
