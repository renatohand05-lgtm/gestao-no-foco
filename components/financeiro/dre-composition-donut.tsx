import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency, formatPercent } from "@/lib/financeiro/format";
import type { DreComposicaoLucro } from "@/lib/dre/dre-insights-service";

const SLICES = [
  {
    key: "lucroOperacional" as const,
    label: "Lucro Operacional",
    colorVar: "var(--brand-gold, #C9A84C)",
  },
  {
    key: "resultadoFinanceiro" as const,
    label: "Resultado Financeiro",
    colorVar: "var(--brand-silver, #8B93A0)",
  },
  {
    key: "impostos" as const,
    label: "IR e CSLL",
    colorVar: "#DC2626",
  },
];

type Props = {
  composicao: DreComposicaoLucro;
  resultadoFinal: number;
};

export function DreCompositionDonut({ composicao, resultadoFinal }: Props) {
  const { total } = composicao;

  if (total <= 0) {
    return (
      <SectionCard
        title="Composição do Lucro Líquido"
        description="Participação de cada componente no resultado do período."
      >
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem base suficiente neste período para compor o gráfico.
        </p>
      </SectionCard>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offsetAcc = 0;

  const arcs = SLICES.map((slice) => {
    const value = composicao[slice.key];
    const fraction = value / total;
    const dash = fraction * circumference;
    const arc = {
      ...slice,
      value,
      fraction,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offsetAcc,
    };
    offsetAcc += dash;
    return arc;
  });

  return (
    <SectionCard
      title="Composição do Lucro Líquido"
      description="Participação de cada componente no resultado do período."
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <svg
            viewBox="0 0 160 160"
            className="size-40 -rotate-90"
            role="img"
            aria-label="Composição do lucro líquido"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-muted"
              strokeWidth="20"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={arc.colorVar}
                strokeWidth="20"
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(resultadoFinal)}
            </p>
            <p className="text-xs text-muted-foreground">Lucro Líquido</p>
          </div>
        </div>

        <ul className="w-full space-y-2">
          {arcs.map((arc) => (
            <li key={arc.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-foreground/85">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arc.colorVar }}
                />
                {arc.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {formatPercent(arc.fraction * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
