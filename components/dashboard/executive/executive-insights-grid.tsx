import type { CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";

import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveSection,
} from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exRadius,
  exSpacing,
  exStagger,
  exTypography,
} from "@/lib/design-system";
import type { ExColorTone } from "@/lib/design-system/colors";
import { cn } from "@/lib/utils";
import type {
  CommercialInsight,
  CommercialPanelData,
} from "@/types/commercial-panel";

type Props = {
  data: CommercialPanelData;
};

type PriorityVisual = {
  tone: Exclude<ExColorTone, "neutral">;
  label: string;
  category: string;
  icon: typeof AlertTriangle;
  surface: string;
};

function priorityVisual(
  sev: CommercialInsight["severidade"],
): PriorityVisual {
  switch (sev) {
    case "critico":
      return {
        tone: "danger",
        label: "Crítico",
        category: "Insight crítico",
        icon: ShieldAlert,
        surface:
          "bg-gradient-to-br from-red-50/90 to-card ring-1 ring-red-600/15 dark:from-red-950/30",
      };
    case "atencao":
      return {
        tone: "warning",
        label: "Importante",
        category: "Insight importante",
        icon: AlertTriangle,
        surface:
          "bg-gradient-to-br from-orange-50/80 to-card ring-1 ring-orange-600/15 dark:from-orange-950/25",
      };
    case "positivo":
      return {
        tone: "success",
        label: "Positivo",
        category: "Insight positivo",
        icon: CheckCircle2,
        surface:
          "bg-gradient-to-br from-emerald-50/80 to-card ring-1 ring-emerald-600/15 dark:from-emerald-950/25",
      };
    default:
      return {
        tone: "info",
        label: "Informativo",
        category: "Insight informativo",
        icon: Info,
        surface:
          "bg-gradient-to-br from-violet-50/70 to-card ring-1 ring-violet-600/15 dark:from-violet-950/25",
      };
  }
}

function sortInsights(items: CommercialInsight[]) {
  const order = { critico: 0, atencao: 1, info: 2, positivo: 3 } as const;
  return [...items].sort(
    (a, b) => order[a.severidade] - order[b.severidade],
  );
}

export function ExecutiveInsightsGrid({ data }: Props) {
  if (data.insights.length === 0) {
    return (
      <ExecutiveSection
        title="Problemas e oportunidades"
        description="Prioridades e recomendações do período."
        panel
      >
        <ExecutiveSectionState
          variant="empty"
          title="Nenhum insight no momento"
          description="Quando houver sinais de risco ou oportunidade, eles aparecem aqui com prioridade clara."
        />
      </ExecutiveSection>
    );
  }

  const items = sortInsights(data.insights).slice(0, 6);

  return (
    <ExecutiveSection
      title="Problemas e oportunidades"
      description="Crítico → importante → informativo → positivo. Ação em um clique."
      panel
    >
      <ul
        className={cn(
          "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
          exSpacing[16],
        )}
      >
        {items.map((item, index) => {
          const visual = priorityVisual(item.severidade);
          const body = (
            <ExecutiveCard
              padding={20}
              accent={visual.tone}
              className={cn(
                "h-full",
                visual.surface,
                exAnimations.slide,
                item.href && exAnimations.hoverGlow,
              )}
              style={
                {
                  animationDelay: exStagger(index),
                } as CSSProperties
              }
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
                    visual.tone === "success" &&
                      "bg-emerald-600/10 text-emerald-700",
                    visual.tone === "warning" &&
                      "bg-orange-600/10 text-orange-700",
                    visual.tone === "danger" && "bg-red-600/10 text-red-700",
                    visual.tone === "info" && "bg-violet-600/10 text-violet-700",
                  )}
                >
                  <DsIcon icon={visual.icon} size="md" />
                </span>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <ExecutiveBadge tone={visual.tone}>
                      {visual.label}
                    </ExecutiveBadge>
                    <span className={exTypography.label}>{visual.category}</span>
                  </div>
                  <p className={exTypography.sectionTitle}>
                    {item.titulo}
                  </p>
                  <p className={exTypography.caption}>{item.descricao}</p>
                  <p className={exTypography.caption}>
                    <span className="font-medium text-foreground">Impacto:</span>{" "}
                    {item.impacto}
                  </p>
                  <p className={exTypography.caption}>
                    <span className="font-medium text-foreground">Ação:</span>{" "}
                    {item.recomendacao}
                  </p>
                  {item.href ? (
                    <span className="inline-flex text-sm font-medium text-blue-600">
                      Executar →
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

export function ExecutiveInsightsGridSkeleton() {
  return (
    <div
      className={cn("grid md:grid-cols-2 xl:grid-cols-3", exSpacing[16])}
      aria-busy="true"
      aria-label="Carregando insights"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-44 bg-muted/40",
            exRadius[20],
            exAnimations.shimmer,
          )}
        />
      ))}
    </div>
  );
}
