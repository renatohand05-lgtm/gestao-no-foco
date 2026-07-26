/**
 * Sprint 21.3 — Avaliação determinística de condições (sem eval).
 */

import type { WorkflowCondition, WorkflowContext, WorkflowInstance } from "./types.ts";

export type ConditionEvalSource = {
  context: WorkflowContext;
  instance?: Pick<WorkflowInstance, "data"> | null;
};

function getByPath(root: unknown, path: string | undefined): unknown {
  if (!path || !path.trim()) return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function resolvePath(source: ConditionEvalSource, path: string | undefined): unknown {
  if (!path) return undefined;
  const p = path.trim();

  if (p.startsWith("variables.")) {
    return getByPath(source.context.variables, p.slice("variables.".length));
  }
  if (p.startsWith("metadata.")) {
    return getByPath(source.context.metadata, p.slice("metadata.".length));
  }
  if (p.startsWith("data.")) {
    return getByPath(source.instance?.data ?? {}, p.slice("data.".length));
  }
  if (p.startsWith("actor.")) {
    return getByPath(source.context.actor ?? {
      userId: source.context.userId,
      roles: source.context.roles,
      permissions: source.context.permissions,
    }, p.slice("actor.".length));
  }
  if (p.startsWith("target.")) {
    return getByPath(source.context.target ?? {}, p.slice("target.".length));
  }
  if (p === "tenantId") return source.context.tenantId;
  if (p === "userId") return source.context.userId;

  // fallback: variables first, then data, then metadata
  const fromVars = getByPath(source.context.variables, p);
  if (fromVars !== undefined) return fromVars;
  const fromData = getByPath(source.instance?.data ?? {}, p);
  if (fromData !== undefined) return fromData;
  return getByPath(source.context.metadata, p);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function equals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "string" || typeof b === "string") {
    return String(a) === String(b);
  }
  return false;
}

/**
 * Avalia uma condição de forma determinística.
 * Deny-safe: condição inválida/malformada ⇒ false.
 */
export function evaluateCondition(
  condition: WorkflowCondition | null | undefined,
  source: ConditionEvalSource,
): boolean {
  if (!condition || typeof condition !== "object" || !condition.op) {
    return false;
  }

  switch (condition.op) {
    case "all": {
      const list = condition.conditions ?? [];
      if (list.length === 0) return false;
      return list.every((c) => evaluateCondition(c, source));
    }
    case "any": {
      const list = condition.conditions ?? [];
      if (list.length === 0) return false;
      return list.some((c) => evaluateCondition(c, source));
    }
    case "not": {
      if (!condition.condition) return false;
      return !evaluateCondition(condition.condition, source);
    }
    case "exists": {
      const v = resolvePath(source, condition.path);
      return v !== undefined && v !== null && v !== "";
    }
    case "notExists": {
      const v = resolvePath(source, condition.path);
      return v === undefined || v === null || v === "";
    }
    case "equals":
      return equals(resolvePath(source, condition.path), condition.value);
    case "notEquals":
      return !equals(resolvePath(source, condition.path), condition.value);
    case "greaterThan": {
      const a = asNumber(resolvePath(source, condition.path));
      const b = asNumber(condition.value);
      return a != null && b != null && a > b;
    }
    case "greaterThanOrEqual": {
      const a = asNumber(resolvePath(source, condition.path));
      const b = asNumber(condition.value);
      return a != null && b != null && a >= b;
    }
    case "lessThan": {
      const a = asNumber(resolvePath(source, condition.path));
      const b = asNumber(condition.value);
      return a != null && b != null && a < b;
    }
    case "lessThanOrEqual": {
      const a = asNumber(resolvePath(source, condition.path));
      const b = asNumber(condition.value);
      return a != null && b != null && a <= b;
    }
    case "in": {
      const v = resolvePath(source, condition.path);
      const list = condition.values ?? [];
      return list.some((item) => equals(v, item));
    }
    case "notIn": {
      const v = resolvePath(source, condition.path);
      const list = condition.values ?? [];
      return !list.some((item) => equals(v, item));
    }
    case "contains": {
      const v = resolvePath(source, condition.path);
      if (typeof v === "string") {
        return v.includes(String(condition.value ?? ""));
      }
      if (Array.isArray(v)) {
        return v.some((item) => equals(item, condition.value));
      }
      return false;
    }
    default:
      return false;
  }
}

export function evaluateConditions(
  conditions: readonly WorkflowCondition[] | null | undefined,
  source: ConditionEvalSource,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, source));
}
