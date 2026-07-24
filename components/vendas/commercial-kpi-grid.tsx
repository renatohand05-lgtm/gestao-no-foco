import Link from "next/link";

import { MetricCard } from "@/components/executive";
import type {
  CiKpis,
  CiMetricNumber,
} from "@/lib/vendas/commercial-intelligence-types";
import { formatCurrency } from "@/lib/format";
import { gofGrid } from "@/lib/design-system";

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

/**
 * Grade de KPIs comerciais — MetricCard oficial (Gate 19.1).
 */
export function CommercialKpiGrid({ tenantSlug, kpis, de, ate }: Props) {
  const base = `/${tenantSlug}/vendas`;
  const periodQs = `de=${de}&ate=${ate}`;

  const items: Array<{
    label: string;
    value: string;
    hint?: string;
    href?: string;
    tone?: "success" | "warning" | "danger" | "neutral" | "info";
    emphasize?: boolean;
  }> = [
    {
      label: "Faturamento do período",
      value: formatMetric(kpis.faturamentoPeriodo, "currency"),
      hint: "Valor líquido das vendas faturadas.",
      href: `${base}?status=faturado&${periodQs}`,
      tone: "success",
      emphasize: true,
    },
    {
      label: "Vendas faturadas",
      value: formatMetric(kpis.quantidadeFaturadas, "number"),
      href: `${base}?status=faturado&${periodQs}`,
    },
    {
      label: "Ticket médio",
      value: formatMetric(kpis.ticketMedio, "currency"),
      hint: kpis.ticketMedio.available
        ? "Faturamento ÷ quantidade faturada."
        : "Sem vendas faturadas no período.",
    },
    {
      label: "Valor em negociação",
      value: formatMetric(kpis.valorEmNegociacao, "currency"),
      hint: "Orçamentos e vendas em andamento.",
      href: `${base}/abertas`,
      tone: "info",
    },
    {
      label: "Orçamentos aguardando",
      value: formatMetric(kpis.orcamentosAguardando, "number"),
      hint: "Status orçamento.",
      href: `${base}/abertas`,
      tone: (kpis.orcamentosAguardando.value ?? 0) > 0 ? "warning" : "neutral",
    },
    {
      label: "Taxa de conversão comercial",
      value: formatMetric(kpis.taxaConversaoComercial, "percent"),
      hint: kpis.taxaConversaoComercial.available
        ? `${kpis.conversaoNumerador}/${kpis.conversaoDenominador} · ${kpis.conversaoFormula}`
        : "Indisponível — denominador zero.",
    },
    {
      label: "Vendas canceladas",
      value: formatMetric(kpis.vendasCanceladas, "number"),
      href: `${base}?status=cancelado&${periodQs}`,
    },
    {
      label: "Valor perdido",
      value: formatMetric(kpis.valorPerdido, "currency"),
      hint: "Negócios cancelados no período.",
      tone: (kpis.valorPerdido.value ?? 0) > 0 ? "warning" : "neutral",
    },
    {
      label: "Desconto concedido",
      value: formatMetric(kpis.descontoConcedido, "currency"),
      hint: "Soma de desconto_total nas faturadas.",
      href: `/${tenantSlug}/descontos/dashboard`,
    },
    {
      label: "Clientes compradores",
      value: formatMetric(kpis.clientesCompradores, "number"),
      hint: "Clientes distintos com venda faturada.",
      href: `/${tenantSlug}/clientes`,
    },
  ];

  return (
    <div className={gofGrid.kpis}>
      {items.map((item) => {
        const card = (
          <MetricCard
            label={item.label}
            value={item.value}
            hint={item.hint}
            tone={item.tone ?? "neutral"}
            emphasize={item.emphasize}
            className="h-full"
          />
        );
        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className="block h-full min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40"
            >
              {card}
            </Link>
          );
        }
        return <div key={item.label}>{card}</div>;
      })}
    </div>
  );
}
