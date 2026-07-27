/**
 * Sprint 21.4 — Níveis e alçadas de aprovação.
 */

import type {
  ApprovalAmountBracket,
  ApprovalLevel,
  ApprovalLevelMode,
  ApprovalPolicy,
} from "./types.ts";

export const APPROVAL_LEVEL_MODES = [
  "single",
  "sequential",
  "parallel",
  "mixed",
  "group",
] as const satisfies readonly ApprovalLevelMode[];

export function isKnownLevelMode(value: string): value is ApprovalLevelMode {
  return (APPROVAL_LEVEL_MODES as readonly string[]).includes(value);
}

export function createApprovalLevel(input: {
  id: string;
  name: string;
  description?: string;
  order?: number;
  mode?: ApprovalLevelMode;
  quorum?: number | null;
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  roleMode?: "any" | "all";
  permissionMode?: "any" | "all";
  groupId?: string | null;
  escalateToLevelId?: string | null;
  sla?: ApprovalLevel["sla"];
  rules?: ApprovalLevel["rules"];
  metadata?: Record<string, unknown>;
}): ApprovalLevel {
  return {
    id: input.id.trim(),
    name: input.name.trim() || input.id,
    description: (input.description ?? "").trim(),
    order: input.order ?? 1,
    mode: input.mode ?? "single",
    quorum: input.quorum ?? null,
    requiredRoles: input.requiredRoles ?? [],
    requiredPermissions: input.requiredPermissions ?? [],
    roleMode: input.roleMode ?? "any",
    permissionMode: input.permissionMode ?? "all",
    groupId: input.groupId ?? null,
    escalateToLevelId: input.escalateToLevelId ?? null,
    sla: input.sla ?? null,
    rules: input.rules ?? [],
    metadata: input.metadata ?? {},
  };
}

export function sortLevelsByOrder(
  levels: readonly ApprovalLevel[],
): ApprovalLevel[] {
  return [...levels].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

export function createAmountBracket(input: {
  id: string;
  label: string;
  maxAmount: number | null;
  minAmount?: number;
  requiredRoles?: readonly string[];
  requiredPermissions?: readonly string[];
  roleMode?: "any" | "all";
  permissionMode?: "any" | "all";
  levelIds?: readonly string[];
  metadata?: Record<string, unknown>;
}): ApprovalAmountBracket {
  return {
    id: input.id.trim(),
    label: input.label.trim(),
    maxAmount: input.maxAmount,
    minAmount: input.minAmount ?? 0,
    requiredRoles: input.requiredRoles ?? [],
    requiredPermissions: input.requiredPermissions ?? [],
    roleMode: input.roleMode ?? "any",
    permissionMode: input.permissionMode ?? "all",
    levelIds: input.levelIds ?? [],
    metadata: input.metadata ?? {},
  };
}

/**
 * Resolve alçada pelo valor (faixas configuráveis).
 * Faixas ordenadas por minAmount / maxAmount.
 */
export function resolveAmountBracket(
  brackets: readonly ApprovalAmountBracket[] | null | undefined,
  amount: number | null | undefined,
): ApprovalAmountBracket | null {
  if (!brackets || brackets.length === 0) return null;
  if (amount == null || !Number.isFinite(amount)) return null;

  const sorted = [...brackets].sort((a, b) => {
    const am = a.minAmount ?? 0;
    const bm = b.minAmount ?? 0;
    if (am !== bm) return am - bm;
    const aMax = a.maxAmount ?? Number.POSITIVE_INFINITY;
    const bMax = b.maxAmount ?? Number.POSITIVE_INFINITY;
    return aMax - bMax;
  });

  for (const bracket of sorted) {
    const min = bracket.minAmount ?? 0;
    const max =
      bracket.maxAmount == null
        ? Number.POSITIVE_INFINITY
        : bracket.maxAmount;
    if (amount >= min && amount <= max) return bracket;
  }

  return null;
}

export function createApprovalPolicy(input: {
  id: string;
  name: string;
  description?: string;
  brackets?: readonly ApprovalAmountBracket[];
  defaultLevelIds?: readonly string[];
  rules?: ApprovalPolicy["rules"];
  metadata?: Record<string, unknown>;
}): ApprovalPolicy {
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    description: (input.description ?? "").trim(),
    brackets: input.brackets ?? [],
    defaultLevelIds: input.defaultLevelIds ?? [],
    rules: input.rules ?? [],
    metadata: input.metadata ?? {},
  };
}

export function requiredApprovalsForLevel(level: ApprovalLevel): number {
  if (level.mode === "single" || level.mode === "sequential") return 1;
  if (level.quorum != null && level.quorum > 0) return Math.floor(level.quorum);
  return 1;
}
