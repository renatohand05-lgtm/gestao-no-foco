import Link from "next/link";

import {
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { formatCurrency } from "@/lib/dashboard/format";
import { exAnimations, exRadius, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import {
  HEATMAP_LABEL,
  type CommercialPanelData,
  type HeatmapBand,
} from "@/types/commercial-panel";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
};

function bandClass(band: HeatmapBand): string {
  switch (band) {
    case "muito_acima":
      return "bg-emerald-700 text-white ring-1 ring-emerald-800/20";
    case "acima":
      return "bg-emerald-500/90 text-white";
    case "no_ritmo":
      return "bg-blue-600/85 text-white";
    case "abaixo":
      return "bg-orange-500/90 text-white";
    case "muito_abaixo":
      return "bg-red-600/90 text-white";
    case "zero":
      return "bg-muted text-muted-foreground";
    case "futuro":
      return "bg-violet-400/35 text-muted-foreground";
    case "fim_semana":
      return "bg-muted/40 text-muted-foreground/80 ring-1 ring-dashed ring-border/60";
    case "sem_meta":
      return "bg-border/40 text-muted-foreground";
    default:
      return "bg-border/40 text-muted-foreground";
  }
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const LEGEND_BANDS: HeatmapBand[] = [
  "zero",
  "muito_abaixo",
  "abaixo",
  "no_ritmo",
  "acima",
  "muito_acima",
  "fim_semana",
  "futuro",
];

export function ComercialHeatmap({ tenantSlug, data }: Props) {
  const first = data.daily[0];
  if (!first) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const startDow = new Date(`${first.data}T12:00:00`).getDay();
  const offset = startDow === 0 ? 6 : startDow - 1;

  const cells: Array<
    | { type: "empty"; key: string }
    | { type: "day"; key: string; point: (typeof data.daily)[number] }
  > = [];

  for (let i = 0; i < offset; i++) {
    cells.push({ type: "empty", key: `pad-${i}` });
  }
  for (const point of data.daily) {
    cells.push({ type: "day", key: point.data, point });
  }

  return (
    <ExecutiveSection
      title="Heatmap do mês"
      description="Cores pelo desvio vs meta diária — clique no dia para abrir vendas."
    >
      <ExecutiveCard padding={20} className={exAnimations.fade}>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </div>
          ))}
          {cells.map((cell) => {
            if (cell.type === "empty") {
              return <div key={cell.key} className="aspect-square" />;
            }
            const d = cell.point;
            const isToday = d.data === todayIso;
            return (
              <Link
                key={cell.key}
                href={`/${tenantSlug}/vendas?dataDe=${d.data}&dataAte=${d.data}&status=faturado`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center text-[10px] tabular-nums motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:scale-105",
                  exRadius[12],
                  exAnimations.focusRing,
                  bandClass(d.heatmap_band),
                  isToday && "ring-2 ring-blue-600 ring-offset-2 ring-offset-background",
                )}
                title={`${d.data}: ${HEATMAP_LABEL[d.heatmap_band]} · ${formatCurrency(d.realizado)}${isToday ? " · Hoje" : ""}`}
                aria-label={`${d.data}, ${HEATMAP_LABEL[d.heatmap_band]}, realizado ${formatCurrency(d.realizado)}`}
              >
                <span className="font-semibold">{d.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
          {LEGEND_BANDS.map((band) => (
            <span
              key={band}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span
                className={cn("size-2.5 shrink-0 rounded-sm", bandClass(band))}
                aria-hidden
              />
              {HEATMAP_LABEL[band]}
            </span>
          ))}
        </div>
        <p className={cn("mt-2", exTypography.caption)}>
          Anel azul = dia atual · tracejado = fim de semana
        </p>
      </ExecutiveCard>
    </ExecutiveSection>
  );
}
