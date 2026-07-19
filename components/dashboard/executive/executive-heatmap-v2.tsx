import Link from "next/link";

import {
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import {
  exAnimations,
  exMotion,
  exRadius,
  exTypography,
} from "@/lib/design-system";
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
      return "bg-emerald-700 text-white shadow-sm";
    case "acima":
      return "bg-emerald-500 text-white";
    case "no_ritmo":
      return "bg-blue-600 text-white";
    case "abaixo":
      return "bg-orange-500 text-white";
    case "muito_abaixo":
      return "bg-red-600 text-white";
    case "zero":
      return "bg-muted text-muted-foreground";
    case "futuro":
      return "bg-violet-400/40 text-muted-foreground";
    case "fim_semana":
      return "bg-muted/50 text-muted-foreground ring-1 ring-dashed ring-border";
    case "sem_meta":
      return "bg-border/50 text-muted-foreground";
    default:
      return "bg-border/40 text-muted-foreground";
  }
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const LEGEND: HeatmapBand[] = [
  "zero",
  "muito_abaixo",
  "abaixo",
  "no_ritmo",
  "acima",
  "muito_acima",
  "fim_semana",
  "futuro",
];

export function ExecutiveHeatmapV2({ tenantSlug, data }: Props) {
  const first = data.daily[0];
  if (!first) {
    return (
      <ExecutiveSection
        title="Heatmap inteligente"
        description="Padrão do mês por desvio vs meta diária."
      >
        <ExecutiveSectionState
          variant="empty"
          title="Heatmap indisponível"
          description="Sem dias para montar o calendário."
        />
      </ExecutiveSection>
    );
  }

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
      title="Mapa de problemas"
      description="Onde o mês saiu do ritmo — clique no dia para agir."
      panel
    >
      <ExecutiveCard padding={24} className={exAnimations.fade}>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {WEEKDAYS.map((label) => (
            <div
              key={label}
              className={cn("text-center uppercase", exTypography.label)}
            >
              {label}
            </div>
          ))}
          {cells.map((cell) => {
            if (cell.type === "empty") {
              return <div key={cell.key} className="aspect-square min-h-11" />;
            }
            const d = cell.point;
            const isToday = d.data === todayIso;
            const pctLabel =
              d.diferenca_pct === null
                ? "—"
                : formatPercent(d.diferenca_pct);
            const tip = `${d.data}: ${HEATMAP_LABEL[d.heatmap_band]} · ${formatCurrency(d.realizado)} · ${pctLabel} vs meta${isToday ? " · Hoje" : ""}`;
            return (
              <Link
                key={cell.key}
                href={`/${tenantSlug}/vendas?dataDe=${d.data}&dataAte=${d.data}&status=faturado`}
                title={tip}
                aria-label={tip}
                className={cn(
                  "flex min-h-11 aspect-square flex-col items-center justify-center gap-0.5 text-xs tabular-nums shadow-sm",
                  exMotion.transition,
                  exAnimations.hoverScale,
                  exAnimations.hoverGlow,
                  "motion-safe:hover:z-10",
                  exRadius[16],
                  exAnimations.focusRing,
                  bandClass(d.heatmap_band),
                  isToday &&
                    "z-10 scale-[1.02] ring-2 ring-blue-600 ring-offset-2 ring-offset-background",
                )}
              >
                <span className="font-semibold">{d.label}</span>
                <span className={cn("hidden opacity-90 sm:inline", exTypography.caption)}>
                  {d.realizado > 0
                    ? formatCurrency(d.realizado).replace(/\s/g, "\u00a0").slice(0, 8)
                    : "—"}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {LEGEND.map((band) => (
            <span
              key={band}
              className={cn(
                "inline-flex items-center gap-1.5",
                exTypography.caption,
              )}
            >
              <span
                className={cn("size-3 shrink-0 rounded-md", bandClass(band))}
                aria-hidden
              />
              {HEATMAP_LABEL[band]}
            </span>
          ))}
        </div>
        <p className={cn("mt-3", exTypography.caption)}>
          Anel azul = dia atual · tracejado = fim de semana
        </p>
      </ExecutiveCard>
    </ExecutiveSection>
  );
}

export function ExecutiveHeatmapV2Skeleton() {
  return (
    <div
      className={cn(
        "h-80 bg-muted/40",
        exRadius[20],
        exAnimations.shimmer,
      )}
      aria-busy="true"
      aria-label="Carregando heatmap"
    />
  );
}
