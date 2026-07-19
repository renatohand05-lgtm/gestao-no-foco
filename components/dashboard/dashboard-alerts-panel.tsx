import Link from "next/link";

import { DashboardPriorityIcon } from "@/components/dashboard/dashboard-health-score";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { buttonVariants } from "@/components/ui/button";
import {
  dsElevation,
  dsMotion,
  dsPadding,
  dsRadius,
  dsSpace,
  dsStatus,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { IntelligenceAlert, PriorityItem } from "@/types/intelligence";

const PRIORITY_LABEL: Record<PriorityItem["priority"], string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  info: "Info",
};

const PRIORITY_TONE: Record<PriorityItem["priority"], string> = {
  critical: dsStatus.danger.soft,
  high: dsStatus.danger.soft,
  medium: dsStatus.warning.soft,
  low: dsStatus.neutral.soft,
  info: dsStatus.success.soft,
};

const CATEGORY_FROM_SOURCE: Record<PriorityItem["source"], string> = {
  alert: "Operacional",
  checklist: "Implantação",
};

type PrioritiesProps = {
  items: PriorityItem[];
};

export function DashboardPriorities({ items }: PrioritiesProps) {
  if (items.length === 0) {
    return (
      <DashboardSection
        title="Central de prioridades"
        description="Problemas mais importantes ordenados automaticamente"
      >
        <DashboardEmptyState
          className="border-0 bg-transparent py-8"
          title="Nenhuma prioridade crítica"
          description="Não há alertas graves nem pendências urgentes no momento."
        />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Central de prioridades"
      description="Timeline dos problemas mais importantes"
      className={dsMotion.fadeUp}
    >
      <ol className={cn("relative", dsSpace.stackLg)}>
        <div className="absolute bottom-2 left-[19px] top-2 w-px bg-border/70" aria-hidden />
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "relative flex flex-col gap-3 pl-12 sm:flex-row sm:items-center sm:justify-between",
              dsElevation.cardMuted,
              dsRadius.lg,
              dsPadding.cardSm,
              dsMotion.hover,
              "hover:bg-muted/35",
            )}
          >
            <span
              className={cn(
                "absolute left-2 top-4 flex size-8 items-center justify-center rounded-full border border-border/60 bg-background text-xs font-semibold tabular-nums shadow-sm",
              )}
            >
              {item.rank}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DashboardPriorityIcon priority={item.priority} />
                <p className="font-medium">{item.title}</p>
                <span
                  className={cn(
                    "px-2 py-0.5",
                    dsRadius.badge,
                    dsType.caption,
                    PRIORITY_TONE[item.priority],
                  )}
                >
                  {PRIORITY_LABEL[item.priority]}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5",
                    dsRadius.badge,
                    dsType.caption,
                    dsStatus.neutral.soft,
                  )}
                >
                  {CATEGORY_FROM_SOURCE[item.source]}
                </span>
              </div>
              <p className={dsType.description}>{item.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  Criticidade:{" "}
                  <strong className="font-medium text-foreground">
                    {PRIORITY_LABEL[item.priority]}
                  </strong>
                </span>
                <span>
                  Impacto:{" "}
                  <strong className="font-medium text-foreground">
                    {item.source === "alert" ? "Atenção imediata" : "Configuração"}
                  </strong>
                </span>
                <span>
                  Ação:{" "}
                  <strong className="font-medium text-foreground">Revisar módulo</strong>
                </span>
                <span>Tempo: agora</span>
              </div>
            </div>
            <Link
              href={item.href}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0",
              )}
            >
              Resolver
            </Link>
          </li>
        ))}
      </ol>
    </DashboardSection>
  );
}

type AlertsProps = {
  alerts: IntelligenceAlert[];
};

export function DashboardAlertsPanel({ alerts }: AlertsProps) {
  if (alerts.length === 0) {
    return (
      <DashboardSection
        title="Alertas inteligentes"
        description="Sinais gerados a partir dos dados reais do tenant"
      >
        <DashboardEmptyState
          className="border-0 bg-transparent py-8"
          title="Nenhum alerta no momento"
          description="Os indicadores estão dentro dos limiares padrão."
        />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection
      title="Alertas inteligentes"
      description="Sinais gerados a partir dos dados reais do tenant"
      className={dsMotion.fadeUp}
    >
      <div className={dsSpace.stackLg}>
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={cn(
              dsElevation.card,
              dsRadius.lg,
              dsPadding.cardSm,
              dsMotion.hover,
              "hover:shadow-md",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <DashboardPriorityIcon priority={alert.priority} />
              <h4 className="font-medium">{alert.title}</h4>
              <span
                className={cn(
                  "px-2 py-0.5 capitalize",
                  dsRadius.badge,
                  dsType.caption,
                  dsStatus.neutral.soft,
                )}
              >
                {alert.category}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5",
                  dsRadius.badge,
                  dsType.caption,
                  PRIORITY_TONE[alert.priority],
                )}
              >
                {PRIORITY_LABEL[alert.priority]}
              </span>
            </div>
            <p className={cn("mt-2", dsType.description)}>{alert.description}</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Recomendação: </span>
              {alert.recommendation}
            </p>
            <Link
              href={alert.href}
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "mt-1 h-auto px-0",
              )}
            >
              Ir para o módulo
            </Link>
          </article>
        ))}
      </div>
    </DashboardSection>
  );
}
