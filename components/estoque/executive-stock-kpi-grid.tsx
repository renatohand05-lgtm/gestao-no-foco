import type { EscMetric } from "@/lib/estoque/executive-stock-compose";
import type { ExecutiveStockData } from "@/lib/estoque/executive-stock-types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

function formatMetric(
  m: EscMetric,
  kind: "currency" | "number" | "days" | "ratio",
): string {
  if (!m.available || m.value == null) return "Indisponível";
  if (kind === "currency") return formatCurrency(m.value);
  if (kind === "days") {
    return `${m.value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} d`;
  }
  if (kind === "ratio") {
    return m.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }
  return m.value.toLocaleString("pt-BR");
}

function KpiCard({
  label,
  value,
  supporting,
  tone = "default",
}: {
  label: string;
  value: string;
  supporting?: string;
  tone?: "default" | "warn" | "muted";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border bg-card p-4 h-full",
        tone === "warn" && "border-amber-300/80",
        tone === "muted" && "opacity-90",
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
}

type Props = {
  kpis: ExecutiveStockData["kpis"];
};

export function ExecutiveStockKpiGrid({ kpis }: Props) {
  const items: Array<{
    label: string;
    value: string;
    supporting?: string;
    tone?: "default" | "warn" | "muted";
  }> = [
    {
      label: "Valor total em estoque",
      value: formatMetric(kpis.valorTotalEstoque, "currency"),
      supporting: kpis.valorTotalEstoque.supporting,
      tone: kpis.valorTotalEstoque.partial ? "warn" : "default",
    },
    {
      label: "Valor financeiro parado",
      value: formatMetric(kpis.valorFinanceiroParado, "currency"),
      supporting: kpis.valorFinanceiroParado.supporting,
    },
    {
      label: "Abaixo do mínimo",
      value: formatMetric(kpis.produtosAbaixoMinimo, "number"),
      tone:
        kpis.produtosAbaixoMinimo.available &&
        (kpis.produtosAbaixoMinimo.value ?? 0) > 0
          ? "warn"
          : "default",
    },
    {
      label: "Produtos zerados",
      value: formatMetric(kpis.produtosZerados, "number"),
      tone:
        kpis.produtosZerados.available && (kpis.produtosZerados.value ?? 0) > 0
          ? "warn"
          : "default",
    },
    {
      label: "Giro médio",
      value: formatMetric(kpis.giroMedio, "ratio"),
      supporting: kpis.giroMedio.supporting,
      tone: kpis.giroMedio.available ? "default" : "muted",
    },
    {
      label: "Cobertura de estoque",
      value: formatMetric(kpis.coberturaEstoque, "days"),
      supporting: kpis.coberturaEstoque.supporting,
      tone: kpis.coberturaEstoque.available ? "default" : "muted",
    },
    {
      label: "Valor comprometido em OS",
      value: formatMetric(kpis.valorComprometidoOs, "currency"),
      supporting: kpis.valorComprometidoOs.supporting,
      tone: kpis.valorComprometidoOs.partial ? "warn" : "default",
    },
    {
      label: "Valor reservado",
      value: formatMetric(kpis.valorReservado, "currency"),
      supporting: kpis.valorReservado.supporting,
      tone: "muted",
    },
    {
      label: "SKUs ativos",
      value: formatMetric(kpis.skusAtivos, "number"),
    },
    {
      label: "Fornecedores ativos",
      value: formatMetric(kpis.fornecedoresAtivos, "number"),
      supporting: kpis.fornecedoresAtivos.supporting,
      tone: kpis.fornecedoresAtivos.available ? "default" : "muted",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}
