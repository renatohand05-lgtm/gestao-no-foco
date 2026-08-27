import { SectionCard } from "@/components/ui/section-card";
import { formatPercent } from "@/lib/financeiro/format";
import type { DreVerticalLine } from "@/lib/dre/dre-insights-service";

type Props = {
  lines: DreVerticalLine[];
  periodoLabel: string;
};

export function DreVerticalAnalysis({ lines, periodoLabel }: Props) {
  return (
    <SectionCard
      title="Análise Vertical"
      description={`Cada linha como % da receita líquida — ${periodoLabel}.`}
    >
      <div className="space-y-3">
        {lines.map((line) => {
          const pct = line.pct ?? 0;
          const width = Math.min(100, Math.max(0, Math.abs(pct)));
          const isNegative = pct < 0;

          return (
            <div key={line.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-foreground/85">{line.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {line.pct != null ? formatPercent(line.pct) : "—"}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    isNegative
                      ? "h-full rounded-full bg-rose-500"
                      : "h-full rounded-full bg-[var(--brand-gold,#C9A84C)]"
                  }
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
