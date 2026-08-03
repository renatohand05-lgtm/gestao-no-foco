/**
 * Sprint 30.7 — Prevenção de loop / recursão / ciclos entre regras.
 */

import type { AutomationExecution, AutomationRule } from "./types.ts";

export type LoopCheckInput = {
  rule: AutomationRule;
  correlationId: string;
  /** Cadeia de ruleIds já acionados neste correlation. */
  ruleChain: string[];
  recentExecutions: AutomationExecution[];
  nowMs?: number;
  tenantExecutionCountInWindow: number;
  tenantLimitPerWindow?: number;
};

export type LoopCheckResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "SELF_TRIGGER"
        | "CYCLE"
        | "COOLDOWN"
        | "MAX_EXECUTIONS"
        | "TENANT_LIMIT"
        | "RECURSION";
      message: string;
      shouldPauseRule: boolean;
    };

const DEFAULT_TENANT_LIMIT = 200;

export function checkLoopPrevention(input: LoopCheckInput): LoopCheckResult {
  const now = input.nowMs ?? Date.now();
  const { rule } = input;

  if (input.ruleChain.includes(rule.id)) {
    return {
      ok: false,
      code: "SELF_TRIGGER",
      message: "Regra já presente na cadeia de correlação (auto-acionamento).",
      shouldPauseRule: true,
    };
  }

  if (input.ruleChain.length >= 5) {
    return {
      ok: false,
      code: "RECURSION",
      message: "Profundidade de cadeia excedida (prevenção de recursão).",
      shouldPauseRule: true,
    };
  }

  // Ciclo A→B→A
  const unique = new Set(input.ruleChain);
  if (unique.size < input.ruleChain.length) {
    return {
      ok: false,
      code: "CYCLE",
      message: "Ciclo detectado entre regras.",
      shouldPauseRule: true,
    };
  }

  const last = input.recentExecutions
    .filter((e) => e.ruleId === rule.id && !e.dryRun)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (last && rule.cooldownSeconds > 0) {
    const elapsed = now - Date.parse(last.createdAt);
    if (Number.isFinite(elapsed) && elapsed < rule.cooldownSeconds * 1000) {
      return {
        ok: false,
        code: "COOLDOWN",
        message: `Cooldown ativo (${rule.cooldownSeconds}s).`,
        shouldPauseRule: false,
      };
    }
  }

  if (rule.maxExecutions != null) {
    const count = input.recentExecutions.filter(
      (e) => e.ruleId === rule.id && !e.dryRun && e.status === "completed",
    ).length;
    if (count >= rule.maxExecutions) {
      return {
        ok: false,
        code: "MAX_EXECUTIONS",
        message: "Limite de execuções da regra atingido.",
        shouldPauseRule: true,
      };
    }
  }

  const tenantLimit = input.tenantLimitPerWindow ?? DEFAULT_TENANT_LIMIT;
  if (input.tenantExecutionCountInWindow >= tenantLimit) {
    return {
      ok: false,
      code: "TENANT_LIMIT",
      message: "Limite de execuções do tenant no período atingido.",
      shouldPauseRule: false,
    };
  }

  return { ok: true };
}

/** Detecta se ação pausar_regra / criar_alerta poderia realimentar a mesma regra. */
export function detectPotentialSelfLoop(
  rule: AutomationRule,
  targetRuleId: string | null | undefined,
): boolean {
  return Boolean(targetRuleId && targetRuleId === rule.id);
}
