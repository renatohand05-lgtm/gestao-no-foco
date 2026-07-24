import type { CrmExecKpis } from "@/lib/crm/crm-executivo-compose";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  kpis: CrmExecKpis;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn" | "ok";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-card p-4",
        tone === "warn" && "border-amber-300/80",
        tone === "ok" && "border-emerald-300/80",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

export function CrmExecutivoKpis({ kpis }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Clientes ativos" value={String(kpis.clientesAtivos)} tone="ok" />
      <KpiCard
        label="Inativos (>180 dias)"
        value={String(kpis.clientesInativos180)}
        tone={kpis.clientesInativos180 > 0 ? "warn" : "default"}
      />
      <KpiCard label="Novos no mês" value={String(kpis.clientesNovosMes)} />
      <KpiCard label="Recorrentes" value={String(kpis.clientesRecorrentes)} />
      <KpiCard
        label="Ticket médio / cliente"
        value={formatCurrency(kpis.ticketMedioPorCliente)}
      />
      <KpiCard
        label="Faturamento / cliente"
        value={formatCurrency(kpis.faturamentoPorCliente)}
      />
      <KpiCard
        label="Total gasto (Lifetime)"
        value={formatCurrency(kpis.totalGastoLifetime)}
      />
      <KpiCard
        label="Média de visitas"
        value={kpis.mediaVisitas.toLocaleString("pt-BR", {
          maximumFractionDigits: 1,
        })}
      />
      <KpiCard
        label="Última OS/venda (proxy)"
        value={formatDate(kpis.ultimaVisitaCarteira)}
      />
      <KpiCard
        label="Próx. tarefa/agenda (proxy)"
        value={formatDate(kpis.proximaRevisaoPrevista)}
      />
    </div>
  );
}
