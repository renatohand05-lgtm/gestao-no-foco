/**
 * Motor puro de progresso do onboarding (Sprint 13.12).
 * Sem I/O · sem inventar conclusão de checklist.
 */

import { ONBOARDING_STEPS, orderedStepIds } from "@/lib/onboarding/onboarding-steps";
import type {
  OnboardingChecklistResult,
  OnboardingProgressRecord,
  OnboardingStepId,
} from "@/lib/onboarding/onboarding-types";

export function computeNextStep(input: {
  current: OnboardingStepId;
  skipped: OnboardingStepId[];
  checklist: OnboardingChecklistResult;
}): OnboardingStepId {
  const order = orderedStepIds();
  const startIdx = Math.max(0, order.indexOf(input.current));

  for (let i = startIdx; i < order.length; i++) {
    const id = order[i]!;
    if (input.skipped.includes(id)) continue;
    const def = ONBOARDING_STEPS.find((s) => s.id === id);
    if (!def) continue;

    if (def.dataBacked && def.checklistId) {
      const item = input.checklist.items.find((x) => x.id === def.checklistId);
      if (item?.completed) continue;
      return id;
    }

    if (id === "dashboard") return id;
    if (id === "review" && input.checklist.progressPct >= 40) continue;
    return id;
  }

  return "dashboard";
}

export function buildProgressMessage(
  checklist: OnboardingChecklistResult,
): string {
  if (checklist.dashboardReady) {
    return "Configuração suficiente para usar o Dashboard. Você pode continuar refinando quando quiser.";
  }
  if (checklist.nextItem) {
    return `Falta pouco para ativar seu Dashboard. Próximo passo: ${checklist.nextItem.title}.`;
  }
  return "Continue o checklist para liberar indicadores reais.";
}

export function isOnboardingComplete(
  progress: OnboardingProgressRecord | null,
  checklist: OnboardingChecklistResult,
): boolean {
  if (progress?.completedAt) return true;
  return checklist.dashboardReady;
}

export function estimatedMinutesRemaining(
  checklist: OnboardingChecklistResult,
): number {
  return checklist.items
    .filter((i) => !i.completed)
    .reduce((sum, item) => {
      const step = ONBOARDING_STEPS.find((s) => s.checklistId === item.id);
      return sum + (step?.estimatedMinutes ?? 2);
    }, 0);
}
