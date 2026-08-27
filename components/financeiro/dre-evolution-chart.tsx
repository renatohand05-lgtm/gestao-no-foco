import { SectionCard } from "@/components/ui/section-card";
import { formatPercent } from "@/lib/financeiro/format";
import { formatCurrencyCompact } from "@/lib/format";
import type { DreEvolutionPoint } from "@/lib/dre/dre-insights-service";

type Props = {
  points: DreEvolutionPoint[];
};

const CHART_HEIGHT = 200;
const BAR_AREA_TOP = 20;
const BAR_AREA_BOTTOM = 40;
const BAR_AREA_HEIGHT = CHART_HEIGHT - BAR_AREA_TOP - BAR_AREA_BOTTOM;
const SLOT_WIDTH = 90;

export function DreEvolutionChart({ points }: Props) {
  const hasData = points.some(
    (p) => p.receitaLiquida !== 0 || p.lucroLiquido !== 0,
  );

  if (!hasData) {
    return (
      <SectionCard
        title="Evolução do DRE (últimos 6 meses)"
        description="Receita líquida, lucro líquido e margem, mês a mês."
      >
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem dados suficientes nos últimos 6 meses.
        </p>
      </SectionCard>
    );
  }

  const allValues = points.flatMap((p) => [p.receitaLiquida, p.lucroLiquido]);
  const maxValue = Math.max(0, ...allValues);
  const minValue = Math.min(0, ...allValues);
  const range = maxValue - minValue || 1;
  const zeroY = BAR_AREA_TOP + (maxValue / range) * BAR_AREA_HEIGHT;

  function valueToY(value: number) {
    return BAR_AREA_TOP + ((maxValue - value) / range) * BAR_AREA_HEIGHT;
  }

  const margens = points.map((p) => p.margemPct ?? 0);
  const maxMargem = Math.max(1, ...margens);
  const minMargem = Math.min(0, ...margens);
  const margemRange = maxMargem - minMargem || 1;

  function margemToY(margem: number) {
    return (
      BAR_AREA_TOP +
      ((maxMargem - margem) / margemRange) * BAR_AREA_HEIGHT
    );
  }

  const width = points.length * SLOT_WIDTH;
  const linePoints = points
    .map((p, i) => {
      const x = i * SLOT_WIDTH + SLOT_WIDTH / 2;
      const y = margemToY(p.margemPct ?? 0);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <SectionCard
      title="Evolução do DRE (últimos 6 meses)"
      description="Receita líquida, lucro líquido e margem, mês a mês."
    >
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--brand-silver,#8B93A0)]" />
          Receita Líquida
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          Lucro Líquido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-[var(--brand-gold,#C9A84C)]" />
          Margem %
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          className="h-52 w-full"
          style={{ minWidth: width }}
          role="img"
          aria-label="Evolução do DRE nos últimos 6 meses"
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

          {points.map((p, i) => {
            const slotX = i * SLOT_WIDTH;
            const barWidth = 16;
            const receitaX = slotX + SLOT_WIDTH / 2 - barWidth - 4;
            const lucroX = slotX + SLOT_WIDTH / 2 + 4;
            const receitaY = valueToY(p.receitaLiquida);
            const lucroY = valueToY(p.lucroLiquido);

            return (
              <g key={p.label}>
                <rect
                  x={receitaX}
                  y={Math.min(receitaY, zeroY)}
                  width={barWidth}
                  height={Math.abs(receitaY - zeroY)}
                  className="fill-[var(--brand-silver,#8B93A0)] opacity-70"
                  rx={2}
                />
                <rect
                  x={lucroX}
                  y={Math.min(lucroY, zeroY)}
                  width={barWidth}
                  height={Math.abs(lucroY - zeroY)}
                  fill="currentColor"
                  className="text-emerald-500"
                  rx={2}
                />
                <text
                  x={slotX + SLOT_WIDTH / 2}
                  y={CHART_HEIGHT - BAR_AREA_BOTTOM + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--brand-gold, #C9A84C)"
            strokeWidth="2"
          />
          {points.map((p, i) => {
            const x = i * SLOT_WIDTH + SLOT_WIDTH / 2;
            const y = margemToY(p.margemPct ?? 0);
            return (
              <g key={`${p.label}-margem`}>
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  fill="var(--brand-gold, #C9A84C)"
                />
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  className="fill-[var(--brand-gold,#C9A84C)] text-[10px] font-medium"
                >
                  {p.margemPct != null ? formatPercent(p.margemPct) : "—"}
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
    </SectionCard>
  );
}
