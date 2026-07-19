import Link from "next/link";
import { Check, Circle } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import {
  dsElevation,
  dsIconSize,
  dsMotion,
  dsPadding,
  dsRadius,
  dsSpace,
  dsStatus,
  dsType,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ChecklistResult } from "@/types/intelligence";

type Props = {
  checklist: ChecklistResult;
};

function overallStatus(progressPct: number) {
  if (progressPct >= 90) return { label: "Quase completo", tone: dsStatus.success };
  if (progressPct >= 60) return { label: "Em andamento", tone: dsStatus.info };
  if (progressPct >= 30) return { label: "Iniciando", tone: dsStatus.warning };
  return { label: "Pendente", tone: dsStatus.danger };
}

export function DashboardChecklist({ checklist }: Props) {
  const status = overallStatus(checklist.progressPct);

  return (
    <DashboardSection
      title="Checklist de implantação"
      description={`${checklist.completedCount}/${checklist.totalCount} concluídos`}
      className={dsMotion.fadeUp}
    >
      <div className={cn("mb-4", dsSpace.stackMd)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {checklist.progressPct}%
            </span>
            <span className={dsType.legend}>progresso</span>
          </div>
          <span
            className={cn(
              "px-2.5 py-1",
              dsRadius.badge,
              dsType.badge,
              status.tone.soft,
            )}
          >
            {status.label}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400",
              dsMotion.progress,
            )}
            style={{ width: `${checklist.progressPct}%` }}
          />
        </div>
        <p className={dsType.caption}>
          Contador: {checklist.completedCount} de {checklist.totalCount} itens
        </p>
      </div>

      <ul className={dsSpace.stackMd}>
        {checklist.items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={cn(
                "flex items-start gap-3",
                dsElevation.cardMuted,
                dsRadius.md,
                dsPadding.cardXs,
                dsMotion.hover,
                "hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 items-center justify-center rounded-full border transition-all duration-300",
                  item.completed
                    ? "scale-100 border-emerald-500/40 bg-emerald-500/15"
                    : "border-border/60 bg-background",
                )}
              >
                {item.completed ? (
                  <Check
                    className={cn(
                      dsIconSize.sm,
                      dsStatus.success.solid,
                      "animate-in zoom-in-50 duration-300",
                    )}
                  />
                ) : (
                  <Circle className={cn(dsIconSize.sm, dsStatus.neutral.solid)} />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    item.completed && "text-muted-foreground line-through",
                  )}
                >
                  {item.title}
                </span>
                <span className={cn("block", dsType.legend)}>
                  {item.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
