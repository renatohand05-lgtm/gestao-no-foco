import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import type { FiExpenseRow } from "@/lib/financial-intelligence/types";

type Props = {
  expenses: FiExpenseRow[];
};

export function FiExpenseBreakdown({ expenses }: Props) {
  const max = Math.max(...expenses.map((e) => e.value), 1);

  return (
    <SectionCard
      title="Análise de despesas"
      description="Classificação do DRE existente (competência). Clique para abrir a linha no DRE."
      contentClassName="pt-0"
    >
      <ul className="space-y-3">
        {expenses.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              className="group block rounded-xl border border-border/60 px-3 py-2.5 transition hover:border-emerald-500/40 hover:bg-muted/40"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-foreground group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                  {row.label}
                </p>
                <p className="tabular-nums text-sm font-semibold">
                  {formatCurrency(row.value)}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500/80 transition-[width]"
                  style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.pctReceitaLiquida != null
                  ? `${row.pctReceitaLiquida.toFixed(1)}% da receita líquida`
                  : "Sem base de receita líquida"}
                {" · "}
                {row.source === "dre_opex_grupo"
                  ? "grupo opex"
                  : row.source === "dre_resumo"
                    ? "linha DRE"
                    : "detalhe DRE"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
