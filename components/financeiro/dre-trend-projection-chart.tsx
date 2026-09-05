import { TrendingUp } from "lucide-react";

import { SectionCard } from "@/components/ui/section-card";
import { formatPercent } from "@/lib/financeiro/format";
import { formatCurrencyCompact } from "@/lib/format";
import type { DreTrendPoint } from "@/lib/dre/dre-insights-service";

type Props = {
  points: DreTrendPoint[];
};

const CHART_HEIGHT = 220;
const BAR_AREA_TOP = 24;
const BAR_AREA_BOTTOM = 40;
const BAR_AREA_HEIGHT = CHART_HEIGHT - BAR_AREA_TOP - BAR_AREA_BOTTOM;
const SLOT_WIDTH = 90;

export function DreTrendProjectionChart({ points }: Props) {
  const hasData = points.some(
    (p) => p.receitaLiquida !== 0 || p.lucroLiquido !== 0,
  );

  if (!hasData || points.length === 0) {
    return (
      <SectionCard
        title="Tendência e projeção"
        description="Projeção dos próximos meses com base no histórico realizado."
      >
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem histórico suficiente pra projetar uma tendência ainda.
        </p>
      </SectionCard>
    );
  }

  const firstProjectedIndex = points.findIndex((p) => p.isProjected);
  const hasProjection = firstProjectedIndex !== -1;

  const allValues = points.flatMap((p) => [p.receitaLiquida, p.lucroLiquido]);
  const maxValue = Math.max(0, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const range = maxValue - minValue || 1;
  const zeroY = BAR_AREA_TOP + (maxValue / range) * BAR_AREA_HEIGHT;

  function valueToY(value: number) {
    return BAR_AREA_TOP + ((maxValue - value) / range) * BAR_AREA_HEIGHT;
  }

  const width = points.length * SLOT_WIDTH;
  const dividerX = hasProjection ? firstProjectedIndex * SLOT_WIDTH : null;

  return (
    <SectionCard
      title="Tendência e projeção"
      description="Últimos meses realizados + projeção estatística com base na tendência de vendas e lançamentos."
    >
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--brand-silver,#8B93A0)]" />
          Receita Líquida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          Lucro Líquido
        </span>
        {hasProjection ? (
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-[var(--brand-gold,#C9A84C)]" />
            Projeção (tracejado)
          </span>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          className="h-56 w-full"
          style={{ minWidth: width }}
          role="img"
          aria-label="Tendência e projeção do resultado"
        >
          <line
            x1="0"
            x2={width}
            y1={zeroY}
            y2={zeroY}
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />

          {dividerX !== null ? (
            <line
              x1={dividerX}
              x2={dividerX}
              y1={BAR_AREA_TOP - 8}
              y2={CHART_HEIGHT - BAR_AREA_BOTTOM + 8}
              stroke="var(--brand-gold, #C9A84C)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.6}
            />
          ) : null}

          {points.map((p, i) => {
            const slotX = i * SLOT_WIDTH;
            const barWidth = 16;
            const receitaX = slotX + SLOT_WIDTH / 2 - barWidth - 4;
            const lucroX = slotX + SLOT_WIDTH / 2 + 4;
            const receitaY = valueToY(p.receitaLiquida);
            const lucroY = valueToY(p.lucroLiquido);
            const opacity = p.isProjected ? 0.45 : 1;

            return (
              <g key={`${p.label}-${i}`}>
                <rect
                  x={receitaX}
                  y={Math.min(receitaY, zeroY)}
                  width={barWidth}
                  height={Math.abs(receitaY - zeroY)}
                  className="fill-[var(--brand-silver,#8B93A0)]"
                  opacity={p.isProjected ? 0.4 : 0.7}
                  rx={2}
                  strokeDasharray={p.isProjected ? "3 2" : undefined}
                  stroke={
                    p.isProjected ? "var(--brand-silver, #8B93A0)" : undefined
                  }
                  strokeWidth={p.isProjected ? 1 : 0}
                />
                <rect
                  x={lucroX}
                  y={Math.min(lucroY, zeroY)}
                  width={barWidth}
                  height={Math.abs(lucroY - zeroY)}
                  fill="currentColor"
                  className="text-emerald-500"
                  opacity={opacity}
                  rx={2}
                  strokeDasharray={p.isProjected ? "3 2" : undefined}
                  stroke={p.isProjected ? "currentColor" : undefined}
                  strokeWidth={p.isProjected ? 1 : 0}
                />
                <text
                  x={slotX + SLOT_WIDTH / 2}
                  y={CHART_HEIGHT - BAR_AREA_BOTTOM + 18}
                  textAnchor="middle"
                  className={
                    p.isProjected
                      ? "fill-[var(--brand-gold,#C9A84C)] text-[10px] font-medium"
                      : "fill-muted-foreground text-[10px]"
                  }
                >
                  {p.label}
                  {p.isProjected ? "*" : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{formatCurrencyCompact(minValue)}</span>
        <span>{formatCurrencyCompact(maxValue)}</span>
      </div>

      {hasProjection ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          * meses projetados por tendência estatística (regressão linear)
          sobre os últimos meses realizados — não é uma garantia de
          resultado. Margem projetada:{" "}
          {points
            .filter((p) => p.isProjected)
            .map((p) =>
              p.margemPct != null ? formatPercent(p.margemPct) : "—",
            )
            .join(" · ")}
        </p>
      ) : null}
    </SectionCard>
  );
}
