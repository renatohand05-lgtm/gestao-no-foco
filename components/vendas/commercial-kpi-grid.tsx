import Link from "next/link";

import type { CiKpis, CiMetricNumber } from "@/lib/vendas/commercial-intelligence-types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  kpis: CiKpis;
  de: string;
  ate: string;
};

function formatMetric(
  m: CiMetricNumber,
  kind: "currency" | "number" | "percent",
): string {
  if (!m.available || m.value == null) return "Indisponível";
  if (kind === "currency") return formatCurrency(m.value);
  if (kind === "percent") {
    return `${m.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  return m.value.toLocaleString("pt-BR");
}

function KpiCard({
  label,
  value,
  supporting,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  supporting?: string;
  href?: string;
  tone?: "default" | "warn" | "ok" | "muted";
}) {
  const body = (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-card p-4 h-full",
        tone === "warn" && "border-amber-300/80",
        tone === "ok" && "border-emerald-300/80",
        tone === "muted" && "opacity-90",
        href && "transition-colors hover:bg-muted/40",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
      </p>
      {supporting ? (
        <p className="mt-1 text-xs text-muted-foreground">{supporting}</p>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }
  return body;
}

export function CommercialKpiGrid({ tenantSlug, kpis, de, ate }: Props) {
  const base = `/${tenantSlug}/vendas`;
  const periodQs = `de=${de}&ate=${ate}`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="Faturamento do período"
        value={formatMetric(kpis.faturamentoPeriodo, "currency")}
        supporting="Valor líquido das vendas faturadas."
        href={`${base}?status=faturado&${periodQs}`}
        tone="ok"
      />
      <KpiCard
        label="Vendas faturadas"
        value={formatMetric(kpis.quantidadeFaturadas, "number")}
        href={`${base}?status=faturado&${periodQs}`}
      />
      <KpiCard
        label="Ticket médio"
        value={formatMetric(kpis.ticketMedio, "currency")}
        supporting={
          kpis.ticketMedio.available
            ? "Faturamento ÷ quantidade faturada."
            : "Sem vendas faturadas no período."
        }
        tone={kpis.ticketMedio.available ? "default" : "muted"}
      />
      <KpiCard
        label="Valor em negociação"
        value={formatMetric(kpis.valorEmNegociacao, "currency")}
        supporting="Orçamentos e vendas em andamento."
        href={`${base}/abertas`}
      />
      <KpiCard
        label="Orçamentos aguardando"
        value={formatMetric(kpis.orcamentosAguardando, "number")}
        supporting="Status orçamento."
        href={`${base}/abertas`}
        tone={
          (kpis.orcamentosAguardando.value ?? 0) > 0 ? "warn" : "default"
        }
      />
      <KpiCard
        label="Taxa de conversão comercial"
        value={formatMetric(kpis.taxaConversaoComercial, "percent")}
        supporting={
          kpis.taxaConversaoComercial.available
            ? `${kpis.conversaoNumerador}/${kpis.conversaoDenominador} · ${kpis.conversaoFormula}`
            : "Indisponível — denominador zero (sem vendas elegíveis criadas no período)."
        }
        tone={kpis.taxaConversaoComercial.available ? "default" : "muted"}
      />
      <KpiCard
        label="Vendas canceladas"
        value={formatMetric(kpis.vendasCanceladas, "number")}
        href={`${base}?status=cancelado&${periodQs}`}
      />
      <KpiCard
        label="Valor perdido"
        value={formatMetric(kpis.valorPerdido, "currency")}
        supporting="Negócios cancelados no período."
        tone={(kpis.valorPerdido.value ?? 0) > 0 ? "warn" : "default"}
      />
      <KpiCard
        label="Desconto concedido"
        value={formatMetric(kpis.descontoConcedido, "currency")}
        supporting="Soma de desconto_total nas faturadas."
        href={`/${tenantSlug}/descontos/dashboard`}
      />
      <KpiCard
        label="Clientes compradores"
        value={formatMetric(kpis.clientesCompradores, "number")}
        supporting="Clientes distintos com venda faturada."
        href={`/${tenantSlug}/clientes`}
      />
    </div>
  );
}
