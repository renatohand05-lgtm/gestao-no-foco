import type { ServiceQualityReport } from "@/lib/produtos/service-quality-service";

type Props = {
  report: ServiceQualityReport;
};

export function ServiceQualityPanel({ report }: Props) {
  const cards = [
    { label: "Total", value: report.total },
    { label: "Ativos", value: report.ativos },
    { label: "Inativos", value: report.inativos },
    { label: "Sem custo", value: report.semCusto },
    { label: "Sem preço", value: report.semPreco },
    { label: "Preço < custo", value: report.precoAbaixoCusto },
    { label: "Sem categoria", value: report.semCategoria },
    { label: "Duplicados", value: report.duplicados },
    { label: "Nunca utilizados", value: report.nuncaUtilizados },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border/60 bg-card px-4 py-3"
        >
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-2xl font-medium tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
