/**
 * Sprint 21.4 — Políticas e helpers de alçada.
 */

export {
  createAmountBracket,
  createApprovalPolicy,
  resolveAmountBracket,
} from "./approval-level.ts";

import type { ApprovalDefinition, ApprovalLevel } from "./types.ts";
import { resolveAmountBracket, sortLevelsByOrder } from "./approval-level.ts";

/**
 * Seleciona níveis iniciais com base na política de alçada + defaults.
 */
export function resolveInitialLevels(
  definition: ApprovalDefinition,
  amount: number | null | undefined,
): ApprovalLevel[] {
  const levels = sortLevelsByOrder(definition.levels);
  const policy = definition.policy;

  if (policy?.brackets?.length) {
    const bracket = resolveAmountBracket(policy.brackets, amount);
    if (bracket?.levelIds?.length) {
      const selected = levels.filter((l) => bracket.levelIds!.includes(l.id));
      if (selected.length > 0) return selected;
    }
  }

  if (policy?.defaultLevelIds?.length) {
    const selected = levels.filter((l) =>
      policy.defaultLevelIds!.includes(l.id),
    );
    if (selected.length > 0) return selected;
  }

  // sequential/single: primeiro nível; parallel/mixed: todos do mesmo order mínimo
  if (levels.length === 0) return [];
  const firstOrder = levels[0].order;
  const firstMode = levels[0].mode;

  if (firstMode === "parallel" || firstMode === "mixed" || firstMode === "group") {
    return levels.filter((l) => l.order === firstOrder);
  }

  return [levels[0]];
}

export function nextSequentialLevels(
  definition: ApprovalDefinition,
  completedLevelId: string,
): ApprovalLevel[] {
  const levels = sortLevelsByOrder(definition.levels);
  const idx = levels.findIndex((l) => l.id === completedLevelId);
  if (idx < 0 || idx >= levels.length - 1) return [];
  const next = levels[idx + 1];
  if (next.mode === "parallel" || next.mode === "group") {
    return levels.filter((l) => l.order === next.order);
  }
  return [next];
}
