"use client";

import {
  Briefcase,
  CheckCircle2,
  Circle,
  Clock3,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { ExecutiveBadge } from "@/components/executive";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  exAnimations,
  exGlass,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type {
  ActionPlanCategory,
  ActionPlanPriority,
  ActionTask,
} from "@/lib/action-plan";

type Props = {
  task: ActionTask;
  completed: boolean;
  onComplete: () => void;
  index: number;
};

const PRIORITY_TONE: Record<
  ActionPlanPriority,
  "danger" | "warning" | "info" | "success"
> = {
  Critica: "danger",
  Alta: "warning",
  Media: "info",
  Baixa: "success",
};

const PRIORITY_LABEL: Record<ActionPlanPriority, string> = {
  Critica: "Crítica",
  Alta: "Alta",
  Media: "Média",
  Baixa: "Baixa",
};

const CATEGORY_ICON: Record<ActionPlanCategory, LucideIcon> = {
  Venda: TrendingUp,
  Ticket: Target,
  CMV: Wrench,
  Folha: Users,
  Financeiro: Wallet,
  Operacao: Briefcase,
  Cliente: Users,
  Performance: Target,
};

const CATEGORY_LABEL: Record<ActionPlanCategory, string> = {
  Venda: "Venda",
  Ticket: "Ticket",
  CMV: "CMV",
  Folha: "Folha",
  Financeiro: "Financeiro",
  Operacao: "Operação",
  Cliente: "Cliente",
  Performance: "Performance",
};

/**
 * Item de checklist do plano (Sprint 11.7).
 */
export function ActionTaskItem({
  task,
  completed,
  onComplete,
  index,
}: Props) {
  const tone = PRIORITY_TONE[task.priority];
  const Icon = CATEGORY_ICON[task.category];

  return (
    <article
      className={cn(
        "rounded-2xl border-l-[3px] p-4 sm:p-5",
        tone === "danger" && "border-l-red-600",
        tone === "warning" && "border-l-orange-600",
        tone === "info" && "border-l-violet-600",
        tone === "success" && "border-l-emerald-600",
        exGlass.panel,
        exAnimations.slide,
        exAnimations.hoverLift,
        "motion-reduce:hover:translate-y-0",
        completed && "opacity-70",
      )}
      style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
      aria-label={`${PRIORITY_LABEL[task.priority]} — ${task.title}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            exGlass.badge,
            tone === "danger" && "text-red-700 dark:text-red-400",
            tone === "warning" && "text-orange-700 dark:text-orange-400",
            tone === "info" && "text-violet-700 dark:text-violet-400",
            tone === "success" && "text-emerald-700 dark:text-emerald-400",
          )}
          aria-hidden
        >
          <DsIcon icon={completed ? CheckCircle2 : Icon} size="md" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ExecutiveBadge tone={tone}>
              {PRIORITY_LABEL[task.priority]}
            </ExecutiveBadge>
            <ExecutiveBadge
              tone="info"
              className="font-normal normal-case tracking-normal"
            >
              {CATEGORY_LABEL[task.category]}
            </ExecutiveBadge>
            <ExecutiveBadge
              tone="info"
              className="font-normal normal-case tracking-normal"
            >
              Dificuldade {task.dificuldade}
            </ExecutiveBadge>
            {completed ? (
              <ExecutiveBadge tone="success">Concluída</ExecutiveBadge>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <DsIcon icon={Circle} size="xs" />
                Pendente
              </span>
            )}
          </div>

          <h3
            className={cn(
              "mt-2 text-sm font-semibold tracking-tight sm:text-base",
              completed && "line-through decoration-muted-foreground/60",
            )}
          >
            {task.title}
          </h3>

          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className={cn("rounded-xl p-2.5", exGlass.soft)}>
              <dt className={exTypography.label}>Por quê</dt>
              <dd className={cn("mt-1", exTypography.caption)}>{task.motivo}</dd>
            </div>
            <div className={cn("rounded-xl p-2.5", exGlass.soft)}>
              <dt className={exTypography.label}>Impacto esperado</dt>
              <dd className={cn("mt-1", exTypography.caption)}>
                {task.impactoEsperado}
              </dd>
            </div>
          </dl>

          <div
            className={cn(
              "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1",
              exTypography.caption,
            )}
          >
            <span className="inline-flex items-center gap-1">
              <DsIcon icon={Clock3} size="xs" />
              {task.prazo}
            </span>
            <span aria-hidden>·</span>
            <span>Responsável: {task.responsavelSugerido}</span>
          </div>

          {!completed ? (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className={cn("rounded-xl", exAnimations.focusRing)}
                onClick={onComplete}
              >
                <DsIcon icon={CheckCircle2} size="sm" className="mr-1.5" />
                Marcar como concluída
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
