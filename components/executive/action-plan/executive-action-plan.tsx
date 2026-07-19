"use client";

import { useMemo, useState } from "react";

import { ExecutiveSection } from "@/components/executive";
import { ExecutiveSectionState } from "@/components/dashboard/executive/executive-section-state";
import { ActionPlanCard } from "@/components/executive/action-plan/action-plan-card";
import { exAnimations, exGlass, exStack, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ActionPlanResult } from "@/lib/action-plan";

type Props = {
  data: ActionPlanResult;
};

/**
 * Plano executivo automático (Sprint 11.7 / 13.8 empty state).
 * Conclusão só em estado local — sem persistência.
 */
export function ExecutiveActionPlan({ data }: Props) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());

  const progress = useMemo(() => {
    if (data.tasks.length === 0) return 0;
    return Math.round((completedIds.size / data.tasks.length) * 100);
  }, [completedIds, data.tasks.length]);

  if (data.tasks.length === 0) {
    return (
      <ExecutiveSection
        title="Plano executivo"
        description="Ações automáticas compostas dos motores já carregados — sem IA externa e sem gravação."
        panel
      >
        <ExecutiveSectionState
          variant="empty"
          title="Nenhuma tarefa no plano"
          description="Quando Action Center e inteligência gerarem prioridades, o plano aparece aqui."
        />
      </ExecutiveSection>
    );
  }

  return (
    <ExecutiveSection
      title="Plano executivo"
      description="Ações automáticas compostas dos motores já carregados — sem IA externa e sem gravação."
      panel
    >
      <div className={exStack[16]}>
        <div className={cn("rounded-2xl p-4", exGlass.soft)}>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className={exTypography.label}>Progresso do plano</p>
              <p className={cn("mt-1", exTypography.caption)}>{data.summary}</p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{progress}%</p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do plano executivo"
          >
            <div
              className={cn(
                "h-full rounded-full bg-blue-600",
                exAnimations.progress,
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={cn("mt-2", exTypography.caption)}>
            {completedIds.size} de {data.tasks.length} concluída(s) nesta sessão
          </p>
        </div>

        <ul className="space-y-3">
          {data.tasks.map((task, index) => (
            <li key={task.id}>
              <ActionPlanCard
                task={task}
                index={index}
                completed={completedIds.has(task.id)}
                onComplete={() =>
                  setCompletedIds((prev) => {
                    const next = new Set(prev);
                    next.add(task.id);
                    return next;
                  })
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </ExecutiveSection>
  );
}
