import type { CSSProperties } from "react";
import Link from "next/link";

import { COMERCIAL_METRIC_ICONS } from "@/components/dashboard/comercial/comercial-metric-icons";
import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exSpacing, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { CommercialInsight, CommercialPanelData } from "@/types/commercial-panel";
import type { ExColorTone } from "@/lib/design-system/colors";

type Props = {
  data: CommercialPanelData;
};

function severidadeTone(
  sev: CommercialInsight["severidade"],
): Exclude<ExColorTone, "neutral"> {
  switch (sev) {
    case "positivo":
      return "success";
    case "atencao":
      return "warning";
    case "critico":
      return "danger";
    default:
      return "info";
  }
}

function severidadeLabel(sev: CommercialInsight["severidade"]) {
  switch (sev) {
    case "positivo":
      return "Positivo";
    case "atencao":
      return "Atenção";
    case "critico":
      return "Crítico";
    default:
      return "Info";
  }
}

export function ComercialInsights({ data }: Props) {
  if (data.insights.length === 0) return null;

  return (
    <ExecutiveSection
      title="Insights comerciais"
      description="Sinais determinísticos — leitura rápida de prioridade, impacto e ação."
    >
      <ul className={cn("grid gap-3 lg:grid-cols-2", exSpacing[12])}>
        {data.insights.map((item, index) => {
          const tone = severidadeTone(item.severidade);
          const body = (
            <ExecutiveCard
              padding={16}
              accent={tone}
              interactive={Boolean(item.href)}
              className={cn("h-full", exAnimations.slide)}
              style={
                {
                  animationDelay: `${Math.min(index, 5) * 50}ms`,
                } as CSSProperties
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
                    tone === "success" && "bg-emerald-600/10 text-emerald-700",
                    tone === "warning" && "bg-orange-600/10 text-orange-700",
                    tone === "danger" && "bg-red-600/10 text-red-700",
                    tone === "info" && "bg-violet-600/10 text-violet-700",
                  )}
                >
                  <DsIcon icon={COMERCIAL_METRIC_ICONS.alerta} size="sm" />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ExecutiveBadge tone={tone}>
                      {severidadeLabel(item.severidade)}
                    </ExecutiveBadge>
                  </div>
                  <p className="text-sm font-semibold tracking-tight">
                    {item.titulo}
                  </p>
                  <p className={exTypography.caption}>{item.descricao}</p>
                  <p className={exTypography.caption}>
                    <span className="font-medium text-foreground">Impacto:</span>{" "}
                    {item.impacto}
                  </p>
                  <p className={exTypography.caption}>
                    <span className="font-medium text-foreground">
                      Recomendação:
                    </span>{" "}
                    {item.recomendacao}
                  </p>
                  {item.href ? (
                    <span
                      className={cn(
                        "inline-flex text-sm font-medium text-blue-600",
                        exAnimations.hoverPress,
                      )}
                    >
                      Ver ação →
                    </span>
                  ) : null}
                </div>
              </div>
            </ExecutiveCard>
          );

          return (
            <li key={item.codigo}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={cn("block h-full", exAnimations.focusRing)}
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </ExecutiveSection>
  );
}
