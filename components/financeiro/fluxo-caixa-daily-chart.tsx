"use client";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/financeiro/format";
import type { FluxoCaixaDailyPoint } from "@/types/fluxo-caixa";

type Props = {
  data: FluxoCaixaDailyPoint[];
};

function formatDayLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date}T12:00:00`));
}

export function FluxoCaixaDailyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <SectionCard
        title="Fluxo diário"
        description="Entradas e saídas por dia no período selecionado"
      >
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhum dado para o período selecionado.
        </p>
      </SectionCard>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap((point) => [point.entradas, point.saidas]),
    1,
  );

  return (
    <SectionCard
      title="Fluxo diário"
      description="Entradas e saídas por dia no período selecionado (realizado + previsto)"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-500" />
            Entradas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-rose-500" />
            Saídas
          </span>
        </div>

        <div className="overflow-x-auto -mx-1 px-1">
          <div
            className="flex min-w-[36rem] items-end gap-1.5 sm:min-w-0 sm:gap-2"
            role="img"
            aria-label="Gráfico de barras com entradas e saídas diárias"
          >
            {data.map((point) => {
              const entradaHeight = (point.entradas / maxValue) * 100;
              const saidaHeight = (point.saidas / maxValue) * 100;

              return (
                <div
                  key={point.data}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-40 w-full items-end justify-center gap-0.5 sm:h-48 sm:gap-1">
                    <div
                      className="w-full max-w-4 rounded-t bg-emerald-500/85 transition-all"
                      style={{
                        height: `${entradaHeight}%`,
                        minHeight: point.entradas > 0 ? "4px" : "0",
                      }}
                      title={`Entradas: ${formatCurrency(point.entradas)} · Acumulado: ${formatCurrency(point.saldo_acumulado)}`}
                    />
                    <div
                      className="w-full max-w-4 rounded-t bg-rose-500/85 transition-all"
                      style={{
                        height: `${saidaHeight}%`,
                        minHeight: point.saidas > 0 ? "4px" : "0",
                      }}
                      title={`Saídas: ${formatCurrency(point.saidas)} · Saldo do dia: ${formatCurrency(point.saldo_diario)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground sm:text-xs">
                    {formatDayLabel(point.data)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
