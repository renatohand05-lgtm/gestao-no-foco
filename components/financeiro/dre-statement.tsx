import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { DreLinha } from "@/types/dre";

type Props = {
  linhas: DreLinha[];
};

export function DreStatement({ linhas }: Props) {
  return (
    <SectionCard
      title="Demonstrativo"
      description="DRE por competência no período selecionado"
    >
      <div className="divide-y divide-border/70">
        {linhas.map((linha) => (
          <div
            key={linha.codigo}
            className={`flex items-center justify-between gap-4 py-3 ${
              linha.destaque ? "font-semibold" : ""
            }`}
          >
            <p
              className={
                linha.destaque
                  ? "text-sm"
                  : "text-sm text-muted-foreground"
              }
            >
              {linha.label}
            </p>
            <p
              className={`text-sm tabular-nums ${
                linha.valor < 0
                  ? "text-rose-700 dark:text-rose-400"
                  : linha.destaque
                    ? "text-foreground"
                    : ""
              }`}
            >
              {formatCurrency(linha.valor)}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
